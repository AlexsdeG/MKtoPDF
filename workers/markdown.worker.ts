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
import { preprocessMarkdown } from '../lib/markdownPreprocess';

/**
 * Worker message handler.
 * Receives raw Markdown string, pre-processes it (==mark== syntax), 
 * then parses to HTML and posts back the result (or error).
 */
self.onmessage = async (e: MessageEvent) => {
  const content = e.data;

  // Basic validation
  if (typeof content !== 'string') {
    return;
  }

  try {
    // Pre-process ==highlight== syntax before parsing
    const preprocessed = preprocessMarkdown(content);
    const rawHtml = await parseMarkdown(preprocessed);
    self.postMessage({ type: 'success', html: rawHtml });
  } catch (error) {
    self.postMessage({ type: 'error', message: (error as Error).message });
  }
};
