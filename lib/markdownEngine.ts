import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { CALLOUT_TYPES, resolveCalloutType, StyleSettings, DEFAULT_STYLE_SETTINGS } from './styleSettings';

// KaTeX-specific tags and attributes that DOMPurify must allow
const KATEX_TAGS = [
  'math', 'annotation', 'semantics',
  'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'msubsup',
  'mfrac', 'munder', 'mover', 'munderover', 'msqrt', 'mroot',
  'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'mpadded',
  'menclose', 'mglyph', 'mmultiscripts', 'mprescripts', 'none',
  'span', // KaTeX uses many nested spans
  'mark', // Highlight syntax ==text==
  // Rich text HTML tags
  'u', 'sub', 'sup', 'font', 'br',
  'div', 'p',
  // Callout structure tags
  'section',
];
const ALLOWED_ATTR = [
  'encoding', 'xmlns', 'mathvariant', 'stretchy', 'fence', 'separator',
  'accent', 'lspace', 'rspace', 'depth', 'height', 'width',
  'columnalign', 'rowalign', 'columnspacing', 'rowspacing',
  'displaystyle', 'scriptlevel', 'minsize', 'maxsize', 'movablelimits',
  'columnlines', 'rowlines', 'frame', 'framespacing',
  'equalrows', 'equalcolumns', 'side',
  'style', 'class', 'id', 'aria-hidden',
  'data-callout', 'data-callout-type', 'data-protected',
  'color', // for <font color>
  'size',  // for <font size>
  'face',  // for <font face>
];

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

/**
 * Pre-processes raw markdown to handle ==highlight== syntax.
 * Converts ==text== to <mark>text</mark> before parsing.
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

/**
 * Sanitizes raw HTML string using DOMPurify.
 * This MUST run in a browser environment (Main Thread) where DOM is available.
 * 
 * Mermaid and math code blocks are protected from sanitization because they
 * contain syntax (like -->) that DOMPurify misinterprets as HTML.
 * 
 * @param rawHtml Unsafe HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(rawHtml: string): string {
  if (typeof window === 'undefined') return rawHtml; // Safety for SSR/Node

  // 1. Extract code blocks that DOMPurify would destroy
  //    Mermaid code contains --> which looks like HTML to DOMPurify
  const placeholders: Map<string, string> = new Map();
  let counter = 0;

  const protectedHtml = rawHtml.replace(
    /<pre><code class="language-(mermaid|math[^"]*)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang, content) => {
      const id = `__PROTECTED_BLOCK_${counter++}__`;
      placeholders.set(id, `<pre><code class="language-${lang}">${content}</code></pre>`);
      // Wrap in <div> to prevent DOMPurify from nesting placeholder inside <p>
      // (which would make the restored <pre> invalid HTML: <p><pre>...</pre></p>)
      return `<div data-protected="${id}"></div>`;
    }
  );

  // 2. Sanitize the rest
  let clean = DOMPurify.sanitize(protectedHtml, {
    ADD_TAGS: KATEX_TAGS,
    ADD_ATTR: ALLOWED_ATTR,
  });

  // 3. Restore protected blocks by replacing the <div> placeholders
  placeholders.forEach((original, id) => {
    clean = clean.replace(`<div data-protected="${id}"></div>`, original);
  });

  return clean;
}

import renderMathInElement from 'katex/contrib/auto-render';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders KaTeX math expressions in a given DOM container.
 * Looks for elements with class `math-inline` and `math-display` produced by remark-math + remark-rehype.
 * 
 * Must run on the main thread where DOM is available.
 * 
 * @param container The DOM element containing the HTML to process
 */
export function renderMathInContainer(container: HTMLElement): void {
  try {
    // 1. Use auto-render for delimiters if they exist in text nodes (less likely with remark-math but good fallback)
    renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false,
    });

    // 2. Explicitly handle remark-math output which puts math in <code> tags
    // remark-math + remark-rehype produces:
    //   Inline: <code class="language-math math-inline">...</code>
    //   Block:  <pre><code class="language-math math-display">...</code></pre>

    // Inline math
    const mathInline = container.querySelectorAll('code.math-inline');
    mathInline.forEach((el) => {
      const tex = el.textContent || '';
      const span = document.createElement('span');
      try {
        katex.render(tex, span, { throwOnError: false, displayMode: false });
        el.replaceWith(span);
      } catch (e) {
        console.warn('KaTeX inline render failed:', e);
      }
    });

    // Display math
    const mathDisplay = container.querySelectorAll('code.math-display');
    mathDisplay.forEach((el) => {
      const tex = el.textContent || '';
      const div = document.createElement('div');
      div.className = 'katex-display';
      const pre = el.parentElement;
      try {
        katex.render(tex, div, { throwOnError: false, displayMode: true });
        if (pre && pre.tagName === 'PRE') {
          pre.replaceWith(div);
        } else {
          el.replaceWith(div);
        }
      } catch (e) {
        console.warn('KaTeX display render failed:', e);
      }
    });

  } catch (error) {
    console.error('KaTeX rendering error:', error);
  }
}

/**
 * Transforms blockquote elements that use Obsidian callout syntax
 * (e.g. > [!note] Title) into styled callout HTML structures.
 * 
 * @param container The DOM element to process
 * @param settings Style settings for callout colors
 */
export function transformCallouts(container: HTMLElement, settings?: StyleSettings): void {
  const currentSettings = settings || DEFAULT_STYLE_SETTINGS;
  const blockquotes = container.querySelectorAll('blockquote');

  blockquotes.forEach((bq) => {
    // Get the first paragraph or text content
    const firstP = bq.querySelector('p:first-child');
    if (!firstP) return;

    const textContent = firstP.innerHTML;
    // Match [!type] or [!type] Title
    const calloutMatch = textContent.match(/^\s*\[!([\w-]+)\]\s*(.*)/);
    if (!calloutMatch) return;

    const rawType = calloutMatch[1];
    const titleText = calloutMatch[2] || rawType;
    const resolvedType = resolveCalloutType(rawType);
    const typeDef = CALLOUT_TYPES[resolvedType] || CALLOUT_TYPES.note;

    // Check for custom color override
    const color = currentSettings.calloutColors[resolvedType] || typeDef.color;

    // Build callout structure
    const callout = document.createElement('div');
    callout.className = 'callout';
    callout.setAttribute('data-callout', resolvedType);
    callout.style.setProperty('--callout-color', color);

    // Title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'callout-title';
    titleDiv.innerHTML = `
      <span class="callout-icon">${typeDef.icon}</span>
      <span class="callout-title-text">${titleText || resolvedType.charAt(0).toUpperCase() + resolvedType.slice(1)}</span>
    `;

    // Content — everything after the first [!type] line
    const contentDiv = document.createElement('div');
    contentDiv.className = 'callout-content';

    // Remove the callout syntax from the first paragraph
    const remainingFirstP = textContent.replace(/^\s*\[![\w-]+\]\s*[^\n]*/, '').trim();
    
    // Collect all children except the first paragraph
    const children = Array.from(bq.childNodes);
    children.forEach((child, index) => {
      if (index === 0 && child === firstP) {
        // Add remaining text from first paragraph if any
        if (remainingFirstP) {
          const p = document.createElement('p');
          p.innerHTML = remainingFirstP;
          contentDiv.appendChild(p);
        }
      } else {
        contentDiv.appendChild(child.cloneNode(true));
      }
    });

    callout.appendChild(titleDiv);
    if (contentDiv.childNodes.length > 0) {
      callout.appendChild(contentDiv);
    }

    // Replace the blockquote with the callout
    bq.replaceWith(callout);
  });
}

// Keep a counter for unique mermaid IDs
let mermaidIdCounter = 0;

/**
 * Renders mermaid code blocks into SVG diagrams.
 * 
 * @param container The DOM element to process
 */
export async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  const mermaidBlocks = container.querySelectorAll('code.language-mermaid');

  for (const block of Array.from(mermaidBlocks)) {
    const pre = block.parentElement;
    if (!pre || pre.tagName !== 'PRE') continue;

    const source = block.textContent || '';
    if (!source.trim()) continue;

    try {
      const id = `mermaid-${Date.now()}-${mermaidIdCounter++}`;
      const { svg } = await mermaid.render(id, source.trim());
      
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.innerHTML = svg;

      pre.replaceWith(wrapper);
    } catch (err) {
      console.warn('Mermaid render failed:', err);
      // Leave the code block as-is on failure
    }
  }
}

/**
 * Adds language labels to code blocks that have a specified language.
 * Wraps <pre><code class="language-xxx"> blocks in a container with a label.
 * Skips mermaid and math blocks.
 * 
 * @param container The DOM element to process
 */
export function addCodeLanguageLabels(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll('pre > code[class*="language-"]');

  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.tagName !== 'PRE') return;

    // Extract language from class
    const classMatch = code.className.match(/language-(\S+)/);
    if (!classMatch) return;

    const lang = classMatch[1];

    // Skip mermaid and math blocks (they are handled separately)
    if (lang === 'mermaid' || lang.startsWith('math')) return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    // Create label
    const label = document.createElement('span');
    label.className = 'code-language-label';
    label.textContent = lang;

    // Wrap the pre element
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(label);
    wrapper.appendChild(pre);
  });
}

/**
 * Full post-processing pipeline for rendered HTML.
 * Runs all DOM transformations: callouts, mermaid, code labels, math.
 * Call this after setting innerHTML on the preview container.
 * 
 * @param container The DOM element containing the rendered HTML
 * @param settings Optional style settings
 */
export async function postProcessHtml(container: HTMLElement, settings?: StyleSettings): Promise<void> {
  // Order matters: callouts first (transform blockquotes), then mermaid, then code labels, then math
  transformCallouts(container, settings);
  await renderMermaidDiagrams(container);
  addCodeLanguageLabels(container);
  renderMathInContainer(container);
}
