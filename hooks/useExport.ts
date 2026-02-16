import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { StyleSettings } from '../lib/styleSettings';

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

      // Direct interpolation for header/footer to avoid PagedJS parsing issues with var()
      const headerLeft = settings.headerLeft ? `"${settings.headerLeft.replace(/"/g, '\\"')}"` : '""';
      const headerCenter = settings.headerCenter ? `"${settings.headerCenter.replace(/"/g, '\\"')}"` : '""';
      const headerRight = settings.headerRight ? `"${settings.headerRight.replace(/"/g, '\\"')}"` : '""';
      const footerLeft = settings.footerLeft ? `"${settings.footerLeft.replace(/"/g, '\\"')}"` : '""';
      const footerCenter = settings.footerCenter ? `"${settings.footerCenter.replace(/"/g, '\\"')}"` : '""';
      const footerRight = settings.footerRight ? `"${settings.footerRight.replace(/"/g, '\\"')}"` : '""';

      // Run post-processing on the main thread before building the print document
      // Dynamic import to avoid loading mermaid/katex at module init (breaks tests)
      const { postProcessHtml } = await import('../lib/markdownEngine');
      const tempContainer = document.createElement('div');
      tempContainer.className = 'prose-preview';
      tempContainer.innerHTML = contentHtml;
      
      try {
        await postProcessHtml(tempContainer, settings);
      } catch (err) {
        console.warn('Post-processing warning during export:', err);
      }

      const processedHtml = tempContainer.innerHTML;

      // Resolve CSS vars to literal values for the iframe (iframe can't inherit parent CSS vars)
      const FONT_FAMILIES: Record<string, string> = {
        sans: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        serif: "'Georgia', 'Times New Roman', serif",
        mono: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
      };
      const fontFamily = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.sans;
      const fontSize = `${settings.fontSize}px`;
      const lineHeight = `${settings.lineHeight}`;
      const textColor = settings.textColor || '#334155';
      const headingColor = settings.headingColor || '#1e293b';
      const accentColor = settings.accentColor || '#4f46e5';
      const codeBg = settings.codeBgColor || '#f6f8fa';
      const pAlign = settings.paragraphAlign || 'left';

      const printStyles = `
        /* Base Styles — all resolved to literal values */
        body { margin: 0; padding: 20mm; background: white; }

        .prose-preview {
          font-family: ${fontFamily};
          font-size: ${fontSize};
          line-height: ${lineHeight};
          color: ${textColor};
          background-color: #ffffff;
          max-width: 900px;
          margin: 0 auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        /* Print Page Setup */
        @page {
          size: A4 ${orientation};
          margin: 20mm; /* Browser print margin */
        }

        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            background: white; 
          }
          
          .prose-preview {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            
            /* Fix extra newlines handling */
            white-space: normal !important; 
            
            /* Increase font size for print specifically */
            font-size: 12pt !important;
            line-height: 1.5 !important;
          }
          
          /* Tighten spacing for print */
          .prose-preview p, 
          .prose-preview ul, 
          .prose-preview ol,
          .prose-preview li {
            margin-bottom: 0.5em !important;
          }
          
          /* Prevent awkward breaks */
          .prose-preview pre, 
          .prose-preview blockquote,
          .prose-preview table,
          .callout { 
            page-break-inside: avoid; 
          }
          
          /* Ensure headings stick to content */
          .prose-preview h1, 
          .prose-preview h2, 
          .prose-preview h3,
          .prose-preview h4 { 
            page-break-after: avoid;
            margin-top: 1em !important; 
          }
        }

        /* Typography — exact match with index.html */
        .prose-preview h1 {
          font-size: 2em; font-weight: 800;
          margin-bottom: 0.5em; margin-top: 1.2em;
          color: ${headingColor};
          letter-spacing: -0.02em;
          border-bottom: 2px solid ${accentColor};
          padding-bottom: 0.2em;
        }
        .prose-preview h2 {
          font-size: 1.5em; font-weight: 700;
          margin-bottom: 0.5em; margin-top: 1.5em;
          color: ${headingColor};
          letter-spacing: -0.01em;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.15em;
        }
        .prose-preview h3 { font-size: 1.25em; font-weight: 600; margin-bottom: 0.4em; margin-top: 1.3em; color: ${headingColor}; }
        .prose-preview h4 { font-size: 1.1em; font-weight: 600; margin-bottom: 0.3em; margin-top: 1em; color: ${headingColor}; }
        .prose-preview p { margin-bottom: 1em; line-height: ${lineHeight}; text-align: ${pAlign}; }
        .prose-preview a { color: ${accentColor}; text-decoration: underline; text-underline-offset: 2px; }
        .prose-preview strong { font-weight: 700; }
        .prose-preview em { font-style: italic; }

        /* Lists */
        .prose-preview ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 1em; }
        .prose-preview ol { list-style-type: decimal; margin-left: 1.5em; margin-bottom: 1em; }
        .prose-preview li { margin-bottom: 0.3em; }
        .prose-preview li > ul, .prose-preview li > ol { margin-top: 0.3em; margin-bottom: 0; }

        /* Task Lists */
        .prose-preview input[type="checkbox"] { width: 1.15em; height: 1.15em; border: 2px solid #94a3b8; border-radius: 4px; margin-top: 0.2em; margin-right: 0.5em; }
        .prose-preview input[type="checkbox"]:checked { background-color: ${accentColor}; border-color: ${accentColor}; }

        /* Blockquotes */
        .prose-preview blockquote { border-left: 4px solid #cbd5e1; padding: 0.5em 1em; color: #64748b; font-style: italic; margin: 1em 0; background: #f8fafc; border-radius: 0 8px 8px 0; }
        .prose-preview blockquote > p:last-child { margin-bottom: 0; }

        /* Code */
        .prose-preview code { background-color: ${codeBg}; padding: 0.15em 0.4em; border-radius: 5px; font-family: 'Fira Code', 'JetBrains Mono', ui-monospace, monospace; font-size: 0.875em; border: 1px solid #e2e8f0; }
        .prose-preview pre { background-color: ${codeBg}; padding: 1em 1.25em; border-radius: 10px; overflow-x: auto; margin-bottom: 1.25em; border: 1px solid #e2e8f0; }
        .prose-preview pre code { background-color: transparent; padding: 0; border: none; font-size: 0.9em; }

        /* Tables */
        .prose-preview table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 1.25em 0; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
        .prose-preview th, .prose-preview td { border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
        .prose-preview th:last-child, .prose-preview td:last-child { border-right: none; }
        .prose-preview tr:last-child td { border-bottom: none; }
        .prose-preview th { background: linear-gradient(to bottom, #f1f5f9, #e2e8f0); font-weight: 600; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.03em; color: #475569; }
        .prose-preview tr:nth-child(even) td { background-color: #fafbfc; }

        /* Horizontal Rule */
        .prose-preview hr { border: none; height: 3px; background: ${accentColor}; margin: 2em 0; border-radius: 2px; opacity: 0.5; }

        /* Images */
        .prose-preview img { max-width: 100%; height: auto; border-radius: 10px; margin: 1.5em auto; display: block; }

        /* Page Break */
        .page-break, hr.print-page-break { break-before: page; page-break-before: always; height: 0; margin: 0; padding: 0; border: none; visibility: hidden; }

        /* Callout Styles */
        .callout { border: 1px solid rgba(68, 138, 255, 0.3); border-left: 4px solid #448aff; border-radius: 10px; margin: 1.25em 0; overflow: hidden; background: rgba(68, 138, 255, 0.05); }
        .callout-title { display: flex; align-items: center; gap: 0.5em; padding: 0.65em 1em; font-weight: 700; font-size: 0.95em; color: #448aff; background: rgba(68, 138, 255, 0.1); border-bottom: 1px solid rgba(68, 138, 255, 0.15); }
        .callout-icon { font-size: 1.1em; flex-shrink: 0; }
        .callout-title-text { flex: 1; }
        .callout-content { padding: 0.75em 1em; font-size: 0.95em; color: #475569; }
        .callout-content > p:last-child { margin-bottom: 0; }
        .callout-content > p:first-child { margin-top: 0; }
        .callout-content ul, .callout-content ol { margin-left: 1.2em; margin-bottom: 0.5em; }

        /* Code Language Label */
        .code-block-wrapper { position: relative; margin-bottom: 1.25em; }
        .code-block-wrapper > pre { margin-bottom: 0; border-top-left-radius: 0; border-top-right-radius: 0; margin-top: 0; }
        .code-language-label { display: block; font-size: 0.7em; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.35em 1em; font-family: 'Fira Code', 'JetBrains Mono', ui-monospace, monospace; background: ${codeBg}; border: 1px solid #e2e8f0; border-bottom: none; border-radius: 10px 10px 0 0; }

        /* Mermaid */
        .mermaid-diagram { display: flex; justify-content: center; margin: 1.5em 0; }

        /* Mark / Highlight */
        mark { background: linear-gradient(120deg, #fef08a 0%, #fde047 100%); padding: 0.1em 0.3em; border-radius: 4px; color: inherit; }

        /* KaTeX */
        .katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.5em 0; }

        /* Hide KaTeX MathML block to prevent duplication (HTML + MathML) */
        .katex-mathml {
          clip: rect(1px, 1px, 1px, 1px) !important;
          border: 0 !important;
          height: 1px !important;
          width: 1px !important;
          overflow: hidden !important;
          position: absolute !important;
          padding: 0 !important;
          margin: -1px !important;
        }

        /* Print avoidance */
        pre, blockquote { page-break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; }
      `;

      // Create iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      const doc = iframeWindow?.document;
      if (!doc || !iframeWindow) throw new Error('Could not access iframe document');

      // Collect styles from main document to ensure plugins (KaTeX, Mermaid, etc.) work
      const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('');

      // Write content — simple approach with @page rules for print
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  ${existingStyles}
  <style>${printStyles}</style>
</head>
<body>
  <div class="prose-preview">
    ${processedHtml}
  </div>
</body>
</html>`);
      doc.close();

      // Wait for content to render, then trigger print
      await new Promise<void>((resolve) => {
        const onLoad = () => {
          setTimeout(() => {
            try {
              iframeWindow.print();
            } catch (e) {
              console.warn('Print failed:', e);
              // Fallback: open in new window
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(doc.documentElement.outerHTML);
                printWindow.document.close();
                printWindow.print();
              }
            }
            resolve();
          }, 300);
        };

        if (doc.readyState === 'complete') {
          onLoad();
        } else {
          iframe.addEventListener('load', onLoad);
        }
      });

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);

      setIsExporting(false);
      toast.dismiss(toastId);
      toast.success('Export completed');

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
      setIsExporting(false);
      toast.dismiss(toastId);
    }
  }, []);

  return { printPdf, isExporting };
};
