import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { ConfluenceService } from './services/confluence.js';
import { OllamaService } from './services/ollama.js';
import { CqlTranslatorService } from './services/cql-translator.js';
import { KddTemplateService } from './services/kdd-template.js';
import { ProblemRefinerService } from './services/problem-refiner.js';
import { KddSuggesterService } from './services/kdd-suggester.js';
import { KddReviewService } from './services/kdd-review.js';
import { healthRoutes } from './routes/health.js';
import { searchRoutes } from './routes/search.js';
import { kddRoutes } from './routes/kdd.js';
import { refineRoutes } from './routes/refine.js';
import { suggestRoutes } from './routes/suggest.js';
import { searchContextRoutes } from './routes/search-context.js';
import { kddReviewRoutes } from './routes/kdd-review.js';
import { handleError, AppError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Initialize services
  const confluenceService = new ConfluenceService(config.confluence);
  const ollamaService = new OllamaService(config.ollama);
  const cqlTranslatorService = new CqlTranslatorService(ollamaService);
  const kddTemplateService = new KddTemplateService(config.kdd);
  const problemRefinerService = new ProblemRefinerService(ollamaService);
  const kddSuggesterService = new KddSuggesterService(ollamaService);
  const kddReviewService = new KddReviewService(ollamaService);

  // Serve static files (web UI)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(async (instance) => {
    await searchRoutes(instance, confluenceService, cqlTranslatorService, config.server, config.confluence);
  });
  await fastify.register(async (instance) => {
    await searchContextRoutes(instance, confluenceService, cqlTranslatorService, config.server, config.confluence);
  });
  await fastify.register(async (instance) => {
    await kddRoutes(instance, confluenceService, kddTemplateService, kddReviewService, config.kdd, config.confluence);
  });
  await fastify.register(async (instance) => {
    await refineRoutes(instance, problemRefinerService, confluenceService);
  });
  await fastify.register(async (instance) => {
    await suggestRoutes(instance, kddSuggesterService);
  });
  await fastify.register(async (instance) => {
    await kddReviewRoutes(instance, confluenceService, kddReviewService);
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    const errorResponse = handleError(error);
    
    reply.status(errorResponse.statusCode).send({
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
      },
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  // Start server
  try {
    await fastify.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Confluence KDD Agent                                 ║
╠════════════════════════════════════════════════════════════════╣
║  Server running on port: ${config.server.port}                            ║
║  Web UI:      http://localhost:${config.server.port}                           ║
║  Health:      http://localhost:${config.server.port}/health                    ║
╠════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║    GET  /              - Problem Refiner Web UI                  ║
║    POST /search-context- Search Confluence for relevant context    ║
║    POST /refine        - Refine problem statement (AI)          ║
║    POST /suggest-kdd   - AI suggestions for all KDD fields       ║
║    POST /search        - Natural language Confluence search     ║
║    POST /kdd/create    - Create KDD template page               ║
║    POST /kdd/review  - Review KDD document with AI            ║
║    POST /kdd/review-and-comment - Post review as comment       ║
╠════════════════════════════════════════════════════════════════╣
║  Configured:                                                   ║
║    Confluence: ${config.confluence.baseUrl.slice(0, 37)}...  ║
║    Space: ${config.confluence.spaceKey}                                                ║
║    Ollama: ${config.ollama.baseUrl.slice(0, 37)}...       ║
║    Model: ${config.ollama.model}                                                 ║
╚════════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
