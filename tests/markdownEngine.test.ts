/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../lib/markdownEngine';
import { parseMarkdown } from '../lib/markdownParser';
import { transformCallouts } from '../lib/markdownEngine';

// Helper to compose parser and sanitizer for tests
async function processMarkdown(content: string): Promise<string> {
  const raw = await parseMarkdown(content);
  return sanitizeHtml(raw);
}

describe('Markdown Engine', () => {

  it('should render basic markdown correctly', async () => {
    const input = '# Hello World';
    const output = await processMarkdown(input);
    expect(output).toContain('<h1>Hello World</h1>');
  });

  it('should render GFM tables', async () => {
    const input = `
| h1 | h2 |
| -- | -- |
| c1 | c2 |
`;
    const output = await processMarkdown(input);
    expect(output).toContain('<table>');
    expect(output).toContain('<th>h1</th>');
    expect(output).toContain('<td>c1</td>');
  });

  it('should render inline math as code nodes for client-side KaTeX', async () => {
    const input = 'Equation: $E=mc^2$';
    const output = await processMarkdown(input);
    // remark-math + remark-rehype produces <code class="language-math math-inline">
    expect(output).toContain('math-inline');
    expect(output).toContain('E=mc^2');
  });

  it('should render block math as code nodes for client-side KaTeX', async () => {
    const input = '$$\nx^2\n$$';
    const output = await processMarkdown(input);
    // remark-math + remark-rehype produces <code class="language-math math-display">
    expect(output).toContain('math-display');
  });

  it('should apply syntax highlighting classes', async () => {
    const input = '```javascript\nconst a = 1;\n```';
    const output = await processMarkdown(input);
    // rehype-highlight adds 'hljs' and specific language classes
    expect(output).toContain('hljs');
    expect(output).toContain('language-javascript');
  });

  it('should preserve mermaid code blocks for client rendering', async () => {
    const input = '```mermaid\ngraph TD;\nA-->B;\n```';
    const output = await processMarkdown(input);
    expect(output).toContain('language-mermaid');
    expect(output).toContain('graph TD');
  });

  it('should sanitize HTML input', async () => {
    const input = 'Hello <script>alert("XSS")</script>';
    const output = await processMarkdown(input);
    expect(output).toContain('Hello');
    expect(output).not.toContain('<script>');
  });

  it('should preserve mkimg URLs for internal image rendering', async () => {
    const input = '![alt](mkimg://internal-123)';
    const output = await processMarkdown(input);
    expect(output).toContain('src="mkimg://internal-123"');
  });

  it('should apply type-specific callout colors', () => {
    const container = document.createElement('div');
    container.innerHTML = '<blockquote><p>[!success] Done</p></blockquote><blockquote><p>[!error] Boom</p></blockquote>';

    transformCallouts(container);

    const callouts = container.querySelectorAll('.callout');
    expect(callouts.length).toBe(2);

    const successTitle = callouts[0].querySelector('.callout-title') as HTMLElement;
    const errorTitle = callouts[1].querySelector('.callout-title') as HTMLElement;

    expect(successTitle.style.color).toBe('rgb(0, 200, 83)');
    expect(errorTitle.style.color).toBe('rgb(255, 23, 68)');
  });
});
