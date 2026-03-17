import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { StyleSettings, stylesToCSSVars } from '../lib/styleSettings';
import { buildPageRules, hasCustomHeaderFooter } from '../lib/headerFooter';
import { inlineImageSourcesForExport } from '../lib/sessionImages';

const A4_DIMENSIONS_MM = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
} as const;

function getExportPageGeometry(orientation: 'portrait' | 'landscape', hasHeaderOrFooter: boolean) {
  // Keep default spacing when no margin boxes are used.
  const marginMm = hasHeaderOrFooter ? 18 : 20;
  const page = A4_DIMENSIONS_MM[orientation];

  return {
    marginMm,
    pageWidthMm: page.width,
    pageHeightMm: page.height,
    contentWidthMm: page.width - marginMm * 2,
    contentHeightMm: page.height - marginMm * 2,
  };
}

async function runPagedPreviewWithoutResizeObserver<T>(run: () => Promise<T>): Promise<T> {
  const originalResizeObserver = (globalThis as any).ResizeObserver;

  try {
    (globalThis as any).ResizeObserver = undefined;
    return await run();
  } finally {
    (globalThis as any).ResizeObserver = originalResizeObserver;
  }
}

async function waitForNextFrame(targetWindow: Window): Promise<void> {
  await new Promise<void>((resolve) => targetWindow.requestAnimationFrame(() => resolve()));
}

async function waitForPrintDocumentReady(targetWindow: Window, doc: Document): Promise<void> {
  if ('fonts' in doc && (doc as any).fonts?.ready) {
    try {
      await (doc as any).fonts.ready;
    } catch {
      // Ignore font readiness failures and continue with layout flush.
    }
  }

  await waitForNextFrame(targetWindow);
  await waitForNextFrame(targetWindow);
}

function getPageDiagnostics(root: ParentNode) {
  const pageNodes = Array.from(root.querySelectorAll('.pagedjs_page'));
  const diagnostics = pageNodes.map((pageNode, index) => {
    const pageText = pageNode.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const contentNode = pageNode.querySelector('.pagedjs_page_content');
    const contentText = contentNode?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    return {
      page: index + 1,
      textLength: pageText.length,
      contentTextLength: contentText.length,
      childCount: pageNode.childElementCount,
      isBlank: pageText.length === 0,
      contentBlank: contentText.length === 0,
    };
  });

  return {
    pageCount: pageNodes.length,
    blankPages: diagnostics.filter((item) => item.isBlank).map((item) => item.page),
    contentBlankPages: diagnostics.filter((item) => item.contentBlank).map((item) => item.page),
    diagnostics,
  };
}

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const printPdf = useCallback(async (
    contentHtml: string,
    orientation: 'portrait' | 'landscape' = 'portrait',
    settings: StyleSettings,
    title: string = 'Document',
    imageSources: Record<string, string> = {}
  ) => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing PDF...');
    let hiddenRenderTarget: HTMLDivElement | null = null;
    let iframe: HTMLIFrameElement | null = null;
    let exportPreviewer: any = null;
    let exportPagedStyleElements: HTMLStyleElement[] = [];
    const exportDebugEnabled = (() => {
      try {
        return window.localStorage.getItem('MKTOPDF_EXPORT_DEBUG') === '1';
      } catch {
        return false;
      }
    })();

    const debugLog = (message: string, payload?: unknown) => {
      if (!exportDebugEnabled) {
        return;
      }

      if (typeof payload === 'undefined') {
        console.debug(`[MKtoPDF export] ${message}`);
        return;
      }

      console.debug(`[MKtoPDF export] ${message}`, payload);
    };

    const destroyExportPreviewer = () => {
      if (!exportPreviewer) {
        return;
      }

      try {
        exportPreviewer.chunker?.destroy?.();
      } catch (err) {
        debugLog('chunker destroy warning', err);
      }

      try {
        exportPreviewer.polisher?.destroy?.();
      } catch (err) {
        debugLog('polisher destroy warning', err);
      }

      exportPreviewer = null;
    };

    const cleanup = () => {
      destroyExportPreviewer();

      for (const styleEl of exportPagedStyleElements) {
        if (styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      }

      if (iframe?.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

      if (hiddenRenderTarget?.parentNode) {
        hiddenRenderTarget.parentNode.removeChild(hiddenRenderTarget);
      }
    };

    try {
      // Run post-processing on the main thread before building the print document
      // Dynamic import to avoid loading mermaid/katex at module init (breaks tests)
      const { postProcessHtml } = await import('../lib/markdownEngine');
      const { Previewer } = await import('pagedjs');
      const tempContainer = document.createElement('div');
      tempContainer.className = 'prose-preview';
      tempContainer.innerHTML = contentHtml;
      
      try {
        await postProcessHtml(tempContainer, settings);
        await inlineImageSourcesForExport(tempContainer, imageSources);
      } catch (err) {
        console.warn('Post-processing warning during export:', err);
      }

      const processedHtml = tempContainer.innerHTML;
      const cssVars = stylesToCSSVars(settings);
      const cssVarString = Object.entries(cssVars)
        .map(([key, val]) => `${key}: ${val};`)
        .join('\n');

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
      const hasHeaderOrFooter = hasCustomHeaderFooter(settings);
      const geometry = getExportPageGeometry(orientation, hasHeaderOrFooter);
      debugLog('export geometry', {
        orientation,
        hasHeaderOrFooter,
        marginMm: geometry.marginMm,
        pageWidthMm: geometry.pageWidthMm,
        pageHeightMm: geometry.pageHeightMm,
        contentWidthMm: geometry.contentWidthMm,
        contentHeightMm: geometry.contentHeightMm,
        maxContentWidthPx: settings.maxContentWidth,
      });

      const pagedStyles = `
        ${buildPageRules(settings, orientation, { marginMm: geometry.marginMm })}

        :root {
          --md-export-content-width: ${geometry.contentWidthMm}mm;
          --md-export-content-height: ${geometry.contentHeightMm}mm;
        }

        .pagedjs_page {
          background-color: white;
          box-shadow: none;
          margin-bottom: 0;
          flex: none;
        }

        .pagedjs_pages {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0;
          width: 100%;
        }

        .pagedjs_page {
          ${cssVarString}
        }

        .pagedjs_page .prose-preview {
          ${cssVarString}
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          word-wrap: break-word;
        }

        .pagedjs_margin-content { font-size: 9pt; }

        .prose-preview {
          font-family: ${fontFamily};
          font-size: ${fontSize};
          line-height: ${lineHeight};
          color: ${textColor};
          background-color: #ffffff;
          width: 100%;
          max-width: min(var(--md-max-width, 900px), var(--md-export-content-width));
          box-sizing: border-box;
          margin: 0 auto;
          word-wrap: break-word;
        }

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

      const printFrameStyles = `
        html, body {
          margin: 0;
          padding: 0;
          background: white;
        }

        .print-root {
          width: ${geometry.pageWidthMm}mm;
          min-width: ${geometry.pageWidthMm}mm;
          margin: 0 auto;
          background: white;
        }

        .pagedjs_pages {
          display: block !important;
          padding: 0 !important;
          width: ${geometry.pageWidthMm}mm !important;
          margin: 0 auto !important;
        }

        .pagedjs_page {
          margin: 0 auto !important;
          box-shadow: none !important;
          break-after: page;
          page-break-after: always;
        }

        .pagedjs_page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
      `;

      hiddenRenderTarget = document.createElement('div');
      hiddenRenderTarget.setAttribute('aria-hidden', 'true');
      hiddenRenderTarget.style.position = 'fixed';
      hiddenRenderTarget.style.left = '-10000px';
      hiddenRenderTarget.style.top = '0';
      hiddenRenderTarget.style.width = `${geometry.contentWidthMm}mm`;
      hiddenRenderTarget.style.minHeight = `${geometry.contentHeightMm}mm`;
      hiddenRenderTarget.style.pointerEvents = 'none';
      hiddenRenderTarget.style.opacity = '0';
      document.body.appendChild(hiddenRenderTarget);

      const preExistingPagedStyles = new Set(
        Array.from(document.querySelectorAll('style[data-pagedjs-inserted-styles]'))
      );

      const stylesBlob = new Blob([pagedStyles], { type: 'text/css' });
      const stylesUrl = URL.createObjectURL(stylesBlob);

      try {
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'prose-preview';
        contentWrapper.innerHTML = processedHtml;
        contentWrapper.style.cssText = Object.entries(cssVars)
          .map(([key, val]) => `${key}: ${val}`)
          .join('; ');
        contentWrapper.style.width = '100%';
        contentWrapper.style.maxWidth = `${geometry.contentWidthMm}mm`;

        const previewer = new Previewer();
        exportPreviewer = previewer;
        const flow = await runPagedPreviewWithoutResizeObserver(() =>
          previewer.preview(contentWrapper, [stylesUrl], hiddenRenderTarget)
        );
        debugLog('paged flow summary', {
          pages: flow?.pages?.length,
          total: flow?.total,
          performanceMs: flow?.performance,
        });

        exportPagedStyleElements = Array.from(document.querySelectorAll('style[data-pagedjs-inserted-styles]'))
          .filter((styleEl): styleEl is HTMLStyleElement => !preExistingPagedStyles.has(styleEl));
      } finally {
        URL.revokeObjectURL(stylesUrl);
      }

      const renderedPages = hiddenRenderTarget.innerHTML;
      if (!renderedPages.trim()) {
        throw new Error('Paged export did not generate any printable pages');
      }

      if (exportDebugEnabled) {
        const debugContainer = document.createElement('div');
        debugContainer.innerHTML = renderedPages;
        debugLog('rendered page diagnostics', getPageDiagnostics(debugContainer));
      }

      // Create iframe for printing
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '1280px';
      iframe.style.height = '900px';
      iframe.style.border = 'none';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      const doc = iframeWindow?.document;
      if (!doc || !iframeWindow) throw new Error('Could not access iframe document');

      // Exclude stale pagedjs-generated styles from previous runs; we add only current export styles below.
      const existingStyles = Array.from(document.querySelectorAll('style:not([data-pagedjs-inserted-styles]), link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('');
      const currentPagedStyles = exportPagedStyleElements
        .map((el) => `<style data-pagedjs-inserted-styles>${el.textContent ?? ''}</style>`)
        .join('');

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${existingStyles}
  ${currentPagedStyles}
  <style>${pagedStyles}</style>
  <style>${printFrameStyles}</style>
</head>
<body>
  <div class="print-root">
    ${renderedPages}
  </div>
</body>
</html>`);
      doc.close();

      // Wait for content to render, then trigger print
      await new Promise<void>((resolve) => {
        const onLoad = async () => {
          await waitForPrintDocumentReady(iframeWindow, doc);

          if (exportDebugEnabled) {
            debugLog('iframe page diagnostics', getPageDiagnostics(doc));
          }

          setTimeout(() => {
            try {
              iframeWindow.focus();
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
        cleanup();
      }, 3000);

      setIsExporting(false);
      toast.dismiss(toastId);
      toast.success('Export completed');

    } catch (error) {
      cleanup();
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
      setIsExporting(false);
      toast.dismiss(toastId);
    }
  }, []);

  return { printPdf, isExporting };
};
