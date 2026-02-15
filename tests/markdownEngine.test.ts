import { describe, it, expect } from 'vitest';
import { processMarkdown } from '../lib/markdownEngine';

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

  it('should render inline math', async () => {
    const input = 'Equation: $E=mc^2$';
    const output = await processMarkdown(input);
    expect(output).toContain('katex');
    expect(output).toContain('E=mc^2'); 
  });

  it('should render block math', async () => {
    const input = '$$\nx^2\n$$';
    const output = await processMarkdown(input);
    expect(output).toContain('katex-display');
  });

  it('should apply syntax highlighting classes', async () => {
    const input = '```javascript\nconst a = 1;\n```';
    const output = await processMarkdown(input);
    // highlight.js adds 'hljs' and specific classes like 'language-javascript' or 'keyword'
    expect(output).toContain('hljs');
    expect(output).toContain('language-javascript');
  });

  it('should preserve mermaid code blocks for client rendering', async () => {
    const input = '```mermaid\ngraph TD;\nA-->B;\n```';
    const output = await processMarkdown(input);
    // Should still contain the code block with the class, not stripped out
    expect(output).toContain('language-mermaid');
    // It should NOT contain raw SVG yet (as that happens in the component)
    expect(output).toContain('graph TD');
  });

  it('should sanitize HTML input', async () => {
    const input = 'Hello <script>alert("XSS")</script>';
    const output = await processMarkdown(input);
    expect(output).toContain('Hello');
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('alert');
  });
});
