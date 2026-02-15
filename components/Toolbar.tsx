import React from 'react';
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code, Link, Minus
} from 'lucide-react';
import clsx from 'clsx';
import { EditorView } from '@codemirror/view';

interface ToolbarProps {
  editorView: EditorView | null;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editorView }) => {

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

    // If text is selected
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

    // If no text selected, handle block vs inline
    if (blockMode) {
      // For block commands (headers, lists), we generally want to operate on the line
      const line = state.doc.lineAt(from);
      const lineText = line.text;

      // If line is empty, just insert
      if (!lineText.trim()) {
        dispatch(state.update({
          changes: { from: line.from, to: line.to, insert: `${prefix} ` },
          selection: { anchor: line.from + prefix.length + 1 }
        }));
      } else {
        // Prepend to line
        dispatch(state.update({
          changes: { from: line.from, insert: `${prefix} ` },
          selection: { anchor: from + prefix.length + 1 }
        }));
      }
    } else {
      // Inline insertion (like bolding empty space)
      const placeholder = "text";
      dispatch(state.update({
        changes: { from, to, insert: `${prefix}${placeholder}${suffix}` },
        selection: { anchor: from + prefix.length, head: from + prefix.length + placeholder.length }
      }));
    }

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
        anchor: selection.from + text.length + 3, // Start of 'url'
        head: selection.from + text.length + 6    // End of 'url'
      }
    }));
    editorView.focus();
  };

  const IconButton = ({ icon: Icon, onClick, title }: any) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={clsx(
        "p-1.5 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      )}
    >
      <Icon size={18} strokeWidth={2.5} />
    </button>
  );

  const Separator = () => <div className="w-px h-5 bg-gray-300 mx-1" />;

  return (
    <div className="flex items-center gap-1 overflow-x-auto p-1 bg-white border-b border-gray-200 shadow-sm no-scrollbar">
      <div className="flex items-center gap-0.5 px-1">
        <IconButton icon={Bold} onClick={() => executeCommand('**', '**')} title="Bold" />
        <IconButton icon={Italic} onClick={() => executeCommand('*', '*')} title="Italic" />
        <IconButton icon={Strikethrough} onClick={() => executeCommand('~~', '~~')} title="Strikethrough" />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5 px-1">
        <IconButton icon={Heading1} onClick={() => executeCommand('#', '', true)} title="Heading 1" />
        <IconButton icon={Heading2} onClick={() => executeCommand('##', '', true)} title="Heading 2" />
        <IconButton icon={Heading3} onClick={() => executeCommand('###', '', true)} title="Heading 3" />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5 px-1">
        <IconButton icon={List} onClick={() => executeCommand('-', '', true)} title="Bulleted List" />
        <IconButton icon={ListOrdered} onClick={() => executeCommand('1.', '', true)} title="Numbered List" />
        <IconButton icon={CheckSquare} onClick={() => executeCommand('- [ ]', '', true)} title="Task List" />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5 px-1">
        <IconButton icon={Quote} onClick={() => executeCommand('>', '', true)} title="Quote" />
        <IconButton icon={Code} onClick={() => executeCommand('```\n', '\n```')} title="Code Block" />
        <IconButton icon={Minus} onClick={() => executeCommand('---\n', '', true)} title="Horizontal Rule" />
        <IconButton icon={Link} onClick={wrapLink} title="Link" />
      </div>
    </div>
  );
};
