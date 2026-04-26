import type { OllamaService } from './ollama.js';
import type { KddReviewResult, ReviewSection, ReviewStatus } from '../types.js';

export class KddReviewService {
  constructor(private ollamaService: OllamaService) {}

  async reviewKdd(pageContent: string, title: string): Promise<KddReviewResult> {
    const truncatedContent = pageContent.substring(0, 6000);

    // Run reviews sequentially to avoid overwhelming Ollama
    console.log('Starting KDD review - Step 1/6: Completeness...');
    const completeness = await this.reviewCompleteness(truncatedContent, title);
    
    console.log('Step 2/6: Clarity...');
    const clarity = await this.reviewClarity(truncatedContent, title);
    
    console.log('Step 3/6: Outcome...');
    const outcome = await this.reviewOutcome(truncatedContent, title);
    
    console.log('Step 4/6: Stakeholder...');
    const stakeholder = await this.reviewStakeholder(truncatedContent, title);
    
    console.log('Step 5/6: Abbreviations...');
    const abbreviations = await this.reviewAbbreviations(truncatedContent, title);
    
    console.log('Step 6/6: Full Read-Through...');
    const fullRead = await this.reviewFullRead(truncatedContent, title);

    const criticalGaps = this.extractCriticalGaps([
      completeness,
      clarity,
      outcome,
      stakeholder,
      abbreviations,
      fullRead,
    ]);

    const overallRating = this.calculateOverallRating([
      completeness,
      clarity,
      outcome,
      stakeholder,
      abbreviations,
      fullRead,
    ]);

    const forumReady = this.calculateForumReadiness(criticalGaps);

    return {
      overallRating,
      forumReady,
      sections: {
        completeness,
        clarity,
        outcome,
        stakeholder,
        abbreviations,
        fullRead,
      },
      criticalGaps,
      requiredInputs: fullRead.requiredInputs || [],
      recommendations: fullRead.recommendations || [],
      forumReadinessChecklist: fullRead.forumReadinessChecklist || [],
    };
  }

  private async reviewCompleteness(content: string, title: string): Promise<ReviewSection> {
    const prompt = `You are a senior architect reviewing a Key Design Decision (KDD) document for Architecture Review Forum readiness.

Review the following KDD document for COMPLETENESS and MISSING POINTS.

Document Title: ${title}

Document Content:
---
${content}
---

Check for the presence of these 13 required sections and identify any missing:
1. Problem Statement / Context - Is it clearly defined?
2. Decision Made - Is the final decision explicitly stated?
3. Decision Owner - Is a named individual or team listed?
4. Date of Decision - Is a decision date recorded?
5. Alternatives Considered - Are at least 2-3 options listed with pros/cons?
6. Rationale - Is there clear explanation of WHY this option was chosen?
7. Assumptions - Are all assumptions underpinning the decision listed?
8. Dependencies - Are upstream/downstream dependencies identified?
9. Risks & Mitigations - Are known risks documented with mitigation plans?
10. Impact Assessment - Does it cover security, performance, scalability impact?
11. Stakeholders & Sign-off - Are reviewers, approvers, and informed parties listed?
12. Next Steps / Action Items - Are follow-up actions with owners and dates present?
13. References - Are relevant RFCs, standards, or prior decisions linked?

For each section, assign a status: CLEAR (present & complete), NEEDS_SHARPENING (present but weak), MISSING (not present).

Provide your response in this EXACT JSON format:
{
  "status": "NEEDS_SHARPENING|MISSING|CLEAR",
  "findings": ["⚠️ MISSING: [section name] — Required because [reason].", ...],
  "suggestions": ["Add a clear Problem Statement section that defines the business context.", ...]
}

Only return valid JSON. No markdown, no explanations outside the JSON.`;

    return this.parseReviewResponse(await this.callLlm(prompt));
  }

  private async reviewClarity(content: string, title: string): Promise<ReviewSection> {
    const prompt = `You are a senior architect reviewing a Key Design Decision (KDD) document for sharpness and clarity.

Review the following KDD document for VAGUENESS and AMBIGUITY.

Document Title: ${title}

Document Content:
---
${content}
---

Identify areas that are vague, ambiguous, or underdeveloped:
1. Language precision - Are there general terms like "should", "might", "could" without commitment?
2. Supporting evidence - Are statements lacking supporting evidence or data?
3. Technical backing - Are technical decisions backed by benchmarks, PoC results, or documented research?
4. Incomplete reasoning - Are there sections where reasoning feels incomplete or rushed?

For each issue found, provide:
- Location: Section name or paragraph reference
- Issue: What is weak or unclear
- Recommendation: What should be added or reworded

Provide your response in this EXACT JSON format:
{
  "status": "NEEDS_SHARPENING|MISSING|CLEAR",
  "findings": ["🟡 [Section]: Uses vague language 'should consider' instead of definitive commitment.", ...],
  "suggestions": ["Reword 'We should consider implementing caching' to 'We will implement Redis caching with 99.9% hit rate target'.", ...]
}

Only return valid JSON.`;

    return this.parseReviewResponse(await this.callLlm(prompt));
  }

  private async reviewOutcome(content: string, title: string): Promise<ReviewSection> {
    const prompt = `You are a senior architect reviewing a Key Design Decision (KDD) document for outcome clarity.

Review the following KDD document for MEASURABLE and ACTIONABLE outcomes.

Document Title: ${title}

Document Content:
---
${content}
---

Check for:
1. Is the expected outcome of implementing this decision explicitly stated?
2. Is the outcome measurable? (e.g., "Token expiry reduced to 15 mins" vs "improve security")
3. Is there a definition of success or acceptance criteria?
4. Does the document state what changes in system behaviour are expected post-implementation?
5. Is there a rollback plan or fallback strategy if the decision proves incorrect?
6. Is a timeline or milestone for the outcome defined?

Flag outcome statements:
- Too broad: "🔴 VAGUE OUTCOME: Needs a measurable success criterion."
- Missing entirely: "🔴 NO OUTCOME DEFINED: Add expected result with metrics."
- Well defined: "✅ CLEAR OUTCOME: Meets standard."

Provide your response in this EXACT JSON format:
{
  "status": "NEEDS_SHARPENING|MISSING|CLEAR",
  "findings": ["🔴 VAGUE OUTCOME: 'Improve performance' needs specific metrics (e.g., 'Reduce API latency by 50%').", ...],
  "suggestions": ["Define specific metrics: 'API response time < 200ms at p95'.", ...]
}

Only return valid JSON.`;

    return this.parseReviewResponse(await this.callLlm(prompt));
  }

  private async reviewStakeholder(content: string, title: string): Promise<ReviewSection> {
    const prompt = `You are a senior architect reviewing a Key Design Decision (KDD) document for stakeholder understandability.

Review the following KDD document for ACCESSIBILITY by ALL stakeholders (technical and non-technical).

Document Title: ${title}

Document Content:
---
${content}
---

Assess whether the KDD is understandable by Product Owners, Business Analysts, Security Leads, Architects, and Developers:

1. Is there an executive summary or TL;DR section for non-technical readers?
2. Does the document assume too much prior knowledge without explanation?
3. Are diagrams, flowcharts, or sequence diagrams used where helpful?
4. Is the document structured logically - does it flow from problem → options → decision → outcome?
5. Would a non-technical stakeholder understand why this decision matters to the business?

For each concern:
🟡 ACCESSIBILITY ISSUE: [What is hard to understand and for whom]
✅ Suggestion: [How to make it clearer for that audience]

Provide your response in this EXACT JSON format:
{
  "status": "NEEDS_SHARPENING|MISSING|CLEAR",
  "findings": ["🟡 ACCESSIBILITY ISSUE: OAuth2 technical details may confuse Business Analysts.", ...],
  "suggestions": ["Add a TL;DR section explaining the business value in plain language.", ...]
}

Only return valid JSON.`;

    return this.parseReviewResponse(await this.callLlm(prompt));
  }

  private async reviewAbbreviations(content: string, title: string): Promise<ReviewSection> {
    const prompt = `You are a senior architect reviewing a Key Design Decision (KDD) document for terminology clarity.

Review the following KDD document for ABBREVIATIONS and TECHNICAL TERMS.

Document Title: ${title}

Document Content:
---
${content}
---

Scan the entire document and list every abbreviation, acronym, and technical term used:

1. Is it defined or expanded on first use?
2. Is there a glossary section at the end of the document?
3. Could it be misinterpreted by a non-technical stakeholder?

Flag accordingly:
🔴 UNDEFINED ABBREVIATION: "[TERM]" — First appears in [section]. Add definition: "[Full form + brief explanation]."
🟡 JARGON RISK: "[TERM]" — May confuse non-technical readers. Suggest plain-language alternative or footnote.

Provide your response in this EXACT JSON format:
{
  "status": "NEEDS_SHARPENING|MISSING|CLEAR",
  "findings": ["🔴 UNDEFINED ABBREVIATION: 'JWT' — First appears in Architecture section. Add definition: 'JSON Web Token - compact, URL-safe token format'.", ...],
  "suggestions": ["Add a Glossary section defining all technical terms.", "Expand 'IdP' to 'Identity Provider (IdP)' on first use.", ...]
}

Only return valid JSON.`;

    return this.parseReviewResponse(await this.callLlm(prompt));
  }

  private async reviewFullRead(content: string, title: string): Promise<ReviewSection & {
    requiredInputs: Array<{ item: string; provider: string }>;
    recommendations: Array<{ section: string; recommendation: string }>;
    forumReadinessChecklist: Array<{ item: string; status: boolean }>;
  }> {
    const prompt = `You are a senior architect performing a full end-to-end read of a KDD document as if presenting it in a formal Architecture Review Forum.

After reading, produce a structured recommendation report covering:

Document Title: ${title}

Document Content:
---
${content}
---

SECTION A — Overall Assessment
- Overall quality rating: [Poor/Needs Work/Acceptable/Strong]
- Is this document ready for forum presentation? [Yes/No/Conditional]
- Key strengths of the document: (List)
- Top 3 critical gaps that must be fixed before the forum: (List)

SECTION B — Required Inputs Before Forum
List any information currently missing but MUST be provided before this KDD can be formally reviewed:
| # | Missing Input | Who Should Provide It |

SECTION C — Recommended Improvements
For each section of the document, provide specific recommendations.

SECTION D — Forum Readiness Checklist (true/false for each):
- Document has been peer-reviewed by at least one other architect
- All alternatives have been documented with honest trade-offs
- Security implications have been reviewed by the security team
- All stakeholders have been given review access prior to the forum
- Presenter can confidently answer: "Why not [alternative X]?"
- Decision can be summarised in one clear sentence
- All abbreviations are defined on first use or in a glossary
- Diagrams are included to illustrate the flow
- Action items post-approval are clearly assigned with owners and dates
- A rollback or contingency plan is documented

Provide your response in this EXACT JSON format:
{
  "status": "NEEDS_SHARPENING|MISSING|CLEAR",
  "findings": ["Top 3 Critical Gaps: 1) Missing security review 2) No rollback plan 3) Unmeasurable outcomes", ...],
  "suggestions": ["Complete security review before forum presentation.", ...],
  "requiredInputs": [{"item": "Security review sign-off", "provider": "Security Team Lead"}, ...],
  "recommendations": [{"section": "Problem Statement", "recommendation": "Add business impact context"}, ...],
  "forumReadinessChecklist": [{"item": "Document peer-reviewed", "status": true}, ...]
}

Only return valid JSON.`;

    const response = await this.callLlm(prompt);
    const base = this.parseReviewResponse(response);

    try {
      const parsed = JSON.parse(this.extractJson(response));
      return {
        ...base,
        requiredInputs: parsed.requiredInputs || [],
        recommendations: parsed.recommendations || [],
        forumReadinessChecklist: parsed.forumReadinessChecklist || [],
      };
    } catch {
      return {
        ...base,
        requiredInputs: [],
        recommendations: [],
        forumReadinessChecklist: [],
      };
    }
  }

  private async callLlm(prompt: string, timeoutMs: number = 60000): Promise<string> {
    console.log(`Calling LLM with prompt length: ${prompt.length} chars`);
    
    const truncatedPrompt = prompt.substring(0, 8000);
    
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('LLM timeout')), timeoutMs);
      });
      
      // Race between LLM call and timeout
      const response = await Promise.race([
        this.ollamaService.generateResponse(truncatedPrompt),
        timeoutPromise
      ]);
      
      console.log(`LLM response received, length: ${response?.length || 0} chars`);
      return response || '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('LLM call failed:', errorMessage);
      return `{"status": "RISK", "findings": ["AI review timeout or error: ${errorMessage}"], "suggestions": ["Check Ollama connectivity or retry"], "statusCode": "RISK"}`;
    }
  }

  private parseReviewResponse(response: string): ReviewSection {
    try {
      const json = this.extractJson(response);
      const parsed = JSON.parse(json);
      return {
        status: this.validateStatus(parsed.status),
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch (error) {
      console.error('Failed to parse review response:', error);
      return {
        status: 'RISK',
        findings: ['Failed to parse AI review response'],
        suggestions: ['Retry review or perform manual review'],
      };
    }
  }

  private extractJson(text: string): string {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : '{}';
  }

  private validateStatus(status: string): ReviewStatus {
    const valid: ReviewStatus[] = ['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION'];
    return valid.includes(status as ReviewStatus) ? (status as ReviewStatus) : 'RISK';
  }

  private extractCriticalGaps(sections: ReviewSection[]): string[] {
    const gaps: string[] = [];
    for (const section of sections) {
      for (const finding of section.findings) {
        if (finding.includes('🔴') || finding.includes('⚠️')) {
          gaps.push(finding.replace(/^[🟡🔴⚠️✅]\s*/, '').trim());
        }
      }
    }
    return gaps.slice(0, 5);
  }

  private calculateOverallRating(sections: ReviewSection[]): 'Poor' | 'Needs Work' | 'Acceptable' | 'Strong' {
    const missingCount = sections.filter(s => s.status === 'MISSING').length;
    const riskCount = sections.filter(s => s.status === 'RISK').length;
    const clearCount = sections.filter(s => s.status === 'CLEAR').length;

    if (missingCount >= 3 || riskCount >= 2) return 'Poor';
    if (missingCount >= 1 || riskCount >= 1) return 'Needs Work';
    if (clearCount >= 4) return 'Strong';
    return 'Acceptable';
  }

  private calculateForumReadiness(criticalGaps: string[]): 'Yes' | 'No' | 'Conditional' {
    if (criticalGaps.length === 0) return 'Yes';
    if (criticalGaps.length <= 2) return 'Conditional';
    return 'No';
  }
}
