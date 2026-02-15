import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Toaster } from 'sonner';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { Toolbar } from './components/Toolbar';
import { StylesModal } from './components/StylesModal';
import { EditorView } from '@codemirror/view';
import { sanitizeHtml } from './lib/markdownEngine';
import { parseMarkdown } from './lib/markdownParser';
import { useExport } from './hooks/useExport';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ViewMode } from './types';
import { StyleSettings, DEFAULT_STYLE_SETTINGS } from './lib/styleSettings';
import { Printer, Save, RefreshCw, Palette } from 'lucide-react';
import clsx from 'clsx';
import { ErrorBoundary } from './components/ErrorBoundary';

const DEFAULT_MARKDOWN = `# Welcome to MKtoPDF

This is **Phase 6**: **Obsidian Features & Styling**.

## ✨ New Features

### Obsidian Callouts
Use \`> [!type] Title\` syntax for beautiful callout blocks:

> [!note] Note
> This is a note callout with useful information.

> [!tip] Pro Tip
> You can use **bold**, *italic*, and \`code\` inside callouts!

> [!warning] Be Careful
> This is a warning. Pay attention to this.

> [!danger] Red Flags
> * Outliers distort Pearson extremely!
> * $r=0$ only means "no *linear* relationship"

> [!success] All Tests Passing
> The application is fully functional.

> [!example] Example
> Here's how you use a code block inside a callout.

> [!question] FAQ
> How do I use callouts? Just start a blockquote with \`[!type]\`!

### Highlight Syntax
Use ==double equals== to highlight text.

### Math & Diagrams
$$
\\sum_{i=0}^n i^2 = \\frac{(n^2+n)(2n+1)}{6}
$$

\`\`\`mermaid
graph TD
    A[Markdown] -->|Worker| B(HTML)
    B -->|DOM| C{Preview}
    C -->|Print| D[PDF]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#69f,stroke:#333,stroke-width:2px
\`\`\`

### Task Lists
- [x] Mermaid diagrams
- [x] KaTeX math
- [x] Obsidian callouts
- [x] Style customization
- [ ] More features coming soon!

---

### Tables
| Feature | Status | Notes |
|---------|--------|-------|
| Callouts | ✅ Done | 12+ types |
| Highlights | ✅ Done | ==like this== |
| Style Modal | ✅ Done | Click the palette icon |
`;

const DEBOUNCE_MS = 300;

const App: React.FC = () => {
  // Persistence using localStorage
  const [markdownInput, setMarkdownInput] = useLocalStorage<string>('MD_DRAFT_BUFFER', DEFAULT_MARKDOWN);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('MD_VIEW_MODE', 'split');
  const [styleSettings, setStyleSettings] = useLocalStorage<StyleSettings>('MD_STYLE_SETTINGS', DEFAULT_STYLE_SETTINGS);

  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isStylesOpen, setIsStylesOpen] = useState(false);

  const { printPdf, isExporting } = useExport();

  // Worker and fallback references
  const workerRef = useRef<Worker | null>(null);
  const usingFallback = useRef<boolean>(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Main-thread fallback for when worker can't be used
  const processOnMainThread = useCallback(async (content: string) => {
    try {
      setIsProcessing(true);
      const rawHtml = await parseMarkdown(content);
      const cleanHtml = sanitizeHtml(rawHtml);
      setHtmlOutput(cleanHtml);
    } catch (error) {
      console.error("Main thread parsing error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Initialize Worker on mount
  useEffect(() => {
    try {
      let workerUrl: URL;

      if (typeof import.meta !== 'undefined' && import.meta.url) {
        workerUrl = new URL('./workers/markdown.worker.ts', import.meta.url);
      } else {
        workerUrl = new URL('./workers/markdown.worker.ts', window.location.origin + '/src/');
      }

      workerRef.current = new Worker(workerUrl, { type: 'module' });

      workerRef.current.onmessage = (e) => {
        const { type, html, message } = e.data;
        if (type === 'success') {
          const cleanHtml = sanitizeHtml(html);
          setHtmlOutput(cleanHtml);
          setIsProcessing(false);
        } else if (type === 'error') {
          console.error("Worker error:", message);
          setIsProcessing(false);
        }
      };

      workerRef.current.onerror = (e) => {
        console.error("Worker runtime error:", e);
      };

      // Initial process
      setIsProcessing(true);
      workerRef.current.postMessage(markdownInput);
    } catch (err) {
      console.warn("Failed to initialize worker, using main-thread fallback:", err);
      usingFallback.current = true;
      processOnMainThread(markdownInput);
    }

    return () => {
      workerRef.current?.terminate();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []); // Run once

  // Send updates to worker (debounced) when input changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (usingFallback.current) {
        processOnMainThread(markdownInput);
      } else if (workerRef.current) {
        setIsProcessing(true);
        workerRef.current.postMessage(markdownInput);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [markdownInput, processOnMainThread]);

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const handleExport = () => {
    const previewElement = document.querySelector('.prose-preview');
    const contentToPrint = previewElement ? previewElement.innerHTML : htmlOutput;
    printPdf(contentToPrint, orientation);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the document? This cannot be undone.")) {
      setMarkdownInput(DEFAULT_MARKDOWN);
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
        <Toaster position="bottom-right" richColors />
        <StylesModal
          isOpen={isStylesOpen}
          onClose={() => setIsStylesOpen(false)}
          settings={styleSettings}
          onSettingsChange={setStyleSettings}
        />
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              MKtoPDF
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">v0.6.0</span>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['editor', 'split', 'preview'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  "px-3 py-1 text-sm rounded-md transition-all capitalize",
                  viewMode === mode
                    ? "bg-white shadow-sm text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 justify-end">
            {isProcessing ? (
              <span className="text-xs text-gray-400 animate-pulse">Processing...</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Save size={12} /> Saved
              </span>
            )}

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={() => setIsStylesOpen(true)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Style Settings"
            >
              <Palette size={16} />
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Reset Document"
            >
              <RefreshCw size={16} />
            </button>

            <div className="flex items-center bg-gray-100 rounded-lg p-1 ml-2">
              <select
                className="bg-transparent text-xs font-medium text-gray-600 outline-none px-2 py-1 cursor-pointer"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-2"
            >
              {isExporting ? (
                <span className="animate-spin text-white">⟳</span>
              ) : (
                <Printer size={16} />
              )}
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden relative">

          {/* Editor Pane Container */}
          <div className={clsx(
            "h-full border-r border-gray-200 bg-white flex flex-col transition-all duration-300 ease-in-out",
            viewMode === 'preview' ? "hidden" : "block",
            viewMode === 'split' ? "w-1/2" : "w-full"
          )}>
            {/* Toolbar - Only visible in editor/split mode */}
            <Toolbar editorView={editorView} />

            <div className="flex-1 overflow-hidden">
              <EditorPane
                content={markdownInput}
                onChange={setMarkdownInput}
                onEditorMount={setEditorView}
              />
            </div>
          </div>

          {/* Preview Pane Container */}
          <div className={clsx(
            "h-full bg-gray-50 transition-all duration-300 ease-in-out",
            viewMode === 'editor' ? "hidden" : "block",
            viewMode === 'split' ? "w-1/2" : "w-full"
          )}>
            <PreviewPane htmlContent={htmlOutput} styleSettings={styleSettings} />
          </div>

        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
