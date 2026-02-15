# 🧠 knowledge.md: Markdown-to-PDF Web Engine

## 1. Project Overview

A privacy-first, client-side Markdown editor and PDF generator. No data ever leaves the browser.

* **Target User:** Researchers, students, and AI power-users needing professional PDFs from raw Markdown.
* **Unique Selling Point (USP):** 100% private, supports LaTeX, Mermaid diagrams, and professional paging (no broken tables/code blocks).

---

## 2. System Architecture

* **Frontend:** React (Next.js or Vite).
* **State Management:** React Context or Zustand (to sync Editor  Preview).
* **Core Engine:** A modular pipeline:
1. **Editor (CodeMirror 6):** Captures raw string.
2. **Parser (Unified/Remark):** Converts MD to MDAST (Abstract Syntax Tree).
3. **Transformers:** Inject Math (KaTeX) and Diagrams (Mermaid).
4. **Renderer (Rehype):** Converts AST to HTML.
5. **Print Engine (Paged.js):** Applies CSS Paged Media rules for PDF output.



---

## 3. Technical Stack (NPM Packages)

| Category | Package | Purpose |
| --- | --- | --- |
| **Framework** | `next` or `vite` | App structure and HMR. |
| **Editor** | `@uiw/react-codemirror` | Highly customizable CM6 wrapper. |
| **Parsing** | `unified`, `remark-parse`, `remark-gfm` | Professional Markdown parsing. |
| **HTML Conversion** | `remark-rehype`, `rehype-stringify` | Convert MD tree to HTML. |
| **Math** | `remark-math`, `rehype-katex` | LaTeX support (). |
| **Diagrams** | `mermaid` | Text-to-diagrams. |
| **PDF Layout** | `pagedjs` | Handle page breaks, headers, footers. |
| **Security** | `dompurify` | Sanitize HTML before rendering. |
| **Utilities** | `lucide-react`, `clsx`, `tailwind-merge` | UI icons and styling. |

---

## 4. Implementation Snippets

### A. The Unified Pipeline (The Heart)

```javascript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

export async function processMarkdown(content) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm) // Tables, Tasklists
    .use(remarkMath) // $...$
    .use(remarkRehype)
    .use(rehypeKatex) // Render Math
    .use(rehypeStringify)
    .process(content);
  return String(result);
}

```

### B. Split View Logic

State should manage three modes: `split`, `editor`, and `preview`.

```typescript
type ViewMode = 'split' | 'editor' | 'preview';

const [viewMode, setViewMode] = useState<ViewMode>('split');

// Tailind Layout Example
<div className={clsx(
  "grid h-full",
  viewMode === 'split' ? "grid-cols-2" : "grid-cols-1"
)}>
  {(viewMode === 'split' || viewMode === 'editor') && <EditorPane />}
  {(viewMode === 'split' || viewMode === 'preview') && <PreviewPane />}
</div>

```

---

## 5. Feature Implementation Details

### 📊 Mermaid Diagrams

* **Trigger:** Code blocks with the language `mermaid`.
* **Implementation:** Use a custom component in the previewer that calls `mermaid.render` on the text content of the code block.

### 🖨️ PDF Export (Paged.js)

* **Challenge:** Standard `window.print()` cuts off content.
* **Solution:** Paged.js polyfills CSS Paged Media.
* **Workflow:**
1. Copy the Preview HTML into a hidden "Print Container."
2. Invoke `Paged.Previewer`.
3. Call `window.print()`.



### 🛡️ Security (XSS)

* **Critical:** Even though it's client-side, an attacker could trick a user into pasting malicious MD.
* **Action:** Always wrap the final HTML in `DOMPurify.sanitize(html)`.

---

## 6. CSS & Theming (Global)

Use Tailwind for the UI, but separate **Print Styles** in a dedicated CSS file.

```css
@media print {
  @page {
    size: A4;
    margin: 20mm;
  }
  .no-print { display: none; }
  pre, blockquote { page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
}

```

---

## 7. Configuration & Environment

* **`.env` Keys:** No backend keys needed (Privacy First).
* **Storage:** Use `localStorage` to save the user's current draft under the key `MD_DRAFT_BUFFER`.

---

## 8. Attention Points (The "Gotchas")

1. **Hydration Errors:** When using Next.js, ensure the Markdown preview only renders on the client (`useEffect` or `dynamic` import with `ssr: false`).
2. **Performance:** Large Mermaid diagrams can freeze the UI. Use `requestIdleCallback` or a Web Worker for parsing heavy content.
3. **Image Blobs:** Since there's no server, users must use URLs or upload images as **Base64** strings directly into the MD content.
4. **Math Escaping:** LaTeX backslashes (`\`) can sometimes be swallowed by the MD parser. Ensure `remark-math` is loaded early in the pipeline.
