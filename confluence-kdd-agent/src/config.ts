import dotenv from 'dotenv';
import { z } from 'zod';
import type { ConfluenceConfig, KddConfig, ServerConfig, OllamaConfig } from './types.js';

dotenv.config();

const envSchema = z.object({
  OLLAMA_BASE_URL: z.string().default('http://172.27.0.3:11434'),
  OLLAMA_MODEL: z.string().default('qwen3'),
  CONFLUENCE_URL: z.string().url(),
  CONFLUENCE_EMAIL: z.string().email(),
  CONFLUENCE_API_TOKEN: z.string().min(1),
  CONFLUENCE_SPACE_KEY: z.string().min(1).default('SD'),
  KDD_PARENT_PAGE_ID: z.string().min(1).default('123456'),
  KDD_DEFAULT_STATUS: z.string().default('Draft'),
  PORT: z.string().transform(Number).default('2304'),
  MAX_SEARCH_RESULTS: z.string().transform(Number).default('10'),
});

function loadConfig(): { confluence: ConfluenceConfig; kdd: KddConfig; server: ServerConfig; ollama: OllamaConfig } {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Configuration validation failed:');
    parsed.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  const env = parsed.data;

  return {
    confluence: {
      baseUrl: env.CONFLUENCE_URL.replace(/\/$/, ''), // Remove trailing slash
      email: env.CONFLUENCE_EMAIL,
      apiToken: env.CONFLUENCE_API_TOKEN,
      spaceKey: env.CONFLUENCE_SPACE_KEY,
    },
    kdd: {
      parentPageId: env.KDD_PARENT_PAGE_ID,
      defaultStatus: env.KDD_DEFAULT_STATUS,
    },
    server: {
      port: env.PORT,
      maxSearchResults: env.MAX_SEARCH_RESULTS,
    },
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL.replace(/\/$/, ''), // Remove trailing slash
      model: env.OLLAMA_MODEL,
    },
  };
}

export const config = loadConfig();
