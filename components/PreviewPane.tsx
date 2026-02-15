import React, { useEffect, useRef } from 'react';
import { PreviewProps } from '../types';
import mermaid from 'mermaid';
import { toast } from 'sonner';
import { renderMathInContainer } from '../lib/markdownEngine';

export const PreviewPane: React.FC<PreviewProps> = ({ htmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

      // 1. Render KaTeX math expressions
      try {
        renderMathInContainer(containerRef.current);
      } catch (error) {
        console.error('KaTeX rendering failed:', error);
      }

      // 2. Render Mermaid diagrams
      // Look for both code.language-mermaid and code.mermaid (older convention or different parsers)
      const mermaidBlocks = containerRef.current.querySelectorAll('code.language-mermaid, code.mermaid');

      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const preElement = block.parentElement; // Usually it's inside a <pre>

        // Only process if it's inside a PRE or if it's a block-level code (though standard markdown puts it in pre)
        if (preElement && preElement.tagName === 'PRE') {
          const codeContent = block.textContent || '';
          // Provide a simpler, deterministic ID based on index but timestamp to force refresh if needed
          const uniqueId = `mermaid-${i}-${Date.now()}`;

          const div = document.createElement('div');
          div.className = 'mermaid-diagram flex justify-center my-4';
          div.id = uniqueId;

          // Replace <pre> with <div>
          preElement.replaceWith(div);

          try {
            // First, parse to validate syntax and catch errors manually
            // This prevents Mermaid from rendering its own "Syntax error" SVG
            await mermaid.parse(codeContent);

            // If parse succeeds, render returns { svg } in v10+
            const { svg } = await mermaid.render(uniqueId, codeContent);
            div.innerHTML = svg;
          } catch (error: any) {
            // Keep the original code visible if rendering fails, but styled as error
            const errorMessage = error?.message || error?.str || String(error);

            // SECURITY: Escape HTML to prevent XSS from malicious markdown or error strings
            const escapeHtml = (unsafe: string) =>
              unsafe.replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&apos;' }[m] || m));

            div.innerHTML = `
              <div class="text-red-600 border border-red-300 bg-red-50 p-3 rounded-lg text-sm overflow-auto my-2 shadow-sm font-sans">
                <div class="font-bold flex items-center gap-2 mb-2">
                  <span class="bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">!</span>
                  Mermaid Syntax Error
                </div>
                <pre class="bg-white/50 p-2 rounded border border-red-200 font-mono text-xs whitespace-pre-wrap">${escapeHtml(errorMessage)}</pre>
                <details class="mt-2 text-xs text-gray-500 cursor-pointer">
                  <summary class="hover:text-gray-700">Show Details</summary>
                  <pre class="mt-2 p-2 bg-gray-100 rounded border border-gray-200 opacity-80">${escapeHtml(codeContent)}</pre>
                </details>
              </div>
            `;
          }
        }
      }
    };

    // Small timeout to ensure DOM is ready and reduce flickering if rapid updates
    const timer = setTimeout(renderContent, 0);
    return () => clearTimeout(timer);
  }, [htmlContent]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 flex justify-between items-center">
        <span>PREVIEW</span>
        <span className="text-xs text-gray-500">Live Updates</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 w-full p-8 overflow-auto prose-preview"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
