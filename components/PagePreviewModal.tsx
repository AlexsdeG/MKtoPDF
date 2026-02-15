import React, { useEffect, useRef } from 'react';
import { X, FileText } from 'lucide-react';
import { StyleSettings, stylesToCSSVars, DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';

interface PagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  orientation: 'portrait' | 'landscape';
  styleSettings?: StyleSettings;
}

// A4 at 96 DPI (screen)
const A4_WIDTH_PX = 794;   // 210mm
const A4_HEIGHT_PX = 1123;  // 297mm

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  orientation,
  styleSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = styleSettings || DEFAULT_STYLE_SETTINGS;

  const pageWidth = orientation === 'portrait' ? A4_WIDTH_PX : A4_HEIGHT_PX;
  const pageHeight = orientation === 'portrait' ? A4_HEIGHT_PX : A4_WIDTH_PX;

  // Scale to fit in modal
  const scale = 0.55;
  const displayWidth = pageWidth * scale;
  const displayHeight = pageHeight * scale;

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Split content by page-break divs
  const pages = htmlContent.split(/<div\s+class="page-break"\s*>\s*<\/div>/gi);
  const cssVars = stylesToCSSVars(settings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Page Preview</h2>
              <p className="text-xs text-gray-500">
                {orientation === 'portrait' ? 'Portrait' : 'Landscape'} · A4 · {pages.length} page{pages.length !== 1 ? 's' : ''}
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

        {/* Pages */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col items-center gap-8">
            {pages.map((pageHtml, idx) => (
              <div key={idx} className="relative">
                {/* Page number */}
                <div className="text-xs text-gray-400 text-center mb-2 font-medium">
                  Page {idx + 1} of {pages.length}
                </div>
                {/* Page frame */}
                <div
                  className="bg-white shadow-lg border border-gray-300 overflow-hidden relative"
                  style={{
                    width: displayWidth,
                    height: displayHeight,
                    borderRadius: 4,
                  }}
                >
                  <div
                    className="prose-preview origin-top-left overflow-hidden"
                    style={{
                      ...cssVars as React.CSSProperties,
                      width: pageWidth,
                      height: pageHeight,
                      transform: `scale(${scale})`,
                      padding: '40px 50px',
                      boxSizing: 'border-box',
                    }}
                    dangerouslySetInnerHTML={{ __html: pageHtml }}
                  />
                </div>
                {/* Page break indicator between pages */}
                {idx < pages.length - 1 && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-1 border-t-2 border-dashed border-blue-300" />
                    <span className="text-xs text-blue-400 font-medium whitespace-nowrap">Page Break</span>
                    <div className="flex-1 border-t-2 border-dashed border-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-white flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Insert <code className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">&lt;div class="page-break"&gt;&lt;/div&gt;</code> to add page breaks
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-md transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
