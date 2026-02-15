export type ViewMode = 'split' | 'editor' | 'preview';

export interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  // Using any here to avoid dragging in CodeMirror types into the global definition file for now,
  // which can cause issues with certain bundlers if not carefully managed.
  // In a stricter setup, this would be `EditorView`.
  onEditorMount?: (view: any) => void;
}

export interface PreviewProps {
  htmlContent: string;
}
