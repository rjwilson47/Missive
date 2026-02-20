/**
 * @file src/components/editor/LetterEditor.tsx
 * TipTap-based letter editor for composing typed letters.
 *
 * Features:
 *   - Plain text + italics only (Document, Paragraph, Text, Italic extensions)
 *   - Copy/cut/paste BLOCKED during composition via DOM event listeners (SPEC §7)
 *   - Context menu blocked during composition
 *   - Six stationery fonts selectable via `fontFamily` prop (applied whole-letter)
 *   - 50,000 character limit with live counter; warning shown when exceeded
 *   - Content stored as ProseMirror JSON; `onChange` called on every keystroke
 *   - `readOnly` mode: editor is non-editable and copy/paste is NOT blocked
 *     (so recipients can copy quotes/addresses from received letters)
 *
 * Font loading:
 *   All six fonts are loaded as CSS variables at module level via next/font/google.
 *   The wrapper div receives all variable classes (defining every --font-* variable)
 *   plus the Tailwind font-{name} class that activates the chosen font.
 */

"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Italic from "@tiptap/extension-italic";
import {
  Crimson_Text,
  Merriweather,
  Lora,
  Courier_Prime,
  Caveat,
  Open_Sans,
} from "next/font/google";
import type { StationeryFont } from "@/types";

// ===== Font loading (module level — required by next/font) =====

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-crimson-text",
});
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-merriweather",
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-lora",
});
const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-courier-prime",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-caveat",
});
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-open-sans",
});

// All variable classes joined — apply to wrapper so every --font-* CSS var is defined
const ALL_FONT_VARIABLES = [
  crimsonText.variable,
  merriweather.variable,
  lora.variable,
  courierPrime.variable,
  caveat.variable,
  openSans.variable,
].join(" ");

// ===== Constants =====

const MAX_CHARS = 50_000;

/** Maps StationeryFont → Tailwind font-* class (keys match tailwind.config.ts) */
const FONT_CLASS: Record<StationeryFont, string> = {
  "Crimson Text": "font-crimson",
  Merriweather: "font-merriweather",
  Lora: "font-lora",
  "Courier Prime": "font-courier",
  Caveat: "font-caveat",
  "Open Sans": "font-opensans",
};

// ===== Component =====

interface LetterEditorProps {
  /** Pre-existing ProseMirror JSON for editing a saved draft */
  initialContent?: Record<string, unknown>;
  /** Stationery font applied to the whole letter (defaults to Crimson Text) */
  fontFamily?: StationeryFont;
  /** Called with the latest ProseMirror JSON on every content change */
  onChange?: (content: Record<string, unknown>) => void;
  /**
   * When true: editor is non-editable and copy/paste is NOT blocked.
   * Used for rendering received letters so recipients can copy text freely.
   */
  readOnly?: boolean;
}

/**
 * Rich-text letter editor built on TipTap.
 *
 * Restricted to plain text + italic only — no bold, no headings, no lists.
 * Copy/cut/paste are blocked during composition to enforce the intentional-
 * friction rule (SPEC §7). In readOnly mode these restrictions are lifted.
 *
 * @param initialContent - ProseMirror JSON to pre-populate the editor
 * @param fontFamily     - One of the six stationery fonts
 * @param onChange       - Receives updated ProseMirror JSON on every change
 * @param readOnly       - If true, read-only mode with copy/paste allowed
 */
export default function LetterEditor({
  initialContent,
  fontFamily = "Crimson Text",
  onChange,
  readOnly = false,
}: LetterEditorProps) {
  // Stable ref so the editor's onUpdate closure never holds a stale onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, Italic],
    content: initialContent ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable: !readOnly,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": readOnly ? "Letter content" : "Write your letter",
        class: "outline-none min-h-[360px] leading-relaxed text-ink",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChangeRef.current?.(e.getJSON() as Record<string, unknown>);
    },
  });

  // Live character count (plain-text length, not JSON length)
  const charCount = editor?.getText().length ?? 0;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = !isOverLimit && charCount >= MAX_CHARS - 500;

  // ===== Copy/paste blocking (composition mode only) =====
  // Listeners are attached directly to the ProseMirror DOM node so they are
  // scoped to the editor surface and properly torn down when the editor unmounts.
  useEffect(() => {
    if (!editor || readOnly) return;

    const dom = editor.view.dom as HTMLElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "x", "v"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    // Right-click context menu exposes copy/paste — block during composition
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    dom.addEventListener("keydown", onKeyDown);
    dom.addEventListener("paste", onPaste);
    dom.addEventListener("copy", onCopy);
    dom.addEventListener("cut", onCut);
    dom.addEventListener("contextmenu", onContextMenu);

    return () => {
      dom.removeEventListener("keydown", onKeyDown);
      dom.removeEventListener("paste", onPaste);
      dom.removeEventListener("copy", onCopy);
      dom.removeEventListener("cut", onCut);
      dom.removeEventListener("contextmenu", onContextMenu);
    };
  }, [editor, readOnly]);

  const activeFontClass = FONT_CLASS[fontFamily] ?? "font-crimson";

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar — composition mode only; hidden in readOnly */}
      {!readOnly && (
        <div
          className="flex items-center gap-1 px-1"
          role="toolbar"
          aria-label="Text formatting"
        >
          <button
            type="button"
            aria-label="Italic"
            aria-pressed={editor?.isActive("italic") ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={[
              "h-7 w-7 rounded text-sm flex items-center justify-center italic",
              "border transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-seal",
              editor?.isActive("italic")
                ? "bg-ink text-paper border-ink"
                : "bg-white text-ink border-paper-dark hover:border-ink-faint",
            ].join(" ")}
          >
            I
          </button>
        </div>
      )}

      {/* Editor surface — all font CSS variables defined on this element */}
      <div
        className={[
          ALL_FONT_VARIABLES,
          activeFontClass,
          "border border-paper-dark rounded-sm bg-paper",
          "px-6 py-5",
          "focus-within:ring-2 focus-within:ring-seal/30 focus-within:border-ink-faint",
          "text-base transition-shadow",
          readOnly ? "cursor-default" : "cursor-text",
        ].join(" ")}
        onClick={() => {
          if (!readOnly) editor?.chain().focus().run();
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Character counter (hidden in readOnly mode) */}
      {!readOnly && (
        <div className="flex justify-end items-center gap-3 pr-1">
          {isOverLimit && (
            <p
              className="text-seal text-xs font-medium"
              role="alert"
              aria-live="polite"
            >
              Letter is too long. Maximum 50,000 characters.
            </p>
          )}
          <span
            className={[
              "text-xs tabular-nums",
              isOverLimit
                ? "text-seal font-semibold"
                : isNearLimit
                ? "text-amber-600"
                : "text-ink-faint",
            ].join(" ")}
            aria-label={`${charCount} of ${MAX_CHARS} characters used`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
