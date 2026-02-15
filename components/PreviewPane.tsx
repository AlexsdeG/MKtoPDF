import React, { forwardRef } from 'react';
import { StyleSettings, stylesToCSSVars, DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';
import clsx from 'clsx';
import { sanitizeHtml } from '../lib/markdownEngine';
import { renderMathInContainer } from '../lib/markdownEngine';

interface PreviewPaneProps {
  htmlContent: string;
  styleSettings?: StyleSettings;
}

export const PreviewPane = forwardRef<HTMLDivElement, PreviewPaneProps>(({ htmlContent, styleSettings }, ref) => {
  const currentSettings = styleSettings || DEFAULT_STYLE_SETTINGS;
  const cssVars = stylesToCSSVars(currentSettings);

  // Render math after content updates
  React.useEffect(() => {
    // We need a ref to the container to run KaTeX on it
    // But since we are forwarding the ref, we need to ensure we can access the element
    // Ideally user of PreviewPane passes a ref object created by useRef.
    // If ref is a callback/function, this gets tricky.
    // Assuming ref is MutableRefObject<HTMLDivElement | null> for simplicity in App.tsx
    if (ref && 'current' in ref && ref.current) {
        renderMathInContainer(ref.current as HTMLElement);
    }
  }, [htmlContent, ref]);

  return (
    <div 
      ref={ref}
      className={clsx(
        "h-full overflow-y-auto p-8 bg-gray-50 scroll-smooth", // Added scroll-smooth
        "prose-preview-container"
      )}
    >
      <div 
        className="prose-preview mx-auto bg-white shadow-sm p-10 min-h-full rounded-lg"
        style={cssVars as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
});

PreviewPane.displayName = 'PreviewPane';
