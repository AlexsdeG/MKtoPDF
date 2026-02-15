import { useState, useCallback } from 'react';

// Injection of styles directly because cross-domain/blob stylesheet references can be flaky.
const GET_PRINT_STYLES = (orientation: 'portrait' | 'landscape') => `
  @page {
    size: A4 ${orientation};
    margin: 20mm;

    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-size: 9pt;
      font-family: ui-sans-serif, system-ui, sans-serif;
      color: #888;
    }
  }

  /* Reset body margins for print */
  body {
    margin: 0;
    padding: 0;
    font-family: ui-sans-serif, system-ui, sans-serif;
    line-height: 1.6;
    color: #333;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Content Styles - matching the preview pane look but optimized for print */
  h1 { font-size: 24pt; font-weight: bold; margin-bottom: 0.5em; page-break-after: avoid; break-after: avoid; }
  h2 { font-size: 18pt; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; page-break-after: avoid; break-after: avoid; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
  h3 { font-size: 14pt; font-weight: bold; margin-top: 1.2em; margin-bottom: 0.5em; page-break-after: avoid; break-after: avoid; }
  
  p { margin-bottom: 1em; text-align: justify; }
  
  pre { 
    background: #f6f8fa; 
    padding: 1em; 
    border: 1px solid #ddd; 
    border-radius: 4px; 
    white-space: pre-wrap; 
    break-inside: avoid; 
    font-family: monospace; 
    font-size: 0.9em;
  }
  
  code { 
    font-family: monospace; 
    background: #f1f1f1; 
    padding: 0.2em 0.4em; 
    border-radius: 3px; 
    font-size: 0.9em; 
  }
  
  blockquote { 
    border-left: 4px solid #ddd; 
    padding-left: 1em; 
    color: #666; 
    font-style: italic;
    margin-left: 0;
  }
  
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 1em 0; 
    break-inside: avoid; 
    font-size: 0.95em;
  }
  
  th, td { 
    border: 1px solid #ccc; 
    padding: 8px; 
    text-align: left; 
  }
  
  th { 
    background: #f0f0f0; 
    font-weight: bold; 
  }
  
  img, svg { 
    max-width: 100%; 
    height: auto; 
    break-inside: avoid; 
    display: block; 
    margin: 1em auto; 
  }

  /* Mermaid diagram spacing */
  .mermaid-diagram {
    display: flex;
    justify-content: center;
    margin: 2em 0;
    break-inside: avoid;
  }

  ul, ol { margin-left: 1.5em; margin-bottom: 1em; }
  li { margin-bottom: 0.25em; }
  
  .katex-display { overflow-x: auto; overflow-y: hidden; padding: 1em 0; break-inside: avoid; }
`;

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const printPdf = useCallback(async (htmlContent: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
    setIsExporting(true);

    try {
      // 1. Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error("Could not create print iframe");
      }

      // 2. Prepare content
      // We avoid Paged.js entirely to prevent the duplicate content bug.
      // Modern browsers support @page CSS for headers/footers/margins.
      const htmlDoc = `<!DOCTYPE html>
<html>
  <head>
    <title>MKtoPDF Export</title>
    <!-- We inject KaTeX CSS directly for maximum reliability -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css">
    <style>${GET_PRINT_STYLES(orientation)}</style>
  </head>
  <body>
    <div id="print-content">${htmlContent}</div>
  </body>
</html>`;

      doc.open();
      doc.write(htmlDoc);
      doc.close();

      // 3. Trigger print
      // We give fonts/katex a moment to load and render
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // Cleanup after print dialog is closed
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
