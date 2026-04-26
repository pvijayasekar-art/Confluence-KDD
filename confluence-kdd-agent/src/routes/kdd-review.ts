import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConfluenceService } from '../services/confluence.js';
import type { KddReviewService } from '../services/kdd-review.js';
import type { KddReviewResult } from '../types.js';
import { ValidationError } from '../utils/errors.js';

const reviewRequestSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  autoPost: z.boolean().optional(),
});

const reviewAndCommentSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  reviewResults: z.object({
    overallRating: z.enum(['Poor', 'Needs Work', 'Acceptable', 'Strong']),
    forumReady: z.enum(['Yes', 'No', 'Conditional']),
    sections: z.object({
      completeness: z.object({
        status: z.enum(['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION']),
        findings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
      clarity: z.object({
        status: z.enum(['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION']),
        findings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
      outcome: z.object({
        status: z.enum(['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION']),
        findings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
      stakeholder: z.object({
        status: z.enum(['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION']),
        findings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
      abbreviations: z.object({
        status: z.enum(['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION']),
        findings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
      fullRead: z.object({
        status: z.enum(['CLEAR', 'NEEDS_SHARPENING', 'MISSING', 'RISK', 'RECOMMENDATION']),
        findings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
    }),
    criticalGaps: z.array(z.string()),
    requiredInputs: z.array(z.object({ item: z.string(), provider: z.string() })),
    recommendations: z.array(z.object({ section: z.string(), recommendation: z.string() })),
    forumReadinessChecklist: z.array(z.object({ item: z.string(), status: z.boolean() })),
  }),
});

export async function kddReviewRoutes(
  fastify: FastifyInstance,
  confluenceService: ConfluenceService,
  kddReviewService: KddReviewService
): Promise<void> {
  // Review any KDD page by ID
  fastify.post('/kdd/review', async (request, reply) => {
    const parseResult = reviewRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const { pageId, autoPost } = parseResult.data;

    try {
      // Fetch the page content
      const pageContent = await confluenceService.getPageContent(pageId);

      // Run the review
      const reviewResults = await kddReviewService.reviewKdd(pageContent.body, pageContent.title);

      // If autoPost is true, post the review as a comment
      if (autoPost) {
        const comment = formatReviewAsComment(reviewResults);
        await confluenceService.addComment(pageId, comment, 'KDD Architecture Review Feedback');
      }

      return {
        success: true,
        pageId,
        pageTitle: pageContent.title,
        review: reviewResults,
        postedToConfluence: autoPost || false,
      };
    } catch (error) {
      console.error('Failed to review KDD:', error);
      throw new ValidationError(`Failed to review KDD: ${error}`);
    }
  });

  // Post review as a comment to Confluence
  fastify.post('/kdd/review-and-comment', async (request, reply) => {
    const parseResult = reviewAndCommentSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid request: ${errors}`);
    }

    const { pageId, reviewResults } = parseResult.data;

    try {
      const comment = formatReviewAsComment(reviewResults);
      await confluenceService.addComment(pageId, comment, 'KDD Architecture Review Feedback');

      return {
        success: true,
        pageId,
        message: 'Review posted as comment successfully',
      };
    } catch (error) {
      console.error('Failed to post review comment:', error);
      throw new ValidationError(`Failed to post review comment: ${error}`);
    }
  });
}

function formatReviewAsComment(review: KddReviewResult): string {
  const statusEmoji: Record<string, string> = {
    CLEAR: '✅',
    NEEDS_SHARPENING: '🟡',
    MISSING: '🔴',
    RISK: '⚠️',
    RECOMMENDATION: '💡',
  };

  const ratingEmoji: Record<string, string> = {
    Poor: '🔴',
    'Needs Work': '🟡',
    Acceptable: '🟢',
    Strong: '✅',
  };

  const forumReadyEmoji: Record<string, string> = {
    Yes: '✅',
    No: '🔴',
    Conditional: '🟡',
  };

  let comment = `<h2>🏛️ Architecture Review Feedback</h2>

<p><strong>Overall Rating:</strong> ${ratingEmoji[review.overallRating]} ${review.overallRating}</p>
<p><strong>Forum Ready:</strong> ${forumReadyEmoji[review.forumReady]} ${review.forumReady}</p>

<h3>📊 Review Summary</h3>
<table>
<tbody>
<tr>
<th>Section</th>
<th>Status</th>
</tr>
<tr>
<td>1. Completeness & Missing Points</td>
<td>${statusEmoji[review.sections.completeness.status]} ${review.sections.completeness.status}</td>
</tr>
<tr>
<td>2. Sharpness & Clarity</td>
<td>${statusEmoji[review.sections.clarity.status]} ${review.sections.clarity.status}</td>
</tr>
<tr>
<td>3. Outcome Clarity</td>
<td>${statusEmoji[review.sections.outcome.status]} ${review.sections.outcome.status}</td>
</tr>
<tr>
<td>4. Stakeholder Understandability</td>
<td>${statusEmoji[review.sections.stakeholder.status]} ${review.sections.stakeholder.status}</td>
</tr>
<tr>
<td>5. Abbreviations & Terminology</td>
<td>${statusEmoji[review.sections.abbreviations.status]} ${review.sections.abbreviations.status}</td>
</tr>
<tr>
<td>6. Full Document Read-Through</td>
<td>${statusEmoji[review.sections.fullRead.status]} ${review.sections.fullRead.status}</td>
</tr>
</tbody>
</table>

<h3>🔴 Critical Gaps (Must Fix Before Forum)</h3>
<ul>
${review.criticalGaps.map((gap) => `<li>${escapeXml(gap)}</li>`).join('\n')}
</ul>

<h3>📝 Required Inputs Before Forum</h3>
<table>
<tbody>
<tr>
<th>#</th>
<th>Missing Input</th>
<th>Who Should Provide It</th>
</tr>
${review.requiredInputs.map((input, index) => `
<tr>
<td>${index + 1}</td>
<td>${escapeXml(input.item)}</td>
<td>${escapeXml(input.provider)}</td>
</tr>
`).join('')}
</tbody>
</table>

<h3>💡 Recommended Improvements</h3>
<table>
<tbody>
<tr>
<th>Section</th>
<th>Recommendation</th>
</tr>
${review.recommendations.map((rec) => `
<tr>
<td>${escapeXml(rec.section)}</td>
<td>${escapeXml(rec.recommendation)}</td>
</tr>
`).join('')}
</tbody>
</table>

<h3>📋 Forum Readiness Checklist</h3>
<ul>
${review.forumReadinessChecklist.map((item) => `
<li>${item.status ? '✅' : '🔴'} ${escapeXml(item.item)}</li>
`).join('')}
</ul>

<p><em>This review was generated automatically by the KDD Review Agent.</em></p>`;

  return comment;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
