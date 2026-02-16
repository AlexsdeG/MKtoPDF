# Changelog

## [0.6.5] - 2026-02-16

### Fixed
- **Page Break**: `<div class="page-break">` now correctly triggers `break-before: page` / `page-break-before: always` in both print preview and PDF export.
- **Preview Modal Blank on First Open**: Fixed the PagedJS render effect not firing on initial modal open — content now renders immediately.
- **Export "item doesn't belong to list" Error**: Fixed PagedJS `Previewer` crash by creating fresh instances and running post-processing before pagination.
- **`==text==` Highlight Syntax**: Added `preprocessMarkdown()` step that converts `==text==` to `<mark>text</mark>` before parsing, enabling the yellow highlight styling.
- **Obsidian Callout Blocks**: `> [!type] Title` syntax now renders as styled callout boxes with icons, colors, and proper structure (note, tip, warning, danger, etc.).
- **Mermaid Diagrams**: Mermaid code blocks are now rendered as interactive SVG diagrams instead of showing as raw code blocks.
- **Rich Text in PDF**: Verified that inline HTML styles (color, font-size, font-family) survive DOMPurify sanitization and render in PDF exports — added callout, mark, and code-label CSS to export styles.

### Added
- **Code Block Language Labels**: Fenced code blocks with a specified language (e.g. ```javascript) now display the language name as an uppercase label above the code block.
- **Page Break Indicator Lines**: New toggle button (ruler icon) in the header to show dotted page-boundary lines in the preview pane with page numbers, helping visually plan PDF page layout. Calculation adapts to Portrait/Landscape orientation.

## [0.6.4] - 2024-02-16

### Fixed

- **PagedJS Export Crashes**: Resolved "item doesn't belong to list" and "nextSibling is null" errors during PDF export. We switched to direct CSS interpolation for `@page` content (avoiding `var()` issues) and now inject styles via Blob URLs for better stability.
- **Preview Orientation Sync**: The preview modal now correctly opens in the orientation selected in the main toolbar, instead of defaulting to portrait.
- **Style Injection**: Improved how dynamic styles are injected into the previewer to prevent parsing errors.

## [0.6.3] - 2024-02-16

### Fixed
- **Critical PDF Export Bug**: Fixed an issue where the print dialog would capture the preview modal UI instead of the document content. Export now correctly targets the generated PDF content.
- **Preview Line Breaks**: Added `white-space: pre-wrap` to preview and print styles, ensuring empty lines and manual breaks are preserved.
- **Preview Orientation**: Added toggle for Portrait/Landscape inside the preview modal.

### Changed
- **UI**: Moved "Page Preview" button from the editor toolbar to the main header (next to Export) for better visibility.

## [0.6.2] - 2024-02-15

### Added
- **Advanced Page Preview**: Integrated `pagedjs` for accurate pagination.
- **Improved PDF Export**: PDF export uses `pagedjs` rendering.
- **Header & Footer**: Custom customization via Style Settings.
- **Synchronized Scrolling**: Sync editor and preview scroll.

### Fixed
- **Toolbar Dropdown Scroll**: Fixed closing on scroll.
- **Page Breaks**: Manual page breaks now working.
- **Import Error**: Resolved `pagedjs` polyfill import issue.

## [0.6.1] - 2024-02-15

### Added
- **Page Preview Modal**: Visualize page breaks.
- **Rich Text Toolbar**: Redesigned toolbar.
- **Portal Dropdowns**: Fixed clipping issues.
