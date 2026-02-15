import React from 'react';
import { EditorProps } from '../types';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

export const EditorPane: React.FC<EditorProps> = ({ content, onChange, onEditorMount }) => {
  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* CodeMirror Instance */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          value={content}
          height="100%"
          className="h-full text-base"
          extensions={[markdown()]}
          onChange={(val) => onChange(val)}
          onCreateEditor={(view) => {
            if (onEditorMount) {
              onEditorMount(view);
            }
          }}
          theme="light"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
          }}
        />
      </div>
    </div>
  );
};
