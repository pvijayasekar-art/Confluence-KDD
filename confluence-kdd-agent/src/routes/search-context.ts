import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConfluenceService } from '../services/confluence.js';
import type { CqlTranslatorService } from '../services/cql-translator.js';
import type { ConfluenceConfig, ServerConfig } from '../types.js';
import { ValidationError } from '../utils/errors.js';

const searchContextSchema = z.object({
  problemStatement: z.string().min(3, 'Problem statement too short'),
  spaceKey: z.string().optional(),
  limit: z.number().min(1).max(10).optional(),
});

export async function searchContextRoutes(
  fastify: FastifyInstance,
  confluenceService: ConfluenceService,
  cqlTranslatorService: CqlTranslatorService,
  serverConfig: ServerConfig,
  confluenceConfig: ConfluenceConfig
): Promise<void> {
  
  // Search for context before refinement
  fastify.post('/search-context', async (request, reply) => {
    const parseResult = searchContextSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const { problemStatement, spaceKey, limit } = parseResult.data;
    console.log('=== SEARCH-CONTEXT DEBUG ===');
    console.log('1. Raw input:', { problemStatement: problemStatement?.substring(0, 50), spaceKey, limit });
    
    const effectiveSpaceKey = spaceKey || confluenceConfig.spaceKey;
    const effectiveLimit = limit || 5; // Show top 5 results
    
    console.log('2. Effective spaceKey:', effectiveSpaceKey);

    // Extract key terms from problem statement for search
    const searchTerms = extractKeyTerms(problemStatement);
    console.log('3. Extracted search terms:', JSON.stringify(searchTerms));
    
    const cql = buildContextSearchCql(searchTerms, effectiveSpaceKey);
    console.log('4. Generated CQL:', JSON.stringify(cql));
    console.log('5. CQL length:', cql?.length);
    console.log('6. CQL contains &limit:', cql?.includes('&limit'));
    console.log('=== END DEBUG ===');

    // Execute search
    const searchResult = await confluenceService.search(cql, effectiveLimit);

    // Format response
    const results = searchResult.results.map((item) => {
      // Confluence API returns content directly in item, not in item.content
      const content = item.content || item;
      const excerpt = item.excerpt || item.searchResultExcerpt || '';
      const shortenedExcerpt = excerpt.length > 200 
        ? excerpt.substring(0, 200) + '...' 
        : excerpt || 'No preview available';
      
      return {
        id: content.id || item.id || 'unknown',
        title: content.title || item.title || 'Untitled',
        url: `${confluenceConfig.baseUrl}/pages/viewpage.action?pageId=${content.id || item.id || 'unknown'}`,
        excerpt: shortenedExcerpt,
        lastModified: content.history?.lastUpdated?.when || item.lastModified,
        spaceKey: content.space?.key || item.spaceKey,
        selected: false, // User can toggle this
      };
    });

    return {
      query: searchTerms,
      cql,
      total: searchResult.total,
      results,
      message: results.length > 0 
        ? `Found ${results.length} potentially relevant pages in Confluence. Select pages to include as context for AI refinement.`
        : 'No relevant pages found. You can proceed with refinement using just your problem statement.',
    };
  });
}

// Optimized common words list - top 50 most frequent English words only
const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'what', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'them', 'well', 'were', 'said', 'time', 'than', 'them', 'into', 'just', 'like', 'over', 'also', 'back', 'only', 'even', 'work', 'life', 'without'
]);

function extractKeyTerms(problemStatement: string): string {
  // Fast extraction: lowercase, remove punctuation, filter
  const words = problemStatement.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Keep only alphanumeric and spaces
    .split(/\s+/)
    .filter(w => w.length >= 3)        // Include words 3+ chars (API, auth, app, etc.)
    .filter(w => !COMMON_WORDS.has(w) && !/^\d+$/.test(w)); // Filter common words and pure numbers
  
  // Return top 3 most relevant terms (faster AND queries than OR)
  const uniqueWords = [...new Set(words)];
  return uniqueWords.slice(0, 3).join(' ');
}

function buildContextSearchCql(searchTerms: string, spaceKey: string): string {
  const validSpaceKey = (spaceKey?.trim()) || 'SD';
  const termsStr = searchTerms?.trim() || '';
  
  // Parse terms - safely handle empty/malformed input
  let terms: string[] = [];
  if (termsStr) {
    terms = termsStr.split(/\s+/).filter(t => t && t.length >= 2);
  }
  
  console.log('CQL build - spaceKey:', validSpaceKey, 'raw terms:', termsStr, 'parsed terms:', terms);
  
  // If we have valid search terms, use them
  if (terms.length > 0) {
    const titleQuery = terms.slice(0, 3).map(t => `title ~ "${t}"`).join(' OR ');
    const cql = `type = page AND space = "${validSpaceKey}" AND (${titleQuery})`;
    console.log('Generated CQL with terms:', cql);
    return cql;
  }
  
  // Safe fallback: just pages in the space
  const fallbackCql = `type = page AND space = "${validSpaceKey}"`;
  console.log('Fallback CQL (no valid terms):', fallbackCql);
  return fallbackCql;
}
