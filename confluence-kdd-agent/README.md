# Confluence KDD Agent

A TypeScript LangChain agent that searches Confluence using natural language-to-CQL translation, creates standardized KDD (Key Design Decision) templates, and provides AI-powered Architecture Review Forum assessments.

## Features

- **Natural Language Search**: Translate plain English queries to Confluence Query Language (CQL)
- **KDD Template Creation**: Generate structured design decision documents with standardized sections
- **AI-Powered KDD Review**: Automated Architecture Review Forum assessment using 6-prompt framework
- **Auto-Review on Creation**: Optional automatic review when creating KDD pages
- **Confluence Comments**: Post AI review results as page comments
- **LangChain Integration**: Uses Ollama with Qwen 3 for reasoning and translation
- **REST API**: Simple HTTP endpoints for integration
- **Docker Deployment**: Containerized for easy deployment with DNS-based service discovery

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

#### 4. KDD Review Agent (`KddReviewService`)

Performs Architecture Review Forum assessment using 6-prompt framework:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  KDD Page       │────▶│  6-Prompt Review │────▶│ Review Results  │
│  Content        │     │  (Sequential)    │     │                 │
└─────────────────┘     └──────────────────┘     ├─────────────────┤
       │                                            │ • Overall Rating│
       ▼                                            │ • Forum Ready │
┌─────────────────┐                                 │ • Critical Gaps│
│ Confluence      │                                 │ • Checklist   │
│ Comment         │◀────────────────────────────────┘ • Improvements│
└─────────────────┘                                  └─────────────────┘
```

**Architecture Review Forum 6-Prompt Framework:**

| # | Prompt | Purpose | Status Tags |
|---|--------|---------|-------------|
| 1 | **Completeness Check** | Verifies 13 required sections (Problem, Decision, Rationale, Risks, etc.) | ✅ CLEAR / 🟡 NEEDS_SHARPENING / 🔴 MISSING |
| 2 | **Sharpness & Clarity** | Flags vague language, unsupported claims, incomplete reasoning | ✅ CLEAR / 🟡 NEEDS_SHARPENING |
| 3 | **Outcome Clarity** | Checks measurability, success criteria, rollback plan | ✅ CLEAR / 🟡 NEEDS_SHARPENING / 🔴 VAGUE |
| 4 | **Stakeholder Accessibility** | Assesses understandability for technical and non-technical audiences | ✅ CLEAR / 🟡 ACCESSIBILITY_ISSUE |
| 5 | **Abbreviations & Terminology** | Lists undefined acronyms and jargon risks | ✅ CLEAR / 🔴 UNDEFINED / 🟡 JARGON_RISK |
| 6 | **Full Read-Through** | Overall assessment, forum readiness, required inputs, recommendations | ✅ CLEAR / 🟡 NEEDS_WORK |

**Process:**
1. Fetch KDD page content from Confluence
2. Run 6 review prompts sequentially (to avoid overwhelming Ollama)
3. Calculate overall rating (Poor/Needs Work/Acceptable/Strong)
4. Determine forum readiness (Yes/No/Conditional)
5. Extract critical gaps and recommendations
6. Display results in UI with status indicators
7. Optional: Post review as Confluence page comment

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
# Ollama (DNS name via extra_hosts in docker-compose.yml)
# The docker-compose.yml maps hardcore_dijkstra → 172.27.0.3
OLLAMA_BASE_URL=http://hardcore_dijkstra:11434
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

### Review KDD Document

Run Architecture Review Forum 6-prompt assessment on a Confluence KDD page.

```bash
POST /kdd/review
Content-Type: application/json

{
  "pageId": "1671169",
  "autoPost": false
}
```

Response:
```json
{
  "success": true,
  "pageId": "1671169",
  "pageTitle": "KDD: OAuth2 Implementation",
  "review": {
    "overallRating": "Acceptable",
    "forumReady": "Conditional",
    "sections": {
      "completeness": {
        "status": "NEEDS_SHARPENING",
        "findings": ["⚠️ MISSING: Risk mitigation section"],
        "suggestions": ["Add detailed risk mitigation strategies"]
      },
      "clarity": {
        "status": "CLEAR",
        "findings": [],
        "suggestions": []
      },
      "outcome": {
        "status": "NEEDS_SHARPENING",
        "findings": ["🟡 VAGUE OUTCOME: 'Improve performance' needs metrics"],
        "suggestions": ["Define specific KPIs: 'Reduce API latency by 50%'"]
      },
      "stakeholder": {
        "status": "CLEAR",
        "findings": [],
        "suggestions": []
      },
      "abbreviations": {
        "status": "NEEDS_SHARPENING",
        "findings": ["🟡 JARGON RISK: 'IdP' may confuse non-technical readers"],
        "suggestions": ["Expand 'IdP' to 'Identity Provider (IdP)' on first use"]
      },
      "fullRead": {
        "status": "NEEDS_SHARPENING",
        "findings": ["Overall quality acceptable but needs work"],
        "suggestions": ["Complete sections flagged above"]
      }
    },
    "criticalGaps": [
      "Missing risk mitigation section",
      "Outcomes need specific metrics"
    ],
    "requiredInputs": [
      { "item": "Security review sign-off", "provider": "Security Team Lead" }
    ],
    "recommendations": [
      { "section": "Risks", "recommendation": "Add detailed mitigation strategies for each risk" }
    ],
    "forumReadinessChecklist": [
      { "item": "Document peer-reviewed", "status": false },
      { "item": "Alternatives documented", "status": true }
    ]
  },
  "postedToConfluence": false
}
```

### Post Review as Comment

Post AI review results as a Confluence page comment.

```bash
POST /kdd/review-and-comment
Content-Type: application/json

{
  "pageId": "1671169",
  "reviewResults": {
    "overallRating": "Acceptable",
    "forumReady": "Conditional",
    "sections": { ... },
    "criticalGaps": [...],
    "requiredInputs": [...],
    "recommendations": [...],
    "forumReadinessChecklist": [...]
  }
}
```

Response:
```json
{
  "success": true,
  "pageId": "1671169",
  "message": "Review posted as comment successfully"
}
```

### Create KDD with Auto-Review

Create a KDD and optionally run automatic review.

```bash
POST /kdd/create?autoReview=true
Content-Type: application/json

{
  "title": "KDD: OAuth2 Implementation",
  "problem": "Current authentication system lacks SSO support",
  "goals": ["Enable single sign-on"],
  "proposedSolution": "Implement OAuth2 with Azure AD",
  "alternatives": ["SAML 2.0", "LDAP"],
  "risks": ["Migration complexity"],
  "timeline": "Q2 2024"
}
```

Response:
```json
{
  "success": true,
  "pageId": "234567",
  "title": "KDD: OAuth2 Implementation",
  "url": "https://.../pages/viewpage.action?pageId=234567",
  "spaceKey": "SD",
  "parentPageId": "123456",
  "review": { ... },
  "autoReviewEnabled": true
}
```

### Search Confluence (Legacy)

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

## Web UI

The application includes a built-in web interface accessible at `http://localhost:2304`.

### Features

1. **Problem Statement Refiner**
   - Enter rough problem statements
   - Choose refinement style (Unified, Per-Stakeholder, Structured)
   - Search Confluence for context
   - Review AI-refined statements

2. **KDD Draft Creation**
   - Auto-populated fields from AI analysis
   - Manual editing capabilities
   - One-click creation in Confluence

3. **KDD Review (Architecture Review Forum)**
   - Direct access from home page: "🏛️ Review Existing KDD Document"
   - Enter Confluence page ID or full URL
   - Run 6-prompt AI assessment
   - View results with status indicators:
     - ✅ CLEAR: Section meets standards
     - 🟡 NEEDS_SHARPENING: Present but needs improvement
     - 🔴 MISSING: Required content not found
     - ⚠️ RISK: Potential issues identified
   - Post review as Confluence comment

### Usage Flow

**To Review a KDD:**
1. Click "🏛️ Review Existing KDD Document" on home page
2. Enter Confluence page ID (e.g., `1671169`) or paste full URL
3. Click "🔍 Review KDD"
4. Wait 30-60 seconds for AI analysis (6 prompts run sequentially)
5. Review results showing:
   - Overall Rating (Poor/Needs Work/Acceptable/Strong)
   - Forum Ready status (Yes/No/Conditional)
   - Critical gaps requiring attention
   - Per-section analysis with findings and suggestions
6. Click "📤 Post Review as Comment" to save to Confluence (optional)

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

# Test KDD review (takes ~30-60s)
curl -X POST http://localhost:2304/kdd/review \
  -H "Content-Type: application/json" \
  -d '{"pageId": "1671169"}'

# Test KDD review with auto-post to Confluence
curl -X POST http://localhost:2304/kdd/review \
  -H "Content-Type: application/json" \
  -d '{"pageId": "1671169", "autoPost": true}'

# Test review and comment (separate endpoint)
curl -X POST http://localhost:2304/kdd/review-and-comment \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "1671169",
    "reviewResults": {
      "overallRating": "Acceptable",
      "forumReady": "Conditional",
      "sections": { ... }
    }
  }'

# Test KDD creation with auto-review
curl -X POST "http://localhost:2304/kdd/create?autoReview=true" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "KDD: Test",
    "problem": "Test problem",
    "goals": ["Goal 1"],
    "proposedSolution": "Solution",
    "alternatives": ["Alt 1"],
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
# Verify Ollama container is running
docker ps | grep ollama

# Test DNS resolution from confluence-kdd-agent container
docker exec confluence-kdd-agent cat /etc/hosts | grep hardcore

# Test connectivity using DNS name
docker exec confluence-kdd-agent curl -s http://hardcore_dijkstra:11434/api/version

# Test with IP directly (should match the extra_hosts mapping)
docker exec confluence-kdd-agent curl -s http://172.27.0.3:11434/api/version

# Verify Ollama has the model loaded
curl http://hardcore_dijkstra:11434/api/tags | grep qwen
```

**DNS Configuration:**
The `docker-compose.yml` uses `extra_hosts` to map the DNS name `hardcore_dijkstra` to the Ollama container IP:
```yaml
extra_hosts:
  - "hardcore_dijkstra:172.27.0.3"
```

If the Ollama container IP changes, update the `extra_hosts` mapping or restart both containers to ensure they're on the same network.

### KDD Review Timeout Issues

If KDD review fails with timeout errors:

```bash
# Check Ollama is responding within timeout (60s per prompt)
docker exec confluence-kdd-agent curl -s --max-time 65 http://hardcore_dijkstra:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3","prompt":"test","stream":false}'
```

**Performance Tips:**
- Reviews run 6 prompts sequentially (not parallel) to avoid overwhelming Ollama
- Each prompt has a 60-second timeout
- Content is truncated to 6000 characters for faster processing
- Total review time: ~30-60 seconds depending on Ollama load

### Confluence API Errors

- Verify API token hasn't expired
- Check email matches Atlassian account
- Ensure space key exists and is accessible
- Verify parent page ID exists in the space

## License

MIT
