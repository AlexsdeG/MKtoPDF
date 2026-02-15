import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { Toolbar } from './components/Toolbar';
import { sanitizeHtml } from './lib/markdownEngine';
import { parseMarkdown } from './lib/markdownParser';
import { useExport } from './hooks/useExport';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ViewMode } from './types';
import { Printer, Save, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { ErrorBoundary } from './components/ErrorBoundary';

const DEFAULT_MARKDOWN = `# Welcome to MKtoPDF

This is **Phase 5**: **Privacy & Performance**.

## Persistence
- Reload the page! Your text and view settings are saved locally.

## Performance
- Typing is now processed in a **Web Worker**. 
- The UI stays responsive even with heavy documents.

## Math & Diagrams
$$
\\\\sum_{i=0}^n i^2 = \\\\frac{(n^2+n)(2n+1)}{6}
$$

\\\`\\\`\\\`mermaid
graph TD
    User -->|Types| Editor
    Editor -->|Worker| Engine
    Engine -->|HTML| Preview
\\\`\\\`\\\`
`;

const DEBOUNCE_MS = 300;

const App: React.FC = () => {
  // Phase 5: Persistence using localStorage
  const [markdownInput, setMarkdownInput] = useLocalStorage<string>('MD_DRAFT_BUFFER', DEFAULT_MARKDOWN);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('MD_VIEW_MODE', 'split');

  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [editorView, setEditorView] = useState<any>(null);

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

  const handleExport = () => {
    const previewElement = document.querySelector('.prose-preview');
    const contentToPrint = previewElement ? previewElement.innerHTML : htmlOutput;
    printPdf(contentToPrint);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the document? This cannot be undone.")) {
      setMarkdownInput(DEFAULT_MARKDOWN);
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              MKtoPDF
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">v0.0.5</span>
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
              onClick={handleReset}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Reset Document"
            >
              <RefreshCw size={16} />
            </button>

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
            <PreviewPane htmlContent={htmlOutput} />
          </div>

        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
