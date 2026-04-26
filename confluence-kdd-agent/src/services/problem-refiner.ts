import type { OllamaService } from './ollama.js';
import { OllamaError } from '../utils/errors.js';

export type RefinementStyle = 'unified' | 'per-stakeholder' | 'structured';

export interface ProblemRefinementRequest {
  problemStatement: string;
  style: RefinementStyle;
  contextPages?: Array<{
    id: string;
    title: string;
    excerpt: string;
    url: string;
  }>;
}

export interface StakeholderVersion {
  stakeholder: string;
  refinedText: string;
  focus: string;
}

export interface StructuredSection {
  section: string;
  content: string;
}

export interface ProblemRefinementResult {
  original: string;
  style: RefinementStyle;
  unified?: string;
  perStakeholder?: StakeholderVersion[];
  structured?: StructuredSection[];
}

const STAKEHOLDERS = [
  { name: 'Business', focus: 'ROI, market impact, cost-benefit analysis' },
  { name: 'CTO', focus: 'Technical feasibility, architecture alignment, scalability' },
  { name: 'CSO', focus: 'Security implications, compliance, risk assessment' },
  { name: 'Senior Architect', focus: 'Design patterns, integration points, technical debt' },
  { name: 'Project Managers', focus: 'Timeline, resources, dependencies, milestones' },
];

export class ProblemRefinerService {
  constructor(private ollamaService: OllamaService) {}

  private parseStakeholderJson(response: string): StakeholderVersion[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(cleaned);
      
      if (parsed.versions && Array.isArray(parsed.versions)) {
        return parsed.versions.map((v: any) => ({
          stakeholder: v.stakeholder || 'Unknown',
          refinedText: v.refinedText || v.content || 'No content generated',
          focus: v.focus || '',
        }));
      }
      
      // Fallback: try to parse if structure is different
      if (Array.isArray(parsed)) {
        return parsed.map((v: any) => ({
          stakeholder: v.stakeholder || 'Unknown',
          refinedText: v.refinedText || v.content || 'No content generated',
          focus: v.focus || '',
        }));
      }
      
      throw new Error('Invalid JSON structure');
    } catch (error) {
      console.error('Failed to parse stakeholder JSON:', error, 'Response:', response);
      // Return fallback versions
      return STAKEHOLDERS.map(s => ({
        stakeholder: s.name,
        refinedText: 'Error parsing AI response. Please try again.',
        focus: s.focus,
      }));
    }
  }

  private parseStructuredJson(response: string): StructuredSection[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(cleaned);
      
      if (parsed.sections && Array.isArray(parsed.sections)) {
        return parsed.sections.map((s: any) => ({
          section: s.section || 'Unknown',
          content: s.content || 'No content generated',
        }));
      }
      
      // Fallback: try to parse if structure is different
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => ({
          section: s.section || 'Unknown',
          content: s.content || 'No content generated',
        }));
      }
      
      throw new Error('Invalid JSON structure');
    } catch (error) {
      console.error('Failed to parse structured JSON:', error, 'Response:', response);
      // Return fallback sections
      return [
        { section: 'Business Impact', content: 'Error parsing AI response. Please try again.' },
        { section: 'Technical Scope', content: 'Error parsing AI response. Please try again.' },
        { section: 'Security Considerations', content: 'Error parsing AI response. Please try again.' },
        { section: 'Architecture Implications', content: 'Error parsing AI response. Please try again.' },
        { section: 'Project Milestones', content: 'Error parsing AI response. Please try again.' },
      ];
    }
  }

  async refineProblem(
    problemStatement: string,
    style: RefinementStyle,
    contextPages?: Array<{ id: string; title: string; excerpt: string; url: string }>
  ): Promise<ProblemRefinementResult> {
    // Truncate long problem statements to save tokens (max ~800 chars)
    const truncatedProblem = problemStatement.length > 800 
      ? problemStatement.substring(0, 800) + '...' 
      : problemStatement;
    
    let contextSection = '';
    if (contextPages && contextPages.length > 0) {
      // Truncate excerpts to save tokens (max 100 chars each)
      const truncatedPages = contextPages.map((p, i) => {
        const shortExcerpt = p.excerpt.length > 100 
          ? p.excerpt.substring(0, 100) + '...' 
          : p.excerpt;
        return `${i + 1}. "${p.title}" - ${shortExcerpt}`;
      });
      
      contextSection = `

RELEVANT DOCUMENTATION:
${truncatedPages.join('\n')}`;
    }

    const basePrompt = `You are a technical communication expert. Refine this problem statement for stakeholders.

ORIGINAL:
"${truncatedProblem}"${contextSection}

Rules:
- Use plain English, avoid jargon
- Focus on business value
- Be specific and concise (3-5 sentences max)
${contextPages && contextPages.length > 0 ? '- Align with existing documentation' : ''}`;

    try {
      if (style === 'unified') {
        const prompt = `${basePrompt}

Create ONE refined problem statement (3-5 sentences) suitable for all stakeholders.

Output only the refined statement, no extra text:`;

        const response = await this.ollamaService.generateResponse(prompt);
        return {
          original: problemStatement,
          style,
          unified: response.trim(),
        };
      }

      if (style === 'per-stakeholder') {
        // OPTIMIZED: Single AI call for all stakeholders with JSON output
        const prompt = `${basePrompt}

Create refined statements for ALL 5 stakeholders. Return JSON only.

STAKEHOLDERS:
1. Business - ROI, market impact, cost-benefit
2. CTO - Technical feasibility, architecture, scalability  
3. CSO - Security, compliance, risk
4. Senior Architect - Design patterns, integration, tech debt
5. Project Managers - Timeline, resources, dependencies

JSON format:
{
  "versions": [
    {"stakeholder": "Business", "refinedText": "...", "focus": "..."},
    {"stakeholder": "CTO", "refinedText": "...", "focus": "..."},
    {"stakeholder": "CSO", "refinedText": "...", "focus": "..."},
    {"stakeholder": "Senior Architect", "refinedText": "...", "focus": "..."},
    {"stakeholder": "Project Managers", "refinedText": "...", "focus": "..."}
  ]
}

JSON:`;

        const response = await this.ollamaService.generateResponse(prompt);
        const versions = this.parseStakeholderJson(response);

        return {
          original: problemStatement,
          style,
          perStakeholder: versions,
        };
      }

      // Structured style - OPTIMIZED: Single AI call with JSON output
      const prompt = `${basePrompt}

Create content for ALL 5 sections. Return JSON only.

SECTIONS:
1. Business Impact - Business problem, market impact, ROI
2. Technical Scope - Technical problem, solution approach
3. Security Considerations - Security, compliance aspects
4. Architecture Implications - System design, integration
5. Project Milestones - Key phases, deliverables

JSON format:
{
  "sections": [
    {"section": "Business Impact", "content": "..."},
    {"section": "Technical Scope", "content": "..."},
    {"section": "Security Considerations", "content": "..."},
    {"section": "Architecture Implications", "content": "..."},
    {"section": "Project Milestones", "content": "..."}
  ]
}

JSON:`;

      const response = await this.ollamaService.generateResponse(prompt);
      const sections = this.parseStructuredJson(response);

      return {
        original: problemStatement,
        style,
        structured: sections,
      };
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(`Failed to refine problem: ${error}`);
    }
  }
}
