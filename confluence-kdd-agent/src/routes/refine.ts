import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ProblemRefinerService } from '../services/problem-refiner.js';
import type { ConfluenceService } from '../services/confluence.js';
import { ValidationError } from '../utils/errors.js';

const refineRequestSchema = z.object({
  problemStatement: z.string().min(5, 'Problem statement must be at least 5 characters'),
  style: z.enum(['unified', 'per-stakeholder', 'structured']),
  contextPages: z.array(z.object({
    id: z.string(),
    title: z.string(),
    excerpt: z.string(),
    url: z.string(),
  })).optional(),
  selectedPageIds: z.array(z.string()).optional(),
});

export async function refineRoutes(
  fastify: FastifyInstance,
  refinerService: ProblemRefinerService,
  confluenceService: ConfluenceService
): Promise<void> {
  fastify.post('/refine', async (request, reply) => {
    const parseResult = refineRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const { problemStatement, style, contextPages, selectedPageIds } = parseResult.data;

    // If selected page IDs provided, fetch full content from Confluence
    let enrichedContextPages = contextPages;
    if (selectedPageIds && selectedPageIds.length > 0) {
      console.log('Fetching full content for selected pages:', selectedPageIds);
      const pageContents = await Promise.all(
        selectedPageIds.map(async (pageId) => {
          try {
            const content = await confluenceService.getPageContent(pageId);
            return {
              id: pageId,
              title: content.title,
              excerpt: content.body.substring(0, 2000), // Include up to 2000 chars of body
              url: content.url,
            };
          } catch (error) {
            console.error(`Failed to fetch content for page ${pageId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out failed fetches and merge with existing context
      const validPages = pageContents.filter((p): p is NonNullable<typeof p> => p !== null);
      
      // Merge with existing context pages (avoid duplicates)
      const existingIds = new Set(contextPages?.map(p => p.id) || []);
      const newPages = validPages.filter(p => !existingIds.has(p.id));
      
      enrichedContextPages = [...(contextPages || []), ...newPages];
      console.log(`Enriched context with ${newPages.length} pages with full content`);
    }

    const result = await refinerService.refineProblem(problemStatement, style, enrichedContextPages);

    return result;
  });
}
