/**
 * RichTextEditor.jsx
 * Lightweight rich-text editor built on the browser's native contentEditable.
 * No external dependencies — uses document.execCommand (still universally
 * supported for contentEditable regions despite the MDN deprecation note).
 *
 * Props:
 *   value       – HTML string
 *   onChange    – (html: string) => void
 *   tok         – DMMAS design tokens  { canvas, elev, sunken, border, fg, fgMuted, fgSubtle }
 *   primary     – accent hex colour
 *   placeholder – placeholder text
 *   isAR        – boolean, RTL mode
 *   minHeight   – px, default 160
 *   maxHeight   – px, default 360
 */
import { useRef, useEffect, useCallback } from 'react';

// ── Toolbar definition ────────────────────────────────────────────────────────
const TOOLBAR = [
  [
    { cmd: 'bold',      icon: 'B',   title: 'Bold (Ctrl+B)',      style: { fontWeight: 800 } },
    { cmd: 'italic',    icon: 'I',   title: 'Italic (Ctrl+I)',    style: { fontStyle: 'italic' } },
    { cmd: 'underline', icon: 'U',   title: 'Underline (Ctrl+U)', style: { textDecoration: 'underline' } },
    { cmd: 'strikeThrough', icon: 'S', title: 'Strikethrough',   style: { textDecoration: 'line-through' } },
  ],
  [
    { cmd: 'insertUnorderedList', icon: '•≡', title: 'Bullet list' },
    { cmd: 'insertOrderedList',   icon: '1≡', title: 'Numbered list' },
  ],
  [
    { cmd: 'formatBlock', val: 'h3', icon: 'H1', title: 'Heading' },
    { cmd: 'formatBlock', val: 'h4', icon: 'H2', title: 'Sub-heading' },
    { cmd: 'formatBlock', val: 'p',  icon: '¶',  title: 'Paragraph' },
  ],
  [
    { cmd: 'justifyLeft',   icon: '⬤≡', title: 'Align left'  },
    { cmd: 'justifyCenter', icon: '≡',   title: 'Centre'      },
    { cmd: 'justifyRight',  icon: '≡⬤',  title: 'Align right' },
  ],
  [
    { cmd: 'undo',         icon: '↩', title: 'Undo (Ctrl+Z)' },
    { cmd: 'redo',         icon: '↪', title: 'Redo (Ctrl+Y)' },
  ],
  [
    { cmd: 'removeFormat', icon: 'T×', title: 'Clear formatting' },
  ],
];

export default function RichTextEditor({
  value = '',
  onChange,
  tok,
  primary = '#3b82f6',
  placeholder = '',
  isAR = false,
  minHeight = 160,
  maxHeight = 360,
}) {
  const editorRef  = useRef(null);
  const latestHtml = useRef(value);

  // Sync external value → DOM (only when value changes from outside)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
      latestHtml.current = value || '';
    }
  }, [value]);

  const exec = useCallback((cmd, val) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    // Some commands (formatBlock) need the value; others don't
    document.execCommand(cmd, false, val || null);
    const html = el.innerHTML || '';
    latestHtml.current = html;
    onChange?.(html);
  }, [onChange]);

  const handleInput = () => {
    const html = editorRef.current?.innerHTML || '';
    latestHtml.current = html;
    onChange?.(html);
  };

  // Paste as plain text to keep editor clean
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div style={{
      border: `1px solid ${tok.border}`,
      borderRadius: 4,
      overflow: 'hidden',
      transition: 'border-color 120ms, box-shadow 120ms',
    }}
      onFocusCapture={e => {
        if (e.target === editorRef.current || e.target.closest('[contenteditable]')) {
          e.currentTarget.style.borderColor = primary;
          e.currentTarget.style.boxShadow = `0 0 0 1px ${primary}`;
        }
      }}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          e.currentTarget.style.borderColor = tok.border;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: 2, padding: '5px 8px',
        backgroundColor: tok.sunken,
        borderBottom: `1px solid ${tok.border}`,
        userSelect: 'none',
      }}>
        {TOOLBAR.map((group, gi) => (
          <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {gi > 0 && (
              <div style={{ width: 1, height: 16, backgroundColor: tok.border, margin: '0 4px' }} />
            )}
            {group.map((btn, bi) => (
              <button
                key={bi}
                type="button"
                title={btn.title}
                onMouseDown={e => {
                  e.preventDefault(); // prevents editor losing focus
                  exec(btn.cmd, btn.val);
                }}
                style={{
                  ...(btn.style || {}),
                  minWidth: 26, height: 24,
                  borderRadius: 3, border: 'none',
                  background: 'transparent',
                  color: tok.fgMuted,
                  cursor: 'pointer',
                  fontSize: btn.icon.length > 2 ? 9 : 12,
                  fontFamily: 'ui-monospace, monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  transition: 'background 80ms, color 80ms',
                  letterSpacing: btn.icon.length > 2 ? '-0.04em' : 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = tok.border;
                  e.currentTarget.style.color = tok.fg;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = tok.fgMuted;
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dir={isAR ? 'rtl' : 'ltr'}
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{
          minHeight, maxHeight,
          padding: '10px 14px',
          backgroundColor: tok.canvas,
          color: tok.fg,
          fontSize: 13,
          lineHeight: 1.7,
          outline: 'none',
          overflowY: 'auto',
          wordBreak: 'break-word',
        }}
      />

      {/* Placeholder + reset list margin styles */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: ${tok.fgSubtle};
          pointer-events: none;
          display: block;
        }
        [contenteditable] ul  { margin: 4px 0 4px 20px; padding: 0; list-style: disc; }
        [contenteditable] ol  { margin: 4px 0 4px 20px; padding: 0; list-style: decimal; }
        [contenteditable] h3  { font-size: 15px; font-weight: 700; margin: 8px 0 4px; }
        [contenteditable] h4  { font-size: 13px; font-weight: 700; margin: 6px 0 4px; }
        [contenteditable] p   { margin: 4px 0; }
        [contenteditable] a   { color: ${primary}; }
      `}</style>
    </div>
  );
}
