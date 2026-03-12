/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { preprocessMarkdown } from '../lib/markdownPreprocess';

describe('markdownPreprocess highlight behavior', () => {
  it('transforms ==highlight== in normal text', () => {
    const output = preprocessMarkdown('This is ==important== text');
    expect(output).toContain('<mark>important</mark>');
  });

  it('does not transform ==...== inside fenced code blocks', () => {
    const input = [
      'Before ==yes==',
      '```ts',
      'const x = "==no==";',
      '```',
      'After ==yes2==',
    ].join('\n');

    const output = preprocessMarkdown(input);
    expect(output).toContain('Before <mark>yes</mark>');
    expect(output).toContain('const x = "==no==";');
    expect(output).toContain('After <mark>yes2</mark>');
  });

  it('does not transform ==...== inside inline code spans', () => {
    const input = 'Inline `code ==no==` and ==yes== outside';
    const output = preprocessMarkdown(input);
    expect(output).toContain('`code ==no==`');
    expect(output).toContain('<mark>yes</mark> outside');
  });

  it('does not transform ==...== inside indented code blocks', () => {
    const input = [
      '    const x = "==no==";',
      'Normal ==yes==',
    ].join('\n');

    const output = preprocessMarkdown(input);
    expect(output).toContain('    const x = "==no==";');
    expect(output).toContain('Normal <mark>yes</mark>');
  });
});
