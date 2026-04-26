import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConfluenceService } from '../services/confluence.js';
import type { KddTemplateService } from '../services/kdd-template.js';
import type { KddConfig, ConfluenceConfig } from '../types.js';
import { ValidationError } from '../utils/errors.js';

const kddCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  problem: z.string().min(1, 'Problem statement is required'),
  goals: z.array(z.string()).min(1, 'At least one goal is required'),
  proposedSolution: z.string().min(1, 'Proposed solution is required'),
  alternatives: z.array(z.string()).min(1, 'At least one alternative is required'),
  risks: z.array(z.string()).min(1, 'At least one risk is required'),
  timeline: z.string().min(1, 'Timeline is required'),
  jiraTickets: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  status: z.string().optional(),
});

export async function kddRoutes(
  fastify: FastifyInstance,
  confluenceService: ConfluenceService,
  kddTemplateService: KddTemplateService,
  kddConfig: KddConfig,
  confluenceConfig: ConfluenceConfig
): Promise<void> {
  fastify.post('/kdd/create', async (request, reply) => {
    const parseResult = kddCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const data = parseResult.data;

    // Generate KDD content
    const content = kddTemplateService.generateKddContent(data);

    // Create page in Confluence
    const page = await confluenceService.createPage(
      confluenceConfig.spaceKey,
      data.title,
      content,
      kddConfig.parentPageId
    );

    // Add labels if provided
    if (data.labels && data.labels.length > 0) {
      await confluenceService.addLabels(page.id, data.labels);
    }

    return {
      success: true,
      pageId: page.id,
      title: page.title,
      url: page.url,
      spaceKey: confluenceConfig.spaceKey,
      parentPageId: kddConfig.parentPageId,
    };
  });
}
