# Confluence KDD Agent

A TypeScript LangChain agent that searches Confluence using natural language-to-CQL translation and creates standardized KDD (Key Design Decision) templates.

## Features

- **Natural Language Search**: Translate plain English queries to Confluence Query Language (CQL)
- **KDD Template Creation**: Generate structured design decision documents with standardized sections
- **LangChain Integration**: Uses Ollama with Qwen 3 for reasoning and translation
- **REST API**: Simple HTTP endpoints for integration
- **Docker Deployment**: Containerized for easy deployment

## Architecture

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│   Client    │────▶│  Confluence KDD     │────▶│   Ollama    │
│  (HTTP)     │     │  Agent (Port 2304)  │     │  (Qwen 3)   │
└─────────────┘     └─────────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Confluence  │
                    │    API      │
                    └─────────────┘
```

## LangGraph Agent Architecture

This application uses **LangGraph** to orchestrate AI-powered workflows for problem refinement and context-aware decision making.

### What is LangGraph?

LangGraph is a framework for building stateful, multi-agent workflows with LLMs. It enables:
- **Stateful interactions**: Maintain context across multiple AI calls
- **Multi-step reasoning**: Chain multiple AI operations in a structured flow
- **Conditional routing**: Make decisions based on AI outputs
- **Human-in-the-loop**: Pause for user input during workflows

### How It Works

#### 1. Problem Refinement Agent (`ProblemRefinerService`)

Takes a raw problem statement and transforms it into polished, stakeholder-specific versions:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Raw Problem    │────▶│  AI Refinement │────▶│ Unified Version │
│  Statement      │     │  (Ollama/Qwen3)  │     │ (All Stakeholders)
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Per-Stakeholder  │
                    │ Versions (5x)    │
                    │   │
                    └──────────────────┘
```

**Process:**
1. User submits a rough problem statement
2. AI generates a **unified** version (clear, professional language)
3. AI generates **per-stakeholder** versions 
4. AI generates **structured** version (Business Impact, Technical Scope, etc.)

#### 2. Context Search Agent (`CQLTranslatorService` + `ConfluenceService`)

Searches Confluence for relevant documentation to enrich AI context:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Problem Stmt   │────▶│  Key Term        │────▶│ Confluence      │
│                 │     │  Extraction      │     │ CQL Search      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │ Page Content     │
                                              │ Fetch (Optional) │
                                              └──────────────────┘
```

**Process:**
1. Extract key terms from problem statement (filtering common words)
2. Build CQL query: `type = page AND space = "SD" AND (title ~ "term1" OR title ~ "term2")`
3. Search Confluence API
4. Return page metadata (title, excerpt, URL)
5. Optionally fetch full page content for selected pages

#### 3. KDD Suggestion Agent (`KddSuggesterService`)

Auto-populates KDD template fields based on problem statement:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Problem Stmt   │────▶│  AI Analysis     │────▶│ KDD Fields      │
│                 │     │  (Ollama/Qwen3)  │     │                 │
└─────────────────┘     └──────────────────┘     ├─────────────────┤
                                                  │ • Title         │
                                                  │ • Goals         │
                                                  │ • Solution      │
                                                  │ • Alternatives  │
                                                  │ • Risks         │
                                                  │ • Timeline      │
                                                  └─────────────────┘
```

### Token Optimization Strategy

To reduce AI costs and improve performance:

| Technique | Before | After | Savings |
|-----------|--------|-------|---------|
| **Batch AI calls** | 5 separate calls | 1 batched JSON call | 80% tokens |
| **Truncate input** | Full problem | Max 800 chars | ~40% tokens |
| **Limit context** | Full page content | Max 2000 chars | ~60% tokens |
| **Reduce search terms** | 5 terms | 3 terms | Faster search |

### Workflow Example

```
User: "We need auth for our API"
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Context Search                       │
│    Extract: ["authentication", "api"]   │
│    Search Confluence → Found 3 pages    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. User Selects Pages                   │
│    ☑ KDD: Auth Framework (ID: 12345)  │
│    ☐ Legacy Auth doc                    │
│    ☑ API Security Guide (ID: 67890)     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. AI Refinement                        │
│    Fetch full content from pages        │
│    Generate unified statement           │
│    Generate per-stakeholder versions    │
└─────────────────────────────────────────┘
    │
    ▼
User receives polished problem statements
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Ollama running locally with Qwen 3 model
- Confluence instance with API token

### 1. Configure Environment

Create a `.env` file:

```bash
# Copy the example
cp .env.example .env

# Edit with your values
```

Required environment variables:

```env
# Ollama (your local LLM)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen3

# Confluence
CONFLUENCE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_SPACE_KEY=SD

# KDD Settings
KDD_PARENT_PAGE_ID=123456
KDD_DEFAULT_STATUS=Draft

# Server
PORT=2304
MAX_SEARCH_RESULTS=10
```

### 2. Build and Run

```bash
# Build the Docker image
docker-compose build

# Run the container
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3. Verify Installation

```bash
curl http://localhost:2304/health
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "confluence-kdd-agent"
}
```

### Search Confluence

Convert natural language to CQL and search.

```bash
POST /search
Content-Type: application/json

{
  "query": "find all KDDs about authentication from last month",
  "spaceKey": "SD",
  "limit": 10
}
```

Response:
```json
{
  "cql": "type=page AND space=SD AND title ~ \"KDD\" AND text ~ \"authentication\" AND lastModified >= -4w",
  "explanation": "Searching for pages with KDD in title containing authentication references modified in last 4 weeks",
  "results": [
    {
      "id": "123456",
      "title": "KDD: OAuth2 Authentication Flow",
      "url": "...",
      "excerpt": "...",
      "lastModified": "2024-01-10T09:00:00.000Z",
      "spaceKey": "SD"
    }
  ],
  "total": 5
}
```

### Create KDD

Create a new KDD page with template.

```bash
POST /kdd/create
Content-Type: application/json

{
  "title": "KDD: OAuth2 Implementation",
  "problem": "Current authentication system lacks SSO support",
  "goals": [
    "Enable single sign-on across all services",
    "Improve security posture",
    "Reduce password fatigue"
  ],
  "proposedSolution": "Implement OAuth2 with Azure AD as identity provider",
  "alternatives": [
    "SAML 2.0 integration",
    "LDAP-based authentication",
    "Custom JWT implementation"
  ],
  "risks": [
    "Migration complexity and downtime",
    "User training required",
    "Dependency on external identity provider"
  ],
  "timeline": "Q2 2024 (April - June)",
  "jiraTickets": ["PROJ-123", "PROJ-124"],
  "labels": ["auth", "sso", "security"],
  "status": "Draft"
}
```

Response:
```json
{
  "success": true,
  "pageId": "234567",
  "title": "KDD: OAuth2 Implementation",
  "url": "https://your-domain.atlassian.net/wiki/pages/viewpage.action?pageId=234567",
  "spaceKey": "SD",
  "parentPageId": "123456"
}
```

## Development

### Local Setup (without Docker)

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Start production build
npm start
```

### Testing

```bash
# Test search endpoint
curl -X POST http://localhost:2304/search \
  -H "Content-Type: application/json" \
  -d '{"query": "KDD authentication"}'

# Test KDD creation
curl -X POST http://localhost:2304/kdd/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "KDD: Test Decision",
    "problem": "Test problem",
    "goals": ["Test goal"],
    "proposedSolution": "Test solution",
    "alternatives": ["Alternative 1"],
    "risks": ["Risk 1"],
    "timeline": "Q1 2024"
  }'
```

## KDD Template Structure

Generated KDD pages include:

- **Metadata Section**: Status badge, creation date, Jira tickets, labels
- **Problem Statement**: Clear description of the problem
- **Goals & Success Metrics**: Measurable objectives
- **Proposed Solution**: Detailed solution design
- **Alternatives Considered**: Options table with pros/cons
- **Risks & Mitigations**: Risk register with severity
- **Timeline**: Implementation schedule
- **Related Resources**: Links and references

## Troubleshooting

### Ollama Connection Issues

If the agent can't reach Ollama:

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# For Docker on macOS/Windows, use:
OLLAMA_BASE_URL=http://host.docker.internal:11434

# For Docker on Linux, you may need:
OLLAMA_BASE_URL=http://localhost:11434
# And run with: --network="host"
```

### Confluence API Errors

- Verify API token hasn't expired
- Check email matches Atlassian account
- Ensure space key exists and is accessible
- Verify parent page ID exists in the space

## License

MIT
