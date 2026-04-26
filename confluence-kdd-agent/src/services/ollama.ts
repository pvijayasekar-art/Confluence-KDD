import { ChatOllama } from '@langchain/ollama';
import type { OllamaConfig } from '../types.js';
import { OllamaError } from '../utils/errors.js';

export class OllamaService {
  private model: ChatOllama;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.model = new ChatOllama({
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: 0.1,
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.model.invoke(prompt);
      return response.content as string;
    } catch (error) {
      throw new OllamaError(
        `Failed to generate response from Ollama: ${error}`
      );
    }
  }

  async generateStructuredResponse<T>(
    prompt: string,
    parser: { parse: (text: string) => T }
  ): Promise<T> {
    try {
      const response = await this.generateResponse(prompt);
      return parser.parse(response);
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(
        `Failed to parse structured response: ${error}`
      );
    }
  }

  getModel(): ChatOllama {
    return this.model;
  }

  getConfig(): OllamaConfig {
    return this.config;
  }
}
