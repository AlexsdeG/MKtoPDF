import { useState, useCallback } from 'react';
import { toast } from 'sonner';
// @ts-ignore
import pagedPolyfillActions from '../lib/paged.polyfill.js?raw';
import { StyleSettings, stylesToCSSVars } from '../lib/styleSettings';

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const printPdf = useCallback(async (
    contentHtml: string,
    orientation: 'portrait' | 'landscape' = 'portrait',
    settings: StyleSettings,
    title: string = 'Document'
  ) => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing PDF...');

    try {
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error('Could not access iframe document');

      // Construct CSS
      const cssVars = stylesToCSSVars(settings);
      const cssVarString = Object.entries(cssVars)
        .map(([key, val]) => `${key}: ${val};`)
        .join('\n');

      // Direct interpolation for header/footer to avoid PagedJS parsing issues with var()
      const headerLeft = settings.headerLeft ? `"${settings.headerLeft.replace(/"/g, '\\"')}"` : '""';
      const headerCenter = settings.headerCenter ? `"${settings.headerCenter.replace(/"/g, '\\"')}"` : '""';
      const headerRight = settings.headerRight ? `"${settings.headerRight.replace(/"/g, '\\"')}"` : '""';
      const footerLeft = settings.footerLeft ? `"${settings.footerLeft.replace(/"/g, '\\"')}"` : '""';
      const footerCenter = settings.footerCenter ? `"${settings.footerCenter.replace(/"/g, '\\"')}"` : '""';
      const footerRight = settings.footerRight ? `"${settings.footerRight.replace(/"/g, '\\"')}"` : '""';

      const pageStyles = `
        @page {
          size: A4 ${orientation};
          margin: 20mm;
          
          @top-left { content: ${headerLeft}; }
          @top-center { content: ${headerCenter}; }
          @top-right { content: ${headerRight}; }
          
          @bottom-left { content: ${footerLeft}; }
          @bottom-center { content: ${footerCenter}; }
          @bottom-right { content: ${footerRight}; }
        }

        /* Hide PagedJS UI */
        .pagedjs_margin-content { font-size: 9pt; color: #666; font-family: var(--md-font-family); }
        
        /* Reset body for printing */
        body { margin: 0; padding: 0; background: white; }
        
        /* Apply variables */
        :root { ${cssVarString} }
        .prose-preview { 
            ${cssVarString} 
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* Page Break */
        .page-break {
          break-before: page;
          page-break-before: always;
          height: 0; margin: 0; padding: 0; border: none;
        }

        /* Callout Styles */
        .callout {
          border: 1px solid rgba(68, 138, 255, 0.3);
          border-left: 4px solid #448aff;
          border-radius: 10px; margin: 1.25em 0; overflow: hidden;
          background: rgba(68, 138, 255, 0.05);
        }
        .callout-title {
          display: flex; align-items: center; gap: 0.5em;
          padding: 0.65em 1em; font-weight: 700; font-size: 0.95em;
          color: #448aff;
          background: rgba(68, 138, 255, 0.1);
          border-bottom: 1px solid rgba(68, 138, 255, 0.15);
        }
        .callout-icon { font-size: 1.1em; flex-shrink: 0; }
        .callout-title-text { flex: 1; }
        .callout-content { padding: 0.75em 1em; font-size: 0.95em; color: #475569; }
        .callout-content>p:last-child { margin-bottom: 0; }
        .callout-content>p:first-child { margin-top: 0; }

        /* Code Language Label */
        .code-block-wrapper { position: relative; margin-bottom: 1.25em; }
        .code-block-wrapper > pre { margin-bottom: 0; border-top-left-radius: 0; border-top-right-radius: 0; margin-top: 0; }
        .code-language-label {
          display: block; font-size: 0.7em; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.08em; padding: 0.35em 1em;
          font-family: 'Fira Code', 'JetBrains Mono', ui-monospace, monospace;
          background: var(--md-code-bg, #f6f8fa);
          border: 1px solid #e2e8f0; border-bottom: none;
          border-radius: 10px 10px 0 0;
        }

        /* Mermaid */
        .mermaid-diagram { display: flex; justify-content: center; margin: 1.5em 0; }

        /* Mark / Highlight */
        mark {
          background: linear-gradient(120deg, #fef08a 0%, #fde047 100%);
          padding: 0.1em 0.3em; border-radius: 4px; color: inherit;
        }
        
        /* Hide UI elements during print if any leak */
        @media print {
            .pagedjs_pages { display: block !important; transform: none !important; }
            .pagedjs_page { margin: 0 !important; border: none !important; box-shadow: none !important; }
        }
      `;

      // Write content
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
              ${pageStyles}
              /* Include base styles (could be fetched or inlined differently in prod) */
            </style>
            <!-- Tailwind/Prose styles need to be included. For now we assume they are global or inlined -->
            <link rel="stylesheet" href="/index.css"> 
            
            <script>
              ${pagedPolyfillActions}
            </script>
            <script>
              window.PagedConfig = {
                auto: false,
                after: (flow) => {
                   // Ready to print
                   setTimeout(() => {
                     window.print();
                     // Notify parent we are done?
                   }, 500);
                }
              };
              
              document.addEventListener('DOMContentLoaded', () => {
                 window.PagedPolyfill.preview();
              });
            </script>
          </head>
          <body>
            <div class="prose-preview">
              ${contentHtml}
            </div>
          </body>
        </html>
      `);
      doc.close();

      // We rely on the script inside the iframe to trigger print()
      // Cleanup happens after print dialog closes (which pauses execution)
      // Since we can't easily detect print dialog close cross-browser:
      // We set a timeout to remove iframe, but usually user interaction blocks.
      // A safer way is to listen for focus back on main window, or just leave it hidden.
      // However, we need to reset isExporting.
      
      // Since print() is blocking, we can reset after a delay.
      setTimeout(() => {
        setIsExporting(false);
        toast.dismiss(toastId);
        toast.success('Export completed');
        // Clean up iframe after a delay to ensure print is done
        setTimeout(() => document.body.removeChild(iframe), 5000); 
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
      setIsExporting(false);
    }
  }, []);

  return { printPdf, isExporting };
};
