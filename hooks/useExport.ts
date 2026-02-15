import { useState, useCallback } from 'react';
import { Previewer } from 'pagedjs';

// We duplicate key styles here to inject them into the iframe/popup
// because linking external stylesheets in a blob/iframe environment can be flaky.
const PRINT_STYLES = `
  @page {
    size: A4;
    margin: 20mm;
    @bottom-center {
      content: counter(page);
      font-size: 10pt;
      font-family: sans-serif;
    }
    @bottom-left {
      content: "MKtoPDF";
      font-size: 8pt;
      color: #999;
    }
  }
  body { font-family: sans-serif; line-height: 1.6; color: #333; }
  h1 { font-size: 2em; margin-bottom: 0.5em; page-break-after: avoid; break-after: avoid; }
  h2 { font-size: 1.5em; margin-top: 1.5em; margin-bottom: 0.5em; page-break-after: avoid; break-after: avoid; }
  p { margin-bottom: 1em; text-align: justify; }
  pre { background: #f6f8fa; padding: 1em; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; break-inside: avoid; }
  code { font-family: monospace; background: #f1f1f1; padding: 0.2em 0.4em; border-radius: 3px; }
  blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; break-inside: avoid; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  th { background: #f0f0f0; }
  img, svg { max-width: 100%; height: auto; break-inside: avoid; display: block; margin: 1em auto; }
  .katex-display { overflow-x: auto; overflow-y: hidden; padding: 1em 0; }
`;

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const printPdf = useCallback(async (htmlContent: string) => {
    setIsExporting(true);

    try {
      // 1. Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error("Could not create print iframe");
      }

      // 2. Prepare content
      // Explicitly construct HTML string with no leading whitespace before DOCTYPE
      const htmlDoc = `<!DOCTYPE html>
<html>
  <head>
    <title>MKtoPDF Export</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>${PRINT_STYLES}</style>
    <style>
      /* Hide PagedJS preview UI elements in the iframe */
      .pagedjs_margin-content { font-size: 9pt; }
    </style>
  </head>
  <body>
    <div id="print-content">${htmlContent}</div>
  </body>
</html>`;

      doc.open();
      doc.write(htmlDoc);
      doc.close();

      // 3. Run Paged.js
      const previewer = new Previewer();
      
      await previewer.preview(
        doc.getElementById('print-content'), 
        ['/styles/print.css'], 
        doc.body
      );

      // 4. Trigger print
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
            setIsExporting(false);
        }, 1000);
      }, 500);

    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
      alert("Failed to generate PDF. See console for details.");
    }
  }, []);

  return { printPdf, isExporting };
};
