import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { StyleSettings, stylesToCSSVars, DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';
import clsx from 'clsx';
import { sanitizeHtml, postProcessHtml } from '../lib/markdownEngine';

interface PreviewPaneProps {
  htmlContent: string;
  styleSettings?: StyleSettings;
  showPageBreakLines?: boolean;
  orientation?: 'portrait' | 'landscape';
}

// A4 dimensions in mm, minus margins (20mm each side)
const PAGE_HEIGHTS = {
  portrait: 257,   // 297 - 40
  landscape: 170,  // 210 - 40
};

// Convert mm to px (at 96 DPI, 1mm ≈ 3.7795px)
const MM_TO_PX = 3.7795;

export const PreviewPane = forwardRef<HTMLDivElement, PreviewPaneProps>(({ 
  htmlContent, 
  styleSettings,
  showPageBreakLines = false,
  orientation = 'portrait',
}, ref) => {
  const currentSettings = styleSettings || DEFAULT_STYLE_SETTINGS;
  const cssVars = stylesToCSSVars(currentSettings);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);

  // Post-process HTML after content updates (callouts, mermaid, code labels, math)
  useEffect(() => {
    if (contentRef.current) {
      // Set the sanitized HTML
      contentRef.current.innerHTML = htmlContent;

      // Run post-processing pipeline (callouts, mermaid, code labels, math)
      postProcessHtml(contentRef.current, currentSettings).then(() => {
        // After processing, calculate page break lines if needed
        if (showPageBreakLines && contentRef.current) {
          calculatePageBreaks();
        }
      });
    }
  }, [htmlContent, currentSettings]);

  // Recalculate page breaks when toggle or orientation changes
  useEffect(() => {
    if (showPageBreakLines && contentRef.current) {
      calculatePageBreaks();
    } else {
      setPageBreaks([]);
    }
  }, [showPageBreakLines, orientation, htmlContent]);

  const calculatePageBreaks = useCallback(() => {
    if (!contentRef.current) return;
    
    const pageHeightPx = PAGE_HEIGHTS[orientation] * MM_TO_PX;
    const contentHeight = contentRef.current.scrollHeight;
    const breaks: number[] = [];
    
    let currentY = pageHeightPx;
    while (currentY < contentHeight) {
      breaks.push(currentY);
      currentY += pageHeightPx;
    }
    
    setPageBreaks(breaks);
  }, [orientation]);

  return (
    <div 
      ref={ref}
      className={clsx(
        "h-full overflow-y-auto p-8 bg-gray-50 scroll-smooth",
        "prose-preview-container"
      )}
    >
      <div 
        className="prose-preview mx-auto bg-white shadow-sm p-10 min-h-full rounded-lg relative"
        style={cssVars as React.CSSProperties}
      >
        {/* Content container managed via ref for post-processing */}
        <div ref={contentRef} />

        {/* Page break indicator lines */}
        {showPageBreakLines && pageBreaks.map((y, i) => (
          <div
            key={i}
            className="page-break-indicator"
            style={{ top: `${y}px` }}
          >
            <span className="page-break-indicator-label">
              Page {i + 1} → {i + 2}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

PreviewPane.displayName = 'PreviewPane';
