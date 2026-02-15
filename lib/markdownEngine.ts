import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'dompurify';

/**
 * Transforms Markdown to raw HTML string.
 * This function does NOT sanitize HTML. It is intended to run in a Worker or Node environment.
 * 
 * @param content Raw markdown string
 * @returns Promise that resolves to raw HTML string
 */
export async function parseMarkdown(content: string): Promise<string> {
  try {
    if (!content) return "";

    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      // Fix: Cast options to any to resolve TypeScript error regarding ignoreMissing property
      .use(rehypeHighlight, { ignoreMissing: true } as any) 
      .use(rehypeStringify)
      .process(content);

    return String(file);
  } catch (error) {
    console.error("Markdown parsing error:", error);
    // Return a visible error block in the HTML output
    return `<div style="color: red; border: 1px solid red; padding: 1rem;">
      <strong>Processing Error:</strong> ${(error as Error).message}
    </div>`;
  }
}

/**
 * Sanitizes raw HTML string using DOMPurify.
 * This MUST run in a browser environment (Main Thread) where DOM is available.
 * 
 * @param rawHtml Unsafe HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(rawHtml: string): string {
  if (typeof window === 'undefined') return rawHtml; // Safety for SSR/Node
  return DOMPurify.sanitize(rawHtml);
}

/**
 * Legacy wrapper for backward compatibility and testing.
 * Runs the full pipeline on the main thread.
 */
export async function processMarkdown(content: string): Promise<string> {
  const raw = await parseMarkdown(content);
  return sanitizeHtml(raw);
}
