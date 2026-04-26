import axios, { AxiosInstance } from 'axios';
import type { ConfluenceConfig, ConfluenceSearchResult, ConfluencePage } from '../types.js';
import { ConfluenceError } from '../utils/errors.js';

export class ConfluenceService {
  private client: AxiosInstance;
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
    const baseURL = `${config.baseUrl}/rest/api`;
    console.log('ConfluenceService initialized with baseURL:', baseURL);
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      timeout: 30000,
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        // Build actual URL with params using same encoding as paramsSerializer
        let url = config.url || '';
        if (config.params) {
          const parts: string[] = [];
          for (const [key, value] of Object.entries(config.params)) {
            const encoded = encodeURIComponent(String(value)).replace(/\+/g, '%20');
            parts.push(`${key}=${encoded}`);
          }
          url += '?' + parts.join('&');
        }
        const fullUrl = `${config.baseURL}${url}`;
        console.log('=== CONFLUENCE API REQUEST ===');
        console.log('Method:', config.method?.toUpperCase());
        console.log('URL:', url.substring(0, 150));
        console.log('Full URL:', fullUrl.substring(0, 200));
        console.log('===============================');
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message || error.message;
          throw new ConfluenceError(
            `Confluence API error (${status}): ${message}`,
            status || 502
          );
        }
        throw error;
      }
    );
  }

  async search(cql: string, limit: number = 10, start: number = 0): Promise<{ results: ConfluenceSearchResult[]; total: number }> {
    console.log('Confluence.search() called with CQL:', cql?.substring(0, 100));
    
    try {
      // Use params with encoder to prevent double encoding
      const response = await this.client.get('/content/search', {
        params: {
          cql,
          limit,
          start,
          expand: 'content.history.lastUpdated,content.space',
        },
        paramsSerializer: {
          serialize: (params) => {
            // Manually serialize - encode spaces as %20 not +
            const parts: string[] = [];
            for (const [key, value] of Object.entries(params)) {
              const encoded = encodeURIComponent(String(value)).replace(/\+/g, '%20');
              parts.push(`${key}=${encoded}`);
            }
            return parts.join('&');
          },
        },
      });

      console.log('Raw Confluence response data:', JSON.stringify(response.data.results[0], null, 2)?.substring(0, 500));
      
      const results = response.data.results.map((item: any) => {
        // Debug: log the first item structure
        if (!item._debugged) {
          console.log('Mapping item:', JSON.stringify(item)?.substring(0, 300));
          item._debugged = true;
        }
        // Defensive mapping - handle different API response structures
        const content = item.content || item || {};
        return {
          content: {
            id: content.id || item.id || 'unknown',
            title: content.title || item.title || 'Untitled',
            type: content.type || 'page',
            space: content.space ? {
              key: content.space.key,
              name: content.space.name,
            } : undefined,
            history: content.history,
          },
          excerpt: item.excerpt || item.searchResultExcerpt || '',
          url: item.url || item._links?.webui || '',
          lastModified: content.history?.lastUpdated?.when,
        };
      });

      return {
        results,
        total: response.data.size,
      };
    } catch (error) {
      if (error instanceof ConfluenceError) throw error;
      throw new ConfluenceError(`Failed to search Confluence: ${error}`);
    }
  }

  async getPage(pageId: string): Promise<ConfluencePage> {
    console.log('Confluence.getPage() called with pageId:', pageId);
    try {
      const response = await this.client.get(`/content/${pageId}`, {
        params: {
          expand: 'body.storage,version,ancestors',
        },
      });

      return {
        id: response.data.id,
        title: response.data.title,
        type: response.data.type,
        space: response.data.space ? {
          key: response.data.space.key,
          name: response.data.space.name,
        } : undefined,
        body: response.data.body?.storage?.value || '',
        version: response.data.version?.number || 1,
        ancestors: response.data.ancestors?.map((a: any) => ({
          id: a.id,
          title: a.title,
        })) || [],
      };
    } catch (error) {
      if (error instanceof ConfluenceError) throw error;
      throw new ConfluenceError(`Failed to get page ${pageId}: ${error}`);
    }
  }

  async getPageContent(pageId: string): Promise<{ title: string; body: string; url: string }> {
    console.log('Confluence.getPageContent() called with pageId:', pageId);
    try {
      const response = await this.client.get(`/content/${pageId}`, {
        params: {
          expand: 'body.storage',
        },
      });

      const title = response.data.title || 'Untitled';
      // Strip HTML tags for cleaner text
      const bodyHtml = response.data.body?.storage?.value || '';
      const bodyText = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 5000);
      const url = `${this.config.baseUrl}/pages/viewpage.action?pageId=${pageId}`;

      console.log(`Fetched content for page "${title}", body length: ${bodyText.length}`);
      return { title, body: bodyText, url };
    } catch (error) {
      console.error(`Failed to get page content for ${pageId}:`, error);
      // Return empty content on error so refinement can still proceed
      return { title: 'Unknown', body: '', url: '' };
    }
  }

  async createPage(
    spaceKey: string,
    title: string,
    content: string,
    parentId?: string
  ): Promise<{ id: string; title: string; url: string }> {
    try {
      const body: any = {
        type: 'page',
        title,
        space: {
          key: spaceKey,
        },
        body: {
          storage: {
            value: content,
            representation: 'storage',
          },
        },
      };

      if (parentId) {
        body.ancestors = [{ id: parentId }];
      }

      const response = await this.client.post('/content', body);

      const pageId = response.data.id;
      const url = `${this.config.baseUrl}/pages/viewpage.action?pageId=${pageId}`;

      return {
        id: pageId,
        title: response.data.title,
        url,
      };
    } catch (error) {
      if (error instanceof ConfluenceError) throw error;
      throw new ConfluenceError(`Failed to create page: ${error}`);
    }
  }

  async addLabels(pageId: string, labels: string[]): Promise<void> {
    try {
      for (const label of labels) {
        await this.client.post(`/content/${pageId}/label`, {
          prefix: 'global',
          name: label,
        });
      }
    } catch (error) {
      if (error instanceof ConfluenceError) throw error;
      throw new ConfluenceError(`Failed to add labels: ${error}`);
    }
  }
}
