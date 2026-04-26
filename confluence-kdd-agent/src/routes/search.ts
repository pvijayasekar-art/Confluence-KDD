import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConfluenceService } from '../services/confluence.js';
import type { CqlTranslatorService } from '../services/cql-translator.js';
import type { ServerConfig, ConfluenceConfig } from '../types.js';
import { ValidationError } from '../utils/errors.js';

const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  spaceKey: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export async function searchRoutes(
  fastify: FastifyInstance,
  confluenceService: ConfluenceService,
  cqlTranslatorService: CqlTranslatorService,
  serverConfig: ServerConfig,
  confluenceConfig: ConfluenceConfig
): Promise<void> {
  fastify.post('/search', async (request, reply) => {
    const parseResult = searchRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const { query, spaceKey, limit } = parseResult.data;
    const effectiveSpaceKey = spaceKey || confluenceConfig.spaceKey;
    const effectiveLimit = limit || serverConfig.maxSearchResults;

    // Translate natural language to CQL
    const translation = await cqlTranslatorService.translateToCql(query, effectiveSpaceKey);

    // Execute search
    const searchResult = await confluenceService.search(translation.cql, effectiveLimit);

    // Format response with proper URL construction
    const baseUrl = confluenceConfig.baseUrl;
    const results = searchResult.results.map((item) => ({
      id: item.content.id,
      title: item.content.title,
      url: `${baseUrl}/pages/viewpage.action?pageId=${item.content.id}`,
      excerpt: item.excerpt,
      lastModified: item.lastModified,
      spaceKey: item.content.space?.key,
    }));

    return {
      cql: translation.cql,
      explanation: translation.explanation,
      results,
      total: searchResult.total,
    };
  });
}
