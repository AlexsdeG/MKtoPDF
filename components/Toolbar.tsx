import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Bold, Italic, Strikethrough, Underline,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code, Link, Minus, Image,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Table, Palette,
  Type, Superscript, Subscript, FileText,
  Paintbrush, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';

interface ToolbarProps {
  editorView: EditorView | null;
  onOpenPagePreview?: () => void;
}

const FONT_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Fira Code', value: 'Fira Code, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const SIZE_OPTIONS = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
];

const PARAGRAPH_OPTIONS = [
  { label: 'P', prefix: '', blockMode: false },
  { label: 'H1', prefix: '#', blockMode: true },
  { label: 'H2', prefix: '##', blockMode: true },
  { label: 'H3', prefix: '###', blockMode: true },
  { label: 'H4', prefix: '####', blockMode: true },
];

/**
 * Portal to render dropdowns outside the overflow:hidden container
 */
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

export const Toolbar: React.FC<ToolbarProps> = ({ editorView, onOpenPagePreview }) => {
  // Use unique keys for dropdown management
  // null = no dropdown open
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Specific states for color pickers (managed as dropdowns too)
  const [textColor, setTextColor] = useState('#ff0000');
  const [bgColor, setBgColor] = useState('#ffff00');

  // We need refs to the trigger buttons to position the portal content
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Close dropdowns on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is inside the active dropdown content
      const dropdownContent = document.getElementById('toolbar-active-dropdown');
      if (dropdownContent && dropdownContent.contains(e.target as Node)) {
        return;
      }

      // Check if click is on the trigger button
      if (activeDropdown && buttonRefs.current[activeDropdown]?.contains(e.target as Node)) {
        return;
      }

      setActiveDropdown(null);
    };

    const handleScroll = (e: Event) => {
      // Close dropdowns on scroll to avoid detached positioning
      // But allow scrolling INSIDE the dropdown itself
      const dropdownContent = document.getElementById('toolbar-active-dropdown');
      if (dropdownContent && dropdownContent.contains(e.target as Node)) {
        return;
      }
      if (activeDropdown) setActiveDropdown(null);
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScroll);
      window.addEventListener('scroll', handleScroll, true); // Capture phase for all scrollable elements
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdown]);

  const toggleDropdown = (key: string) => {
    setActiveDropdown(activeDropdown === key ? null : key);
  };

  const getDropdownPosition = (key: string) => {
    const button = buttonRefs.current[key];
    if (!button) return { top: 0, left: 0 };
    const rect = button.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    };
  };

  const executeCommand = (
    prefix: string,
    suffix: string = '',
    blockMode: boolean = false
  ) => {
    if (!editorView) return;

    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const from = selection.from;
    const to = selection.to;

    if (from !== to) {
      const selectedText = state.sliceDoc(from, to);
      const replacement = `${prefix}${selectedText}${suffix}`;

      dispatch(state.update({
        changes: { from, to, insert: replacement },
        selection: { anchor: from + prefix.length + selectedText.length + suffix.length }
      }));
      editorView.focus();
      setActiveDropdown(null);
      return;
    }

    if (blockMode) {
      const line = state.doc.lineAt(from);
      const lineText = line.text;

      if (!lineText.trim()) {
        dispatch(state.update({
          changes: { from: line.from, to: line.to, insert: `${prefix} ` },
          selection: { anchor: line.from + prefix.length + 1 }
        }));
      } else {
        dispatch(state.update({
          changes: { from: line.from, insert: `${prefix} ` },
          selection: { anchor: from + prefix.length + 1 }
        }));
      }
    } else {
      const placeholder = "text";
      dispatch(state.update({
        changes: { from, to, insert: `${prefix}${placeholder}${suffix}` },
        selection: { anchor: from + prefix.length, head: from + prefix.length + placeholder.length }
      }));
    }

    editorView.focus();
    setActiveDropdown(null);
  };

  const wrapHtml = (tag: string, attrs: string = '') => {
    if (!editorView) return;
    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const from = selection.from;
    const to = selection.to;
    const selectedText = state.sliceDoc(from, to) || 'text';
    const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
    const close = `</${tag}>`;
    const insert = `${open}${selectedText}${close}`;

    dispatch(state.update({
      changes: { from, to, insert },
      selection: { anchor: from + open.length, head: from + open.length + selectedText.length }
    }));
    editorView.focus();
    setActiveDropdown(null);
  };

  const insertTextColor = (color: string) => {
    wrapHtml('span', `style="color:${color}"`);
  };

  const insertBgColor = (color: string) => {
    wrapHtml('span', `style="background-color:${color};padding:0.1em 0.2em;border-radius:3px"`);
  };

  const insertFontFamily = (font: string) => {
    if (!font) return;
    wrapHtml('span', `style="font-family:${font}"`);
  };

  const insertFontSize = (size: string) => {
    if (!size) return;
    wrapHtml('span', `style="font-size:${size}"`);
  };

  const insertAlignment = (align: string) => {
    if (!editorView) return;
    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const from = selection.from;
    const to = selection.to;
    const selectedText = state.sliceDoc(from, to) || 'text';
    const insert = `<div style="text-align:${align}">${selectedText}</div>`;

    dispatch(state.update({
      changes: { from, to, insert },
      selection: { anchor: from + `<div style="text-align:${align}">`.length, head: from + `<div style="text-align:${align}">`.length + selectedText.length }
    }));
    editorView.focus();
  };

  const wrapLink = () => {
    if (!editorView) return;
    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const selectedText = state.sliceDoc(selection.from, selection.to);
    const text = selectedText || "link";
    const insert = `[${text}](url)`;
    dispatch(state.update({
      changes: { from: selection.from, to: selection.to, insert },
      selection: { anchor: selection.from + text.length + 3, head: selection.from + text.length + 6 }
    }));
    editorView.focus();
  };

  const insertImage = () => {
    if (!editorView) return;
    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const insert = `![alt text](image-url)`;
    dispatch(state.update({
      changes: { from: selection.from, to: selection.to, insert },
      selection: { anchor: selection.from + 2, head: selection.from + 10 }
    }));
    editorView.focus();
  };

  const insertTable = () => {
    if (!editorView) return;
    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const insert = `\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n`;
    dispatch(state.update({
      changes: { from: selection.from, to: selection.to, insert },
      selection: { anchor: selection.from + insert.length }
    }));
    editorView.focus();
  };

  const insertPageBreak = () => {
    if (!editorView) return;
    const state = editorView.state;
    const dispatch = editorView.dispatch;
    const selection = state.selection.main;
    const insert = `\n<div class="page-break"></div>\n`;
    dispatch(state.update({
      changes: { from: selection.from, to: selection.to, insert },
      selection: { anchor: selection.from + insert.length }
    }));
    editorView.focus();
  };

  const handleUndo = () => { if (editorView) { undo(editorView); editorView.focus(); } };
  const handleRedo = () => { if (editorView) { redo(editorView); editorView.focus(); } };

  const IconButton = ({ icon: Icon, onClick, title, active, className: extraClass, dropdownKey }: any) => {
    return (
      <button
        ref={el => { if (dropdownKey) buttonRefs.current[dropdownKey] = el; }}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        title={title}
        className={clsx(
          "p-1.5 rounded-md transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          active
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900",
          extraClass
        )}
      >
        <Icon size={16} strokeWidth={2.5} />
      </button>
    );
  };

  const Separator = () => <div className="w-px h-5 bg-gray-300 mx-0.5" />;

  const DropdownButton = ({ label, title, dropdownKey, active }: { label: string; title?: string; dropdownKey: string, active?: boolean }) => {
    return (
      <button
        ref={el => { buttonRefs.current[dropdownKey] = el; }}
        onClick={() => toggleDropdown(dropdownKey)}
        title={title}
        className={clsx(
          "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors",
          active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"
        )}
      >
        {label}
        <ChevronDown size={12} />
      </button>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 overflow-x-auto p-1.5 bg-white border-b border-gray-200 shadow-sm no-scrollbar relative z-30">
        
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton icon={Undo2} onClick={handleUndo} title="Undo" />
          <IconButton icon={Redo2} onClick={handleRedo} title="Redo" />
        </div>

        <Separator />

        {/* Paragraph Type */}
        <div className="flex items-center px-0.5">
          <DropdownButton label="P" title="Paragraph Style" dropdownKey="paragraph" active={activeDropdown === 'paragraph'} />
        </div>

        <Separator />

        {/* Font family */}
        <div className="flex items-center px-0.5">
          <DropdownButton label="Font" title="Font Family" dropdownKey="font" active={activeDropdown === 'font'} />
        </div>

        {/* Font size */}
        <div className="flex items-center px-0.5">
          <DropdownButton label="Size" title="Font Size" dropdownKey="size" active={activeDropdown === 'size'} />
        </div>

        <Separator />

        {/* Inline formatting */}
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton icon={Bold} onClick={() => executeCommand('**', '**')} title="Bold" />
          <IconButton icon={Italic} onClick={() => executeCommand('*', '*')} title="Italic" />
          <IconButton icon={Strikethrough} onClick={() => executeCommand('~~', '~~')} title="Strikethrough" />
          <IconButton icon={Underline} onClick={() => wrapHtml('u')} title="Underline" />
          <IconButton icon={Code} onClick={() => executeCommand('`', '`')} title="Inline Code" />
        </div>

        <Separator />

        {/* Text Color */}
        <div className="flex items-center px-0.5">
          <button
            ref={el => { buttonRefs.current['textColor'] = el; }}
            onClick={() => toggleDropdown('textColor')}
            title="Text Color"
            className={clsx(
              "flex items-center gap-0.5 p-1.5 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors",
              activeDropdown === 'textColor' && "bg-gray-200"
            )}
          >
            <Type size={16} strokeWidth={2.5} />
            <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: textColor }} />
          </button>
        </div>

        {/* Background Color */}
        <div className="flex items-center px-0.5">
           <button
            ref={el => { buttonRefs.current['bgColor'] = el; }}
            onClick={() => toggleDropdown('bgColor')}
            title="Background Color"
            className={clsx(
              "flex items-center gap-0.5 p-1.5 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors",
               activeDropdown === 'bgColor' && "bg-gray-200"
            )}
          >
            <Paintbrush size={16} strokeWidth={2.5} />
            <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: bgColor }} />
          </button>
        </div>

        <Separator />

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton icon={AlignLeft} onClick={() => insertAlignment('left')} title="Align Left" />
          <IconButton icon={AlignCenter} onClick={() => insertAlignment('center')} title="Align Center" />
          <IconButton icon={AlignRight} onClick={() => insertAlignment('right')} title="Align Right" />
          <IconButton icon={AlignJustify} onClick={() => insertAlignment('justify')} title="Align Justify" />
        </div>

        <Separator />

        {/* Lists */}
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton icon={List} onClick={() => executeCommand('-', '', true)} title="Bulleted List" />
          <IconButton icon={ListOrdered} onClick={() => executeCommand('1.', '', true)} title="Numbered List" />
          <IconButton icon={CheckSquare} onClick={() => executeCommand('- [ ]', '', true)} title="Task List" />
        </div>

        <Separator />

        {/* Headings */}
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton icon={Heading1} onClick={() => executeCommand('#', '', true)} title="Heading 1" />
          <IconButton icon={Heading2} onClick={() => executeCommand('##', '', true)} title="Heading 2" />
          <IconButton icon={Heading3} onClick={() => executeCommand('###', '', true)} title="Heading 3" />
        </div>

        <Separator />

        {/* Insert */}
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton icon={Link} onClick={wrapLink} title="Link" />
          <IconButton icon={Image} onClick={insertImage} title="Image" />
          <IconButton icon={Quote} onClick={() => executeCommand('>', '', true)} title="Quote" />
          <IconButton icon={Table} onClick={insertTable} title="Table" />
          <IconButton icon={Minus} onClick={() => executeCommand('---\n', '', true)} title="Horizontal Rule" />
          <IconButton icon={Superscript} onClick={() => wrapHtml('sup')} title="Superscript" />
          <IconButton icon={Subscript} onClick={() => wrapHtml('sub')} title="Subscript" />
        </div>

        <Separator />

        {/* Page preview */}
        <div className="flex items-center gap-0.5 px-0.5">
           <IconButton icon={FileText} onClick={insertPageBreak} title="Insert Page Break" />
           {onOpenPagePreview && (
            <IconButton icon={Palette} onClick={onOpenPagePreview} title="Page Preview" />
           )}
        </div>
      </div>

      {/* Render Dropdowns via Portal */}
      {activeDropdown && (
        <Portal>
          <div
            id="toolbar-active-dropdown"
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] py-1 max-h-60 overflow-y-auto min-w-[160px]"
            style={{
              top: getDropdownPosition(activeDropdown).top,
              left: getDropdownPosition(activeDropdown).left,
            }}
          >
            {activeDropdown === 'paragraph' && (
              PARAGRAPH_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => executeCommand(opt.prefix, '', opt.blockMode)}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {opt.label}
                </button>
              ))
            )}
            
            {activeDropdown === 'font' && (
              FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => insertFontFamily(opt.value)}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  style={opt.value ? { fontFamily: opt.value } : undefined}
                >
                  {opt.label}
                </button>
              ))
            )}

            {activeDropdown === 'size' && (
              SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => insertFontSize(opt.value)}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {opt.label}
                </button>
              ))
            )}

            {activeDropdown === 'textColor' && (
              <div className="p-3 flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500">Text Color</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                  style={{ padding: 0 }}
                />
                <button
                  onClick={() => { insertTextColor(textColor); setActiveDropdown(null); }}
                  className="w-full px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            )}

            {activeDropdown === 'bgColor' && (
              <div className="p-3 flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500">Highlight Color</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                  style={{ padding: 0 }}
                />
                <button
                  onClick={() => { insertBgColor(bgColor); setActiveDropdown(null); }}
                  className="w-full px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            )}

          </div>
        </Portal>
      )}
    </>
  );
};
