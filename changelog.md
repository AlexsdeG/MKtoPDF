# Changelog

## [0.6.2] - 2024-02-15

### Added
- **Advanced Page Preview**: Integrated `pagedjs` for accurate pagination preview (A4 Portrait/Landscape). Page breaks and layout now simulate PDF output exactly.
- **Improved PDF Export**: PDF export now uses `pagedjs` rendering engine via polyfill injection, ensuring consistent layout, margins, and page breaks.
- **Header & Footer Customization**: Added new "Header & Footer" tab in Style Settings. Supports custom Left/Center/Right text and page numbers (`counter(page)`).
- **Synchronized Scrolling**: Editor and Preview scroll positions are now synchronized in Split View. Includes a toolbar toggle button.

### Fixed
- **Toolbar Dropdown Scroll**: Fixed issue where scrolling inside a dropdown would close it.
- **Page Breaks**: Manual page breaks (`<div class="page-break"></div>`) and automatic pagination now work correctly in both preview and export.

## [0.6.1] - 2024-02-15

### Added
- **Page Preview Modal**: Visualize page breaks and layout in a paginated view.
- **Rich Text Toolbar**: Redesigned toolbar with text color, fonts, undo/redo, etc.
- **Improved Dropdowns**: Toolbar dropdowns now use Portals to fix clipping.
- **Rich Text HTML Support**: Markdown engine supports inline HTML styles.

### Changed
- Updated App header with document title editing.
- Enhanced StylesModal with heading/paragraph color overrides.

## [0.0.5] - Previous

### Added
- PDF export via iframe print.
- Auto-saving, Markdown syntax highlighting, Mermaid, KaTeX.
