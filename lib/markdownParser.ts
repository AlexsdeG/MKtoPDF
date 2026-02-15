/**
 * Transforms Markdown to raw HTML string.
 * This function runs in a Worker (no DOM). KaTeX rendering is deferred to the main thread.
 * 
 * @param content Raw markdown string
 * @returns Promise that resolves to raw HTML string
 */
export async function parseMarkdown(content: string): Promise<string> {
    try {
        if (!content) return "";

        const { unified } = await import('unified');
        const { default: remarkParse } = await import('remark-parse');
        const { default: remarkGfm } = await import('remark-gfm');
        const { default: remarkMath } = await import('remark-math');
        const { default: remarkRehype } = await import('remark-rehype');
        const { default: rehypeHighlight } = await import('rehype-highlight');
        const { default: rehypeStringify } = await import('rehype-stringify');

        const file = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkMath)
            .use(remarkRehype, { allowDangerousHtml: true })
            // rehype-highlight has no DOM dependency — safe for Worker
            .use(rehypeHighlight, { ignoreMissing: true, plainText: ['mermaid', 'math'] } as any)
            // NOTE: rehype-katex removed — it requires DOM. KaTeX renders on main thread.
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
