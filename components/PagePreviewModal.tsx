import React, { useEffect, useRef, useState } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { StyleSettings, stylesToCSSVars, DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';
import { postProcessHtml } from '../lib/markdownEngine';
import { Previewer } from 'pagedjs';

interface PagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  initialOrientation: 'portrait' | 'landscape';
  styleSettings?: StyleSettings;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  initialOrientation,
  styleSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<Previewer | null>(null);
  
  const [isRendering, setIsRendering] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(initialOrientation);
  
  const settings = styleSettings || DEFAULT_STYLE_SETTINGS;

  // Sync orientation when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrientation(initialOrientation);
    }
  }, [isOpen, initialOrientation]);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Small delay to ensure the DOM is mounted before rendering
    const timeoutId = setTimeout(() => {
      renderPreview();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen, htmlContent, orientation, settings]);

  const renderPreview = async () => {
    if (!containerRef.current) return;
    
    setIsRendering(true);
    
    // Clear previous content
    containerRef.current.innerHTML = '';

    // Construct CSS variables and @page rules
    const cssVars = stylesToCSSVars(settings);
    const cssVarString = Object.entries(cssVars)
      .map(([key, val]) => `${key}: ${val};`)
      .join('\n');

    // Direct interpolation for headers/footers to avoid PagedJS parsing issues
    const headerLeft = settings.headerLeft ? `"${settings.headerLeft.replace(/"/g, '\\"')}"` : '""';
    const headerCenter = settings.headerCenter ? `"${settings.headerCenter.replace(/"/g, '\\"')}"` : '""';
    const headerRight = settings.headerRight ? `"${settings.headerRight.replace(/"/g, '\\"')}"` : '""';
    const footerLeft = settings.footerLeft ? `"${settings.footerLeft.replace(/"/g, '\\"')}"` : '""';
    const footerCenter = settings.footerCenter ? `"${settings.footerCenter.replace(/"/g, '\\"')}"` : '""';
    const footerRight = settings.footerRight ? `"${settings.footerRight.replace(/"/g, '\\"')}"` : '""';

    const pageRules = `
      @page {
        size: A4 ${orientation};
        margin: 20mm;
        
        @top-left { content: ${headerLeft}; font-family: var(--md-font-family); font-size: 9pt; color: #666; }
        @top-center { content: ${headerCenter}; font-family: var(--md-font-family); font-size: 9pt; color: #666; }
        @top-right { content: ${headerRight}; font-family: var(--md-font-family); font-size: 9pt; color: #666; }
        
        @bottom-left { content: ${footerLeft}; font-family: var(--md-font-family); font-size: 9pt; color: #666; }
        @bottom-center { content: ${footerCenter}; font-family: var(--md-font-family); font-size: 9pt; color: #666; }
        @bottom-right { content: ${footerRight}; font-family: var(--md-font-family); font-size: 9pt; color: #666; }
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
      
      /* Ensure content uses variables and whitespace is preserved */
      .pagedjs_page .prose-preview {
         ${cssVarString}
         white-space: pre-wrap; /* Preserve line breaks */
         word-wrap: break-word;
      }
      
      /* Hide PagedJS UI elements we don't need */
      .pagedjs_margin-content { font-size: 9pt; }
    `;

    // Use Blob URL for cleaner CSS injection
    const stylesBlob = new Blob([pageRules], { type: 'text/css' });
    const stylesUrl = URL.createObjectURL(stylesBlob);
    
    // Build the content wrapper and run post-processing BEFORE passing to PagedJS
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'prose-preview';
    contentWrapper.innerHTML = htmlContent;
    contentWrapper.style.cssText = Object.entries(cssVars)
      .map(([key, val]) => `${key}: ${val}`)
      .join('; ');
    contentWrapper.style.whiteSpace = 'pre-wrap';

    // Run post-processing (callouts, mermaid, code labels, math) before PagedJS
    try {
      await postProcessHtml(contentWrapper, settings);
    } catch (err) {
      console.warn('Post-processing error in preview:', err);
    }

    // Create a fresh Previewer each time
    try {
      const previewer = new Previewer();
      previewerRef.current = previewer;

      await previewer.preview(
        contentWrapper,
        ['/index.css', stylesUrl],
        containerRef.current!
      );

      setIsRendering(false);
      URL.revokeObjectURL(stylesUrl);
    } catch (err) {
      console.error("PagedJS Preview Error:", err);
      setIsRendering(false);
      URL.revokeObjectURL(stylesUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Print Preview</h2>
              <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded text-gray-600">A4</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {isRendering ? 'Rendering Layout...' : 'Ready to Print'}
                  </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Orientation Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                    onClick={() => setOrientation('portrait')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${orientation === 'portrait' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Portrait
                </button>
                <button
                    onClick={() => setOrientation('landscape')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${orientation === 'landscape' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Landscape
                </button>
             </div>

             <div className="h-8 w-px bg-gray-200 mx-2"></div>

             <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close Preview"
             >
                <X size={20} />
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-200/50 p-8 relative scroll-smooth">
           {isRendering && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[60] backdrop-blur-sm transition-opacity duration-300">
               <div className="flex flex-col items-center gap-4">
                 <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-sm font-medium text-gray-600 animate-pulse">Calculating Pagination...</span>
               </div>
             </div>
           )}
           <div ref={containerRef} className="mx-auto min-h-full flex justify-center pb-20" />
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center z-10">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                Powered by Paged.js
            </span>
            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all hover:shadow-sm"
                >
                    Close
                </button>
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95"
                >
                   <Check size={16} />
                   Done
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
