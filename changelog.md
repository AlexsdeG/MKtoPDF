# Changelog

All notable changes to this project will be documented in this file.

## [0.0.5] - 2024-05-22
### Added
- **Phase 5: Privacy, Performance & Persistence**
  - **Offline Persistence**: Implemented `useLocalStorage` to automatically save the user's draft (`MD_DRAFT_BUFFER`) and view mode preference (`MD_VIEW_MODE`).
  - **Web Worker Offloading**: Moved the heavy Markdown transformation pipeline (Unified/Remark/Rehype) to a separate Web Worker thread (`src/workers/markdown.worker.ts`) to keep the UI responsive during typing.
  - **Sanitization Split**: Separated HTML sanitization to the main thread (DOM access required) while keeping parsing in the worker.

## [0.0.4] - 2024-05-22
### Added
- **Phase 4: PDF Export & Paging**
  - Integrated `pagedjs` for professional PDF generation with pagination.
  - Added `useExport` hook to handle the printing workflow.
  - Created `src/styles/print.css` for `@page` layout definitions.
  - Added "Export PDF" button to the header.
  - Implemented iframe-based print isolation to prevent UI conflicts.

## [0.0.3] - 2024-05-22
### Added
- **Phase 3: Advanced Rendering**
  - **Syntax Highlighting**: Integrated `rehype-highlight` to support colorful code blocks for common languages (JS, Python, CSS, etc.).
  - **Mermaid Diagrams**: Added client-side rendering for `mermaid` code blocks (flowcharts, sequence diagrams, etc.) in the Preview pane.
- **Fixes**:
  - Fixed KaTeX "Quirks Mode" warning by enforcing strict DOCTYPE.
  - Resolved React versioning issues in `importmap`.

## [0.0.2] - 2024-05-22
### Added
- **Phase 2: Modern Editor & Toolbar**
  - Integrated `@uiw/react-codemirror` (CodeMirror 6) for a rich editing experience.
  - Added syntax highlighting for Markdown.
  - Implemented a Toolbar with formatting actions:
    - Bold, Italic, Strikethrough
    - Headers (H1, H2, H3)
    - Lists (Bullet, Numbered, Task)
    - Blockquotes, Code Blocks, Links, and Horizontal Rules.
  - Refined Split-View layout logic.

## [0.0.1] - 2024-05-22
### Added
- Initial project structure.
- Phase 1: Core Markdown processing pipeline.
  - Integration of `unified`, `remark-parse`, `remark-gfm`.
  - Math support via `remark-math` and `rehype-katex`.
  - HTML sanitization using `dompurify`.
- Basic Editor and Preview components for testing the pipeline.
- Unit tests for the markdown engine.
- Documentation files (`knowledge.md`, `plan.md`).
