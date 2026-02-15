import React, { useState, useRef, useEffect } from 'react';
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

export const Toolbar: React.FC<ToolbarProps> = ({ editorView, onOpenPagePreview }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [textColor, setTextColor] = useState('#ff0000');
  const [bgColor, setBgColor] = useState('#ffff00');
  const colorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);

  // Close color pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
        setShowBgColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      selection: {
        anchor: selection.from + text.length + 3,
        head: selection.from + text.length + 6
      }
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

  const handleUndo = () => {
    if (!editorView) return;
    undo(editorView);
    editorView.focus();
  };

  const handleRedo = () => {
    if (!editorView) return;
    redo(editorView);
    editorView.focus();
  };

  const IconButton = ({ icon: Icon, onClick, title, active, className: extraClass }: any) => (
    <button
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

  const Separator = () => <div className="w-px h-5 bg-gray-300 mx-0.5" />;

  const Dropdown = ({ children, label, title }: { children: React.ReactNode; label: string; title?: string }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          title={title}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
        >
          {label}
          <ChevronDown size={12} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[140px] py-1 max-h-60 overflow-y-auto">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 overflow-x-auto p-1.5 bg-white border-b border-gray-200 shadow-sm no-scrollbar">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 px-0.5">
        <IconButton icon={Undo2} onClick={handleUndo} title="Undo" />
        <IconButton icon={Redo2} onClick={handleRedo} title="Redo" />
      </div>

      <Separator />

      {/* Paragraph Type */}
      <div className="flex items-center px-0.5">
        <Dropdown label="P" title="Paragraph Style">
          {PARAGRAPH_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => executeCommand(opt.prefix, '', opt.blockMode)}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              {opt.label}
            </button>
          ))}
        </Dropdown>
      </div>

      <Separator />

      {/* Font family */}
      <div className="flex items-center px-0.5">
        <Dropdown label="Font" title="Font Family">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => insertFontFamily(opt.value)}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              style={opt.value ? { fontFamily: opt.value } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </Dropdown>
      </div>

      {/* Font size */}
      <div className="flex items-center px-0.5">
        <Dropdown label="Size" title="Font Size">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => insertFontSize(opt.value)}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              {opt.label}
            </button>
          ))}
        </Dropdown>
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
      <div className="relative flex items-center" ref={colorRef}>
        <button
          onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
          title="Text Color"
          className="flex items-center gap-0.5 p-1.5 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
        >
          <Type size={16} strokeWidth={2.5} />
          <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: textColor }} />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-500">Text Color</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              style={{ padding: 0 }}
            />
            <button
              onClick={() => { insertTextColor(textColor); setShowColorPicker(false); }}
              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Background Color */}
      <div className="relative flex items-center" ref={bgColorRef}>
        <button
          onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
          title="Background Color"
          className="flex items-center gap-0.5 p-1.5 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
        >
          <Paintbrush size={16} strokeWidth={2.5} />
          <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: bgColor }} />
        </button>
        {showBgColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-500">Highlight Color</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              style={{ padding: 0 }}
            />
            <button
              onClick={() => { insertBgColor(bgColor); setShowBgColorPicker(false); }}
              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        )}
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
        <IconButton icon={FileText} onClick={() => {
          insertPageBreak();
        }} title="Insert Page Break" />
        {onOpenPagePreview && (
          <IconButton icon={Palette} onClick={onOpenPagePreview} title="Page Preview" />
        )}
      </div>
    </div>
  );
};
