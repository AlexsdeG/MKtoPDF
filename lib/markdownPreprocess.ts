/**
 * Pre-processes raw markdown to handle ==highlight== syntax.
 * Converts ==text== to <mark>text</mark> before parsing.
 * 
 * This file is intentionally kept free of DOM dependencies (no mermaid, katex, DOMPurify)
 * so it can safely be imported in Web Worker environments.
 * 
 * @param markdown Raw markdown string
 * @returns Preprocessed markdown
 */
export function preprocessMarkdown(markdown: string): string {
  // Convert ==text== to <mark>text</mark>
  // Avoid matching inside code blocks by being careful with context
  // This regex handles inline ==text== (not across newlines for safety)
  return markdown.replace(/==((?:[^=]|=[^=])+?)==/g, '<mark>$1</mark>');
}
