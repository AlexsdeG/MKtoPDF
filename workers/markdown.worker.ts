/**
 * Worker-side mock for the DOM 'document' object.
 * Some unified dependencies (like decode-named-character-reference) try to use
 * document.createElement('i') to decode HTML entities using the browser's engine.
 * Since workers have no DOM, we provide a minimal mock to prevent crashes.
 */
if (typeof self !== 'undefined' && typeof (self as any).document === 'undefined') {
  (self as any).document = {
    createElement: () => ({
      set innerHTML(v: string) { },
      get textContent() { return ""; }
    })
  };
}

import { parseMarkdown } from '../lib/markdownParser';

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
