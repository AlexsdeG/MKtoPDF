import React, { useEffect, useRef, useState } from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { StyleSettings, stylesToCSSVars, DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';
import { Previewer } from 'pagedjs';

interface PagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  orientation: 'portrait' | 'landscape';
  styleSettings?: StyleSettings;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  orientation,
  styleSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<Previewer | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  
  const settings = styleSettings || DEFAULT_STYLE_SETTINGS;

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const render = async () => {
      setIsRendering(true);
      
      // Clear previous content
      containerRef.current!.innerHTML = '';

      // Initialize PagedJS Previewer
      previewerRef.current = new Previewer();
      
      // Construct CSS variables and @page rules
      const cssVars = stylesToCSSVars(settings);
      const cssVarString = Object.entries(cssVars)
        .map(([key, val]) => `${key}: ${val};`)
        .join('\n');

      const pageRules = `
        @page {
          size: A4 ${orientation};
          margin: 20mm;
          
          @top-left {
            content: var(--md-header-left);
            font-family: var(--md-font-family);
            font-size: 9pt;
            color: #666;
          }
          @top-center {
            content: var(--md-header-center);
            font-family: var(--md-font-family);
            font-size: 9pt;
            color: #666;
          }
          @top-right {
            content: var(--md-header-right);
            font-family: var(--md-font-family);
            font-size: 9pt;
            color: #666;
          }
          
          @bottom-left {
            content: var(--md-footer-left);
            font-family: var(--md-font-family);
            font-size: 9pt;
            color: #666;
          }
          @bottom-center {
            content: var(--md-footer-center);
            font-family: var(--md-font-family);
            font-size: 9pt;
            color: #666;
          }
          @bottom-right {
            content: var(--md-footer-right);
            font-family: var(--md-font-family);
            font-size: 9pt;
            color: #666;
          }
        }

        /* Essential PagedJS Styles */
        .pagedjs_page {
          background-color: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin-bottom: 2rem;
          flex: none;
        }

        .pagedjs_pages {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          width: 100%;
        }

        /* Re-apply root variables to pagedjs pages */
        .pagedjs_page {
          ${cssVarString}
        }
        
        /* Ensure content uses variables */
        .pagedjs_page .prose-preview {
           ${cssVarString}
        }
        
        /* Hide PagedJS UI elements we don't need */
        .pagedjs_margin-content { font-size: 9pt; }
      `;

      // Create style element
      const style = document.createElement('style');
      style.innerHTML = pageRules;
      
      // We need to wrap content in a div that applies the variables too, for measurement
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'prose-preview'; // Re-use main prose class
      contentWrapper.innerHTML = htmlContent;
      contentWrapper.style.cssText = cssVarString;

      // Run preview (content, stylesheets, container)
      // We pass the style element as has been appended to contentWrapper
      contentWrapper.appendChild(style);

      previewerRef.current.preview(
        contentWrapper,
        ['/index.css'], // Base styles
        containerRef.current
      ).then(() => {
          setIsRendering(false);
      }).catch((err) => {
          console.error("PagedJS Preview Error:", err);
          setIsRendering(false);
      });
    };

    render();

    return () => {
      // Cleanup? PagedJS doesn't have a clear destroy method exposed easily on Previewer instance
      // But we clear innerHTML on next run.
    };
  }, [isOpen, htmlContent, orientation, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-100 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Print Preview</h2>
              <p className="text-xs text-gray-500">
                {orientation === 'portrait' ? 'Portrait' : 'Landscape'} · A4 · {isRendering ? 'Rendering...' : 'Ready'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-200/50 p-8 relative">
           {isRendering && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
               <div className="flex flex-col items-center gap-2">
                 <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-sm font-medium text-gray-600">Generating preview...</span>
               </div>
             </div>
           )}
           <div ref={containerRef} className="mx-auto" />
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-white flex justify-between items-center">
            <span className="text-xs text-gray-500">
                Uses Paged.js for accurate print simulation.
            </span>
            <div className="flex gap-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Close
                </button>
                <button
                    onClick={() => {
                        window.print(); // This might print the modal logic which is not ideal, but user asked for "export" fix.
                        // Actually useExport handles the real export. This preview is for viewing.
                        // But maybe we can trigger a print of the PREVIEW content?
                        // For now just close. The main Export button handles functionality.
                        onClose();
                    }}
                    className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                   <Printer size={16} />
                   Done
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
