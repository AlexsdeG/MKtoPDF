import { parseMarkdown } from '../lib/markdownEngine';

/**
 * Worker message handler.
 * Receives raw Markdown string, processes it, and posts back the result (or error).
 */
self.onmessage = async (e: MessageEvent) => {
  const content = e.data;
  
  // Basic validation
  if (typeof content !== 'string') {
    return;
  }

  try {
    const rawHtml = await parseMarkdown(content);
    self.postMessage({ type: 'success', html: rawHtml });
  } catch (error) {
    self.postMessage({ type: 'error', message: (error as Error).message });
  }
};
