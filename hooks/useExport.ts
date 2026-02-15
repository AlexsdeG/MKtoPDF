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

      const pageStyles = `
        @page {
          size: A4 ${orientation};
          margin: 20mm;
          
          @top-left { content: var(--md-header-left); }
          @top-center { content: var(--md-header-center); }
          @top-right { content: var(--md-header-right); }
          
          @bottom-left { content: var(--md-footer-left); }
          @bottom-center { content: var(--md-footer-center); }
          @bottom-right { content: var(--md-footer-right); }
        }

        /* Hide PagedJS UI */
        .pagedjs_margin-content { font-size: 9pt; color: #666; font-family: var(--md-font-family); }
        
        /* Reset body for printing */
        body { margin: 0; padding: 0; background: white; }
        
        /* Apply variables */
        :root { ${cssVarString} }
        .prose-preview { ${cssVarString} }
        
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
