import DOMPurify from 'dompurify';

// KaTeX-specific tags and attributes that DOMPurify must allow
const KATEX_TAGS = [
  'math', 'annotation', 'semantics',
  'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'msubsup',
  'mfrac', 'munder', 'mover', 'munderover', 'msqrt', 'mroot',
  'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'mpadded',
  'menclose', 'mglyph', 'mmultiscripts', 'mprescripts', 'none',
  'span', // KaTeX uses many nested spans
];
const KATEX_ATTR = ['encoding', 'xmlns', 'mathvariant', 'stretchy', 'fence', 'separator', 'accent', 'lspace', 'rspace', 'depth', 'height', 'width', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing', 'displaystyle', 'scriptlevel', 'minsize', 'maxsize', 'movablelimits', 'columnlines', 'rowlines', 'frame', 'framespacing', 'equalrows', 'equalcolumns', 'side', 'style', 'class', 'aria-hidden'];

/**
 * Sanitizes raw HTML string using DOMPurify.
 * This MUST run in a browser environment (Main Thread) where DOM is available.
 * 
 * @param rawHtml Unsafe HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(rawHtml: string): string {
  if (typeof window === 'undefined') return rawHtml; // Safety for SSR/Node
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: KATEX_TAGS,
    ADD_ATTR: KATEX_ATTR,
  });
}

/**
 * Renders KaTeX math expressions in a given DOM container.
 * Looks for elements with class `math-inline` and `math-display` produced by remark-math + remark-rehype.
 * 
 * Must run on the main thread where DOM + KaTeX are available.
 * 
 * @param container The DOM element containing the HTML to process
 */
export function renderMathInContainer(container: HTMLElement): void {
  try {
    // Import KaTeX's auto-render (available from the katex npm package)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const renderMathInElement = (window as any).__renderMathInElement;
    if (renderMathInElement) {
      renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      });
      return;
    }

    // Fallback: manually find math nodes from remark-math output and render with KaTeX API
    const katex = (window as any).katex;
    if (!katex) return;

    // remark-math + remark-rehype produces:
    //   Inline: <code class="language-math math-inline">...</code>
    //   Block:  <pre><code class="language-math math-display">...</code></pre>
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
