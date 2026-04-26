import type { KddCreateRequest, KddConfig } from '../types.js';

export class KddTemplateService {
  constructor(private config: KddConfig) {}

  generateKddContent(request: KddCreateRequest): string {
    const status = request.status || this.config.defaultStatus;
    const now = new Date().toISOString().split('T')[0];

    const jiraLinks = request.jiraTickets
      ?.map((ticket) => this.formatJiraLink(ticket))
      .join(', ') || 'None';

    const labels = request.labels?.join(', ') || 'None';

    return `
<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <table>
      <tbody>
        <tr>
          <th style="text-align: left;">Status</th>
          <td><ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">${this.getStatusColor(status)}</ac:parameter><ac:parameter ac:name="title">${this.escapeXml(status)}</ac:parameter></ac:structured-macro></td>
        </tr>
        <tr>
          <th style="text-align: left;">Created</th>
          <td>${now}</td>
        </tr>
        <tr>
          <th style="text-align: left;">Jira Tickets</th>
          <td>${jiraLinks}</td>
        </tr>
        <tr>
          <th style="text-align: left;">Labels</th>
          <td>${labels}</td>
        </tr>
      </tbody>
    </table>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Problem Statement</h2>
<p>${this.escapeXml(request.problem)}</p>

<h2>Goals &amp; Success Metrics</h2>
<ul>
${request.goals.map((goal) => `  <li>${this.escapeXml(goal)}</li>`).join('\n')}
</ul>

<h2>Proposed Solution</h2>
<p>${this.escapeXml(request.proposedSolution)}</p>

<h2>Alternatives Considered</h2>
<table>
  <tbody>
    <tr>
      <th>Alternative</th>
      <th>Pros</th>
      <th>Cons</th>
      <th>Decision</th>
    </tr>
${request.alternatives.map((alt) => `
    <tr>
      <td>${this.escapeXml(alt)}</td>
      <td></td>
      <td></td>
      <td>Rejected</td>
    </tr>
`).join('')}
  </tbody>
</table>

<h2>Risks &amp; Mitigations</h2>
<table>
  <tbody>
    <tr>
      <th>Risk</th>
      <th>Severity</th>
      <th>Mitigation</th>
    </tr>
${request.risks.map((risk) => `
    <tr>
      <td>${this.escapeXml(risk)}</td>
      <td>Medium</td>
      <td></td>
    </tr>
`).join('')}
  </tbody>
</table>

<h2>Timeline</h2>
<p>${this.escapeXml(request.timeline)}</p>

<h2>Related Resources</h2>
<p><strong>Jira Tickets:</strong> ${jiraLinks}</p>
<p><strong>Labels:</strong> ${labels}</p>
    `.trim();
  }

  private formatJiraLink(ticket: string): string {
    // Jira URL is constructed from Confluence config or uses placeholder
    // In production, this should come from config.confluence.baseUrl
    const ticketUpper = ticket.toUpperCase();
    return `<a href="https://your-domain.atlassian.net/browse/${ticketUpper}">${ticketUpper}</a>`;
  }

  private getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved') return 'Green';
    if (statusLower === 'rejected') return 'Red';
    if (statusLower === 'in review') return 'Yellow';
    return 'Grey'; // Draft, default
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
