export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  spaceKey: string;
}

export interface KddConfig {
  parentPageId: string;
  defaultStatus: string;
}

export interface ServerConfig {
  port: number;
  maxSearchResults: number;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface SearchRequest {
  query: string;
  spaceKey?: string;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  lastModified?: string;
  spaceKey?: string;
}

export interface SearchResponse {
  cql: string;
  results: SearchResult[];
  total: number;
}

export interface KddCreateRequest {
  title: string;
  problem: string;
  goals: string[];
  proposedSolution: string;
  alternatives: string[];
  risks: string[];
  timeline: string;
  jiraTickets?: string[];
  labels?: string[];
  status?: string;
}

export interface KddCreateResponse {
  success: boolean;
  pageId: string;
  title: string;
  url: string;
  spaceKey: string;
  parentPageId: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  type: string;
  spaceKey?: string;
  version: number;
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
  space?: {
    key: string;
    name: string;
  };
  ancestors?: Array<{ id: string; title: string }>;
}

export interface ConfluenceSearchResult {
  content: {
    id: string;
    title: string;
    type: string;
    space?: {
      key: string;
      name: string;
    };
    history?: {
      lastUpdated?: {
        when: string;
      };
    };
  };
  excerpt?: string;
  searchResultExcerpt?: string;
  url?: string;
  lastModified?: string;
  id?: string;
  title?: string;
  spaceKey?: string;
}

export interface CqlTranslationResult {
  cql: string;
  explanation?: string;
}

// KDD Review Types
export type ReviewStatus = 'CLEAR' | 'NEEDS_SHARPENING' | 'MISSING' | 'RISK' | 'RECOMMENDATION';

export interface ReviewSection {
  status: ReviewStatus;
  findings: string[];
  suggestions: string[];
}

export interface KddReviewResult {
  overallRating: 'Poor' | 'Needs Work' | 'Acceptable' | 'Strong';
  forumReady: 'Yes' | 'No' | 'Conditional';
  sections: {
    completeness: ReviewSection;
    clarity: ReviewSection;
    outcome: ReviewSection;
    stakeholder: ReviewSection;
    abbreviations: ReviewSection;
    fullRead: ReviewSection;
  };
  criticalGaps: string[];
  requiredInputs: Array<{ item: string; provider: string }>;
  recommendations: Array<{ section: string; recommendation: string }>;
  forumReadinessChecklist: Array<{ item: string; status: boolean }>;
}

export interface KddReviewRequest {
  pageId: string;
  autoPost?: boolean;
}

export interface KddReviewAndCommentRequest {
  pageId: string;
  reviewResults: KddReviewResult;
}
