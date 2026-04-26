import type { OllamaService } from './ollama.js';
import { OllamaError } from '../utils/errors.js';

export interface KddSuggestionRequest {
  problemStatement: string;
  refinementStyle: 'unified' | 'per-stakeholder' | 'structured';
}

export interface KddSuggestions {
  title: string;
  goals: string[];
  proposedSolution: string;
  alternatives: string[];
  risks: string[];
  timeline: string;
  jiraTickets?: string[];
  labels?: string[];
}

export class KddSuggesterService {
  constructor(private ollamaService: OllamaService) {}

  async suggestKddFields(
    problemStatement: string,
    refinementStyle: 'unified' | 'per-stakeholder' | 'structured'
  ): Promise<KddSuggestions> {
    // Truncate long problem statements to save tokens (max ~1000 chars)
    const truncatedProblem = problemStatement.length > 1000 
      ? problemStatement.substring(0, 1000) + '...' 
      : problemStatement;

    const prompt = `You are a solution architect drafting a KDD document.

PROBLEM:
"${truncatedProblem}"

Generate JSON with these exact keys:
{
  "title": "KDD: <concise title>",
  "goals": ["3-5 SMART goals"],
  "proposedSolution": "2-3 sentence recommended approach",
  "alternatives": ["2-3 realistic alternatives"],
  "risks": ["3-4 key risks"],
  "timeline": "e.g., Q2 2024 or 3 months",
  "labels": ["relevant tags like auth, security"]
}

Rules:
- Title MUST start with "KDD: "
- Goals: specific, measurable
- Output ONLY valid JSON, no markdown
- Use double quotes

JSON:`;

    try {
      const response = await this.ollamaService.generateResponse(prompt);
      return this.parseSuggestions(response);
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(`Failed to generate KDD suggestions: ${error}`);
    }
  }

  private parseSuggestions(response: string): KddSuggestions {
    // Clean up the response - remove markdown code blocks and extra content
    let cleaned = response.trim();
    
    // Find JSON content between curly braces
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    // Remove markdown code block markers if present
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/i, '');
    cleaned = cleaned.trim();

    console.log('Cleaned AI response for parsing:', cleaned.substring(0, 200));

    try {
      const parsed = JSON.parse(cleaned);
      
      // Log what we received
      console.log('Parsed AI response:', {
        hasTitle: !!parsed.title,
        hasGoals: !!parsed.goals && Array.isArray(parsed.goals),
        goalsCount: Array.isArray(parsed.goals) ? parsed.goals.length : 0,
        hasSolution: !!parsed.proposedSolution,
        hasAlternatives: !!parsed.alternatives && Array.isArray(parsed.alternatives),
        hasRisks: !!parsed.risks && Array.isArray(parsed.risks),
        hasTimeline: !!parsed.timeline,
        timeline: parsed.timeline,
      });

      // Validate required fields
      if (!parsed.title || !parsed.proposedSolution) {
        throw new Error('Missing required fields: title or proposedSolution');
      }

      // Ensure title starts with KDD:
      if (!parsed.title.startsWith('KDD:')) {
        parsed.title = `KDD: ${parsed.title}`;
      }

      // Ensure arrays - handle various possible formats
      const ensureArray = (val: any): string[] => {
        if (Array.isArray(val)) return val.filter((v: any) => typeof v === 'string');
        if (typeof val === 'string') return val.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean);
        return [];
      };

      parsed.goals = ensureArray(parsed.goals);
      parsed.alternatives = ensureArray(parsed.alternatives);
      parsed.risks = ensureArray(parsed.risks);
      parsed.labels = ensureArray(parsed.labels);

      // Provide defaults for missing fields
      if (!parsed.timeline || typeof parsed.timeline !== 'string') {
        parsed.timeline = 'Q2 2024';
      }

      return {
        title: parsed.title,
        goals: parsed.goals,
        proposedSolution: parsed.proposedSolution,
        alternatives: parsed.alternatives,
        risks: parsed.risks,
        timeline: parsed.timeline,
        jiraTickets: parsed.jiraTickets || [],
        labels: parsed.labels,
      };
    } catch (error) {
      console.error('Failed to parse AI response. Raw response:', response);
      console.error('Parse error:', error);
      throw new OllamaError(`Failed to parse KDD suggestions: ${error}`);
    }
  }
}
