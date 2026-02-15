# 🗺️ plan.md: Execution Roadmap

## 📂 Project Structure

```text
/root
├── /public              # Static assets (fonts, favicons)
├── /src
│   ├── /components      # React Components
│   │   ├── /layout      # Navbar, Sidebar, Toolbars
│   │   ├── /editor      # CodeMirror wrappers
│   │   ├── /preview     # Markdown/Math/Mermaid renderers
│   │   └── /ui          # Shadcn/Radix UI primitives
│   ├── /hooks           # useMarkdown, useLocalStorage, useExport
│   ├── /lib             # Parser logic (Unified, Remark, Rehype)
│   ├── /styles          # Global CSS & Print-specific CSS
│   ├── /types           # TypeScript interfaces
│   └── /utils           # Helpers (slugify, base64 conversion)
├── /tests               # Playwright/Vitest test suites
├── tailwind.config.js
└── next.config.js       # Or vite.config.ts

```

---

## 🚀 Phase 1: Core Foundation & Processing Pipeline

**Goal:** Establish the transformation engine that turns raw text into sanitized HTML.

### Step 1.1: Setup Unified Pipeline

* **Where:** `src/lib/markdown-engine.ts`
* **What:** Implement the `processor` using `unified`, `remark-parse`, `remark-gfm`, and `rehype-stringify`.
* **Edge Case:** Handle empty strings and deeply nested markdown lists.
* **Test:** Unit test to verify GFM tables render as `<table>` tags.

### Step 1.2: Integration of KaTeX (Math)

* **Where:** `src/lib/markdown-engine.ts`
* **What:** Add `remark-math` and `rehype-katex` to the pipeline.
* **Goal:** Inline `$E=mc^2$` and block `$$...$$` must render.
* **Test:** Verify that `$` symbols not used for math (e.g., "$100") are not incorrectly parsed.

### Step 1.3: HTML Sanitization

* **Where:** `src/lib/markdown-engine.ts`
* **What:** Wrap the output in `dompurify`.
* **Goal:** Prevent `<script>` injection.
* **Test:** Input `<script>alert(1)</script>` must be stripped from the output.

---

## 🎨 Phase 2: The Modern Editor UI

**Goal:** Build a high-performance editor with a responsive split-view.

### Step 2.1: CodeMirror 6 Implementation

* **Where:** `src/components/editor/EditorPane.tsx`
* **What:** Setup `@uiw/react-codemirror` with Markdown extensions.
* **Goal:** Line numbers, syntax highlighting, and auto-closing brackets.
* **Test:** Ensure the `onChange` callback captures every keystroke efficiently.

### Step 2.2: Split-View & Layout Logic

* **Where:** `src/components/layout/MainLayout.tsx`
* **What:** Use a state variable `viewMode: 'editor' | 'preview' | 'split'`.
* **Goal:** A toggle button that hides/shows panes via CSS grid.
* **Test:** Verify that toggling to "Preview Only" unmounts or hides the Editor pane to save resources.

### Step 2.3: The Markdown Toolbar

* **Where:** `src/components/layout/Toolbar.tsx`
* **What:** Buttons for **B**, *I*, [Link], `Code`, etc.
* **Goal:** Clicking a button inserts the Markdown syntax at the current cursor position in CodeMirror.
* **Test:** Focus remains on the editor after clicking a toolbar button.

---

## 📊 Phase 3: Advanced Rendering

**Goal:** Support complex elements like Mermaid and code highlighting.

### Step 3.1: Mermaid.js Integration

* **Where:** `src/components/preview/MermaidRenderer.tsx`
* **What:** Create a component that targets `pre.mermaid` blocks and calls `mermaid.contentLoaded()`.
* **Goal:** Live rendering of flowcharts within the preview.
* **Test:** If Mermaid syntax is invalid, show a graceful error message instead of crashing the app.

### Step 3.2: Syntax Highlighting for Code Blocks

* **Where:** `src/lib/markdown-engine.ts`
* **What:** Add `rehype-highlight` (using highlight.js or prism).
* **Goal:** Colorful code snippets for 100+ languages.
* **Test:** Verify that unknown languages don't break the renderer.

---

## 🖨️ Phase 4: PDF Export & Paging

**Goal:** Achieve professional document layout with headers/footers.

### Step 4.1: CSS Paged Media Setup

* **Where:** `src/styles/print.css`
* **What:** Define `@page` rules, margins, and page-break logic (`page-break-inside: avoid`).
* **Goal:** Clean A4 layout.
* **Test:** Ensure the toolbar and editor UI are hidden during `window.print()`.

### Step 4.2: Paged.js Integration

* **Where:** `src/hooks/useExport.ts`
* **What:** Use the `Paged.Previewer` to paginate the preview HTML.
* **Goal:** Real-time "Print Preview" that shows page numbers and footer metadata.
* **Test:** Large tables must either fit on one page or break cleanly with a repeated header (if supported).

---

## 🔒 Phase 5: Privacy, Performance & Persistence

**Goal:** Ensure 100% offline-first, private operation.

### Step 5.1: LocalStorage Sync

* **Where:** `src/hooks/useLocalStorage.ts`
* **What:** Debounced save of editor content to `MD_DRAFT_BUFFER`.
* **Goal:** Data survives browser refresh.
* **Test:** Reloading the page restores the exact text and view mode.

### Step 5.2: Web Worker Offloading

* **Where:** `src/workers/markdown.worker.ts`
* **What:** Move the Unified/Rehype processing to a separate thread.
* **Goal:** Main thread (UI) remains responsive during heavy typing.
* **Test:** Measure "Time to Interactive" during rapid typing of a 5000-word document.

---

## ✅ Global Testing Structure

Run these checks after every phase:

1. **Unit Tests (`vitest`):** Check Markdown-to-HTML conversion accuracy.
2. **E2E Tests (`playwright`):**
* Test "Type in Editor -> Check Preview Update."
* Test "Click Toolbar Bold -> Check Text Wrap."
* Test "Switch to Preview Mode -> Check Editor Hidden."


3. **Edge Case Suite:** * Nested LaTeX inside a GFM Table.
* Excessively large Mermaid diagrams.
* Pasting 10MB of raw text.
