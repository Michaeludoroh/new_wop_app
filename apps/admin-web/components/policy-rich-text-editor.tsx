"use client";

import { useEffect, useRef } from "react";

type PolicyRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const toolbarButtonStyle: React.CSSProperties = {
  border: "1px solid #d0d5dd",
  background: "#fff",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 13
};

export default function PolicyRichTextEditor({
  value,
  onChange,
  disabled = false
}: PolicyRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function applyCommand(command: string, commandValue?: string) {
    if (disabled) return;
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" style={toolbarButtonStyle} onClick={() => applyCommand("bold")}>
          Bold
        </button>
        <button type="button" style={toolbarButtonStyle} onClick={() => applyCommand("italic")}>
          Italic
        </button>
        <button type="button" style={toolbarButtonStyle} onClick={() => applyCommand("insertUnorderedList")}>
          Bullets
        </button>
        <button type="button" style={toolbarButtonStyle} onClick={() => applyCommand("insertOrderedList")}>
          Numbered
        </button>
        <button
          type="button"
          style={toolbarButtonStyle}
          onClick={() => {
            const url = window.prompt("Enter link URL");
            if (url) applyCommand("createLink", url);
          }}
        >
          Link
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
        style={{
          minHeight: 220,
          border: "1px solid #d0d5dd",
          borderRadius: 8,
          padding: 12,
          background: disabled ? "#f9fafb" : "#fff",
          lineHeight: 1.6
        }}
      />
    </div>
  );
}
