import React, { useEffect, useRef } from 'react';
import { PreviewProps } from '../types';
import mermaid from 'mermaid';
import { renderMathInContainer } from '../lib/markdownEngine';

export const PreviewPane: React.FC<PreviewProps> = ({ htmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    const renderContent = async () => {
      if (!containerRef.current) return;

      // 1. Render KaTeX math expressions (moved from worker to main thread)
      renderMathInContainer(containerRef.current);

      // 2. Render Mermaid diagrams
      const mermaidBlocks = containerRef.current.querySelectorAll('code.language-mermaid');

      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const preElement = block.parentElement;

        if (preElement && preElement.tagName === 'PRE') {
          const codeContent = block.textContent || '';
          const uniqueId = `mermaid-diagram-${i}-${Date.now()}`;

          const div = document.createElement('div');
          div.className = 'mermaid-diagram';
          div.id = uniqueId;

          preElement.replaceWith(div);

          try {
            const { svg } = await mermaid.render(uniqueId + '-svg', codeContent);
            div.innerHTML = svg;
          } catch (error) {
            console.error('Mermaid rendering failed:', error);
            div.innerHTML = `<div class="p-2 border border-red-300 bg-red-50 text-red-600 text-xs rounded">
              <p class="font-bold">Mermaid Error:</p>
              <pre class="whitespace-pre-wrap">${(error as Error).message}</pre>
            </div>`;
          }
        }
      }
    };

    renderContent();
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
