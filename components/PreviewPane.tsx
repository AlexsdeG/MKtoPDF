import React, { useEffect, useRef } from 'react';
import { PreviewProps } from '../types';
import mermaid from 'mermaid';

export const PreviewPane: React.FC<PreviewProps> = ({ htmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid configuration
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose', // Needed to render into shadow DOM or specific containers sometimes
    });

    const renderMermaidDiagrams = async () => {
      if (!containerRef.current) return;

      // Find all code blocks with 'language-mermaid' class
      // Note: rehype-highlight preserves the class 'language-mermaid' even if it doesn't highlight it.
      const mermaidBlocks = containerRef.current.querySelectorAll('code.language-mermaid');
      
      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const preElement = block.parentElement; // The <pre> tag wrapping the <code>
        
        if (preElement && preElement.tagName === 'PRE') {
          const codeContent = block.textContent || '';
          const uniqueId = `mermaid-diagram-${i}-${Date.now()}`;
          
          // Create a container div to replace the pre block
          const div = document.createElement('div');
          div.className = 'mermaid-diagram';
          div.id = uniqueId;
          
          // We temporarily insert the div to reserve space and location
          preElement.replaceWith(div);

          try {
            // Render the SVG
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

    renderMermaidDiagrams();
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
