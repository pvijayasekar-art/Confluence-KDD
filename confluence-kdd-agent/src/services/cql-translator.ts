import type { OllamaService } from './ollama.js';
import type { CqlTranslationResult } from '../types.js';
import { OllamaError } from '../utils/errors.js';

export class CqlTranslatorService {
  constructor(private ollamaService: OllamaService) {}

  async translateToCql(
    naturalLanguageQuery: string,
    spaceKey?: string
  ): Promise<CqlTranslationResult> {
    const spaceFilter = spaceKey ? ` AND space = ${spaceKey}` : '';

    const prompt = `
You are a Confluence Query Language (CQL) expert. Translate the following natural language query into a valid CQL query.

Natural language query: "${naturalLanguageQuery}"

CQL Syntax Reference:
- Basic: text ~ "search term" (fuzzy text search)
- Title: title ~ "search term"
- Type: type = page (or blogpost, comment, attachment)
- Space: space = KEY
- Creator: creator = "username"
- Date: lastModified >= -4w (4 weeks), created >= 2024-01-01
- Labels: label = "label-name"
- AND/OR: Use AND, OR with parentheses
- Examples:
  - title ~ "KDD" AND text ~ "authentication"
  - type = page AND space = ENG AND lastModified >= -2w
  - text ~ "API" AND label = "architecture"

Rules:
1. Always include type = page for document searches unless specified otherwise
2. Use fuzzy matching (~) for text searches unless exact match (=) is requested
3. For KDD-related queries, include title ~ "KDD" if appropriate
4. Return ONLY the CQL query string, no explanation
5. Add the space filter: ${spaceFilter || '(none specified)'}

Output format:
CQL: <the query>
Explanation: <brief explanation of what the query does>

Provide your response:
`;

    try {
      const response = await this.ollamaService.generateResponse(prompt);
      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(`Failed to translate query: ${error}`);
    }
  }

  private parseResponse(response: string): CqlTranslationResult {
    const lines = response.trim().split('\n');
    
    let cql = '';
    let explanation = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toUpperCase().startsWith('CQL:')) {
        cql = trimmed.substring(4).trim();
      } else if (trimmed.toUpperCase().startsWith('EXPLANATION:')) {
        explanation = trimmed.substring(12).trim();
      } else if (!cql && trimmed && !trimmed.includes(':')) {
        // If no CQL: prefix found, treat first non-empty line as CQL
        cql = trimmed;
      }
    }

    // Clean up CQL - remove any markdown formatting
    cql = cql.replace(/^`|`$/g, '').trim();

    if (!cql) {
      throw new OllamaError('Failed to parse CQL from model response');
    }

    return { cql, explanation };
  }
}
