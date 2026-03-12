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
  const lines = markdown.split('\n');
  let inFence = false;
  let fenceChar: '`' | '~' | null = null;
  let fenceLen = 0;

  const transformed = lines.map((line) => {
    // Fenced code blocks: ``` or ~~~ (up to 3 leading spaces)
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const markerChar = marker[0] as '`' | '~';

      if (!inFence) {
        inFence = true;
        fenceChar = markerChar;
        fenceLen = marker.length;
      } else if (markerChar === fenceChar && marker.length >= fenceLen) {
        inFence = false;
        fenceChar = null;
        fenceLen = 0;
      }

      return line;
    }

    // Keep everything inside fenced blocks unchanged.
    if (inFence) {
      return line;
    }

    // Indented code blocks (4 spaces or a tab).
    if (/^(?:\t| {4})/.test(line)) {
      return line;
    }

    return replaceHighlightsOutsideInlineCode(line);
  });

  return transformed.join('\n');
}

function replaceHighlightsOutsideInlineCode(line: string): string {
  const transformHighlights = (text: string) => text.replace(/==((?:[^=]|=[^=])+?)==/g, '<mark>$1</mark>');

  let result = '';
  let textSegment = '';
  let i = 0;

  while (i < line.length) {
    if (line[i] !== '`') {
      textSegment += line[i];
      i += 1;
      continue;
    }

    // Flush plain text and transform highlights there only.
    result += transformHighlights(textSegment);
    textSegment = '';

    const start = i;
    let ticks = 0;
    while (i < line.length && line[i] === '`') {
      ticks += 1;
      i += 1;
    }

    const fence = '`'.repeat(ticks);
    const closeIdx = line.indexOf(fence, i);

    if (closeIdx === -1) {
      // Unclosed backticks: keep as-is and stop processing this line.
      result += line.slice(start);
      return result;
    }

    result += line.slice(start, closeIdx + ticks);
    i = closeIdx + ticks;
  }

  result += transformHighlights(textSegment);
  return result;
}
