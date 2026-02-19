/**
 * @file src/components/editor/LetterEditor.tsx
 * TipTap-based letter editor for composing typed letters.
 *
 * Features:
 *   - Plain text + italics only (no bold, headings, lists, links)
 *   - Copy/cut/paste BLOCKED during composition (see SPEC §7)
 *   - Context menu blocked during composition
 *   - Font selection via `fontFamily` prop (applies to whole letter)
 *   - 50,000 character limit with live counter
 *   - Content stored as ProseMirror JSON
 *
 * Props:
 *   - initialContent: ProseMirror JSON (for editing an existing draft)
 *   - fontFamily: StationeryFont
 *   - onChange: called with new ProseMirror JSON on each change (for autosave)
 *   - readOnly: when true, copy/paste is NOT blocked (for viewing received letters)
 *
 * TODO (Session 3): Implement.
 */

"use client";

import type { StationeryFont } from "@/types";

interface LetterEditorProps {
  initialContent?: Record<string, unknown>;
  fontFamily?: StationeryFont;
  onChange?: (content: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export default function LetterEditor({
  fontFamily: _fontFamily,
  readOnly: _readOnly,
}: LetterEditorProps) {
  // TODO (Session 3): implement TipTap editor with:
  //   - Extensions: Document, Paragraph, Text, Italic (only)
  //   - Copy/paste blocking event listeners (when !readOnly)
  //   - Character counter
  //   - Font CSS class on wrapper div
  return (
    <div className="border border-paper-dark rounded p-4 min-h-[400px] text-ink">
      <p className="text-ink-muted text-sm">TODO: letter editor</p>
    </div>
  );
}
