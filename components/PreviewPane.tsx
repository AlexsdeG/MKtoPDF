import React, { useEffect, useRef } from 'react';
import { PreviewProps } from '../types';
import mermaid from 'mermaid';
import { renderMathInContainer } from '../lib/markdownEngine';
import { CALLOUT_TYPES, resolveCalloutType, StyleSettings, stylesToCSSVars, DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';

interface ExtendedPreviewProps extends PreviewProps {
  styleSettings?: StyleSettings;
}

/**
 * Escape HTML for safe insertion into innerHTML.
 */
function escapeHtml(unsafe: string): string {
  return unsafe.replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&apos;' }[m] || m));
}

/**
 * Transform Obsidian-style callout blockquotes into styled callout divs.
 * Looks for blockquotes whose first text starts with [!type]
 */
function transformCallouts(container: HTMLElement, settings: StyleSettings): void {
  const blockquotes = container.querySelectorAll('blockquote');

  blockquotes.forEach((bq) => {
    const firstChild = bq.firstElementChild;
    if (!firstChild) return;

    // Get the text content of the first element (usually a <p>)
    const firstText = firstChild.innerHTML || '';

    // Match [!type] with optional title
    const calloutMatch = firstText.match(/^\s*\[!([\w-]+)\]\s*(.*)/);
    if (!calloutMatch) return;

    const rawType = calloutMatch[1];
    const resolvedType = resolveCalloutType(rawType);
    const typeDef = CALLOUT_TYPES[resolvedType] || CALLOUT_TYPES.note;

    // Use custom color from settings if available, otherwise use default
    const color = settings.calloutColors[resolvedType] || typeDef.color;

    // Title: either the inline title from [!type] Title, or the capitalized type
    const titleText = calloutMatch[2]?.trim() || resolvedType.charAt(0).toUpperCase() + resolvedType.slice(1);

    // Remove the [!type] line from the first child and collect the rest
    const remainingFirstContent = firstText.replace(/^\s*\[![\w-]+\]\s*[^\n]*/, '').trim();

    // Build callout HTML
    const calloutDiv = document.createElement('div');
    calloutDiv.className = `callout callout-${resolvedType}`;
    calloutDiv.style.setProperty('--callout-color', color);

    // Title row
    const titleDiv = document.createElement('div');
    titleDiv.className = 'callout-title';
    titleDiv.innerHTML = `<span class="callout-icon">${typeDef.icon}</span><span class="callout-title-text">${escapeHtml(titleText)}</span>`;

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'callout-content';

    // If there's remaining content in the first paragraph, add it
    if (remainingFirstContent) {
      const p = document.createElement('p');
      p.innerHTML = remainingFirstContent;
      contentDiv.appendChild(p);
    }

    // Move all child elements except the first one into content
    const children = Array.from(bq.children);
    for (let i = 1; i < children.length; i++) {
      contentDiv.appendChild(children[i].cloneNode(true));
    }

    calloutDiv.appendChild(titleDiv);
    if (contentDiv.childNodes.length > 0) {
      calloutDiv.appendChild(contentDiv);
    }

    bq.replaceWith(calloutDiv);
  });
}

/**
 * Transform ==text== highlight syntax into <mark> tags.
 * Runs after HTML is set in the DOM since remark doesn't handle this natively.
 */
function transformHighlights(container: HTMLElement): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    if (node.nodeValue && node.nodeValue.includes('==')) {
      textNodes.push(node);
    }
  }

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue || '';
    if (!text.match(/==[^=]+==/)) return;

    const fragment = document.createDocumentFragment();
    const parts = text.split(/(==[^=]+=={1,2})/g);

    parts.forEach((part) => {
      const highlightMatch = part.match(/^==([^=]+)==$/);
      if (highlightMatch) {
        const mark = document.createElement('mark');
        mark.textContent = highlightMatch[1];
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

export const PreviewPane: React.FC<ExtendedPreviewProps> = ({ htmlContent, styleSettings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = styleSettings || DEFAULT_STYLE_SETTINGS;

  useEffect(() => {
    // Initialize mermaid configuration once
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
    } catch (e) {
      console.warn('Mermaid initialization failed:', e);
    }

    const renderContent = async () => {
      if (!containerRef.current) return;

      // 1. Transform ==highlight== syntax
      transformHighlights(containerRef.current);

      // 2. Transform Obsidian callouts  
      transformCallouts(containerRef.current, settings);

      // 3. Render KaTeX math expressions
      try {
        renderMathInContainer(containerRef.current);
      } catch (error) {
        console.error('KaTeX rendering failed:', error);
      }

      // 4. Render Mermaid diagrams
      const mermaidBlocks = containerRef.current.querySelectorAll('code.language-mermaid, code.mermaid');

      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const preElement = block.parentElement;

        if (preElement && preElement.tagName === 'PRE') {
          const codeContent = block.textContent || '';
          const uniqueId = `mermaid-${i}-${Date.now()}`;

          const div = document.createElement('div');
          div.className = 'mermaid-diagram';
          div.id = uniqueId;

          preElement.replaceWith(div);

          try {
            await mermaid.parse(codeContent);
            const { svg } = await mermaid.render(uniqueId, codeContent);
            div.innerHTML = svg;
          } catch (error: any) {
            const errorMessage = error?.message || error?.str || String(error);

            div.innerHTML = `
              <div class="callout callout-danger" style="--callout-color: #ff1744;">
                <div class="callout-title">
                  <span class="callout-icon">⛔</span>
                  <span class="callout-title-text">Mermaid Syntax Error</span>
                </div>
                <div class="callout-content">
                  <pre style="font-size: 0.85em; white-space: pre-wrap; margin: 0;">${escapeHtml(errorMessage)}</pre>
                  <details style="margin-top: 0.5em; font-size: 0.8em; opacity: 0.7; cursor: pointer;">
                    <summary>Show Source</summary>
                    <pre style="margin-top: 0.5em;">${escapeHtml(codeContent)}</pre>
                  </details>
                </div>
              </div>
            `;
          }
        }
      }
    };

    const timer = setTimeout(renderContent, 0);
    return () => clearTimeout(timer);
  }, [htmlContent, settings]);

  // Build CSS custom properties from style settings
  const cssVars = stylesToCSSVars(settings);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 flex justify-between items-center">
        <span>PREVIEW</span>
        <span className="text-xs text-gray-500">Live Updates</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 w-full p-8 overflow-auto prose-preview"
        style={cssVars as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
