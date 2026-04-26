import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { KddSuggesterService } from '../services/kdd-suggester.js';
import { ValidationError } from '../utils/errors.js';

const suggestRequestSchema = z.object({
  problemStatement: z.string().min(10, 'Problem statement must be at least 10 characters'),
  refinementStyle: z.enum(['unified', 'per-stakeholder', 'structured']),
});

export async function suggestRoutes(
  fastify: FastifyInstance,
  suggesterService: KddSuggesterService
): Promise<void> {
  fastify.post('/suggest-kdd', async (request, reply) => {
    const parseResult = suggestRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const { problemStatement, refinementStyle } = parseResult.data;

    const suggestions = await suggesterService.suggestKddFields(problemStatement, refinementStyle);

    return suggestions;
  });
}
