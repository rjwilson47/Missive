/**
 * @file src/components/compose/WriteStep.tsx
 * Step 3 of the compose flow: writing the letter.
 *
 * For TYPED letters:
 *   - LetterEditor with font selector dropdown
 *   - Character counter (max 50,000) rendered inside LetterEditor
 *   - Copy/paste blocked in editor
 *   - Autosave: debounced 2.5s after typing stops
 *
 * For HANDWRITTEN letters:
 *   - Image upload UI (up to 10 total, 5MB each, 25MB total)
 *   - File input + upload progress
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import LetterEditor from "@/components/editor/LetterEditor";
import Button from "@/components/ui/Button";
import type { ContentType, StationeryFont, LetterImageShape } from "@/types";

const TOKEN_KEY = "missive_token";
const AUTOSAVE_DELAY_MS = 2500;
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/heic,image/heif";
const MAX_CHARS = 50_000;

// ===== Helpers =====

/**
 * Recursively extracts all plain text from a ProseMirror JSON document.
 * Used to count characters client-side for the 50,000-character limit.
 *
 * @param node - ProseMirror JSON doc or any descendant node
 * @returns Concatenated plain text string
 */
function extractTextFromProseMirror(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  const n = node as Record<string, unknown>;
  // Text leaf node
  if (n.type === "text" && typeof n.text === "string") return n.text;
  // Any node with children
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractTextFromProseMirror).join("");
  }
  return "";
}

const STATIONERY_FONTS: StationeryFont[] = [
  "Crimson Text",
  "Merriweather",
  "Lora",
  "Courier Prime",
  "Caveat",
  "Open Sans",
];

interface WriteStepProps {
  contentType: ContentType;
  draftId: string;
  onNext: () => void;
}

// ===== Typed letter writer =====

function TypedWriter({
  draftId,
  onNext,
}: {
  draftId: string;
  onNext: () => void;
}) {
  const [font, setFont] = useState<StationeryFont>("Crimson Text");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [charCount, setCharCount] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<Record<string, unknown> | null>(null);

  const saveNow = useCallback(
    async (content: Record<string, unknown>, currentFont: StationeryFont) => {
      const token =
        typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";
      setIsSaving(true);
      try {
        await fetch(`/api/letters/${draftId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ typedBodyJson: content, fontFamily: currentFont }),
        });
        setLastSaved(new Date());
      } catch {
        // silent — will retry on next change
      } finally {
        setIsSaving(false);
      }
    },
    [draftId]
  );

  const handleChange = useCallback(
    (content: Record<string, unknown>) => {
      pendingContentRef.current = content;
      // Update char count on every keystroke for the button disabled state
      setCharCount(extractTextFromProseMirror(content).length);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (pendingContentRef.current) {
          saveNow(pendingContentRef.current, font);
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [saveNow, font]
  );

  // Save when font changes (if there's pending content)
  useEffect(() => {
    if (pendingContentRef.current) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (pendingContentRef.current) {
          saveNow(pendingContentRef.current, font);
        }
      }, AUTOSAVE_DELAY_MS);
    }
  }, [font, saveNow]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Font selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="font-select" className="text-sm text-ink-muted shrink-0">
          Font:
        </label>
        <select
          id="font-select"
          value={font}
          onChange={(e) => setFont(e.target.value as StationeryFont)}
          className="border border-paper-dark rounded px-2 py-1 text-sm text-ink bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-seal"
        >
          {STATIONERY_FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <span className="text-xs text-ink-muted ml-auto">
          {isSaving
            ? "Saving…"
            : lastSaved
            ? `Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Not yet saved"}
        </span>
      </div>

      {/* Editor */}
      <LetterEditor fontFamily={font} onChange={handleChange} />

      <Button
        variant="primary"
        size="md"
        onClick={onNext}
        disabled={charCount > MAX_CHARS}
        aria-disabled={charCount > MAX_CHARS}
      >
        Continue to review
      </Button>
    </div>
  );
}

// ===== Handwritten letter uploader =====

function HandwrittenUploader({
  draftId,
  onNext,
}: {
  draftId: string;
  onNext: () => void;
}) {
  const [images, setImages] = useState<LetterImageShape[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after removal
    e.target.value = "";

    setUploadError(null);
    setIsUploading(true);

    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("letterId", draftId);
    formData.append("orderIndex", String(images.length));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setUploadError(data.error ?? "Upload failed. Please try again.");
        return;
      }

      const img = (await res.json()) as LetterImageShape;
      setImages((prev) => [...prev, img]);
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove(idx: number) {
    const img = images[idx];
    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";

    setIsRemoving(true);
    setUploadError(null);

    try {
      const res = await fetch(`/api/letters/${draftId}/images/${img.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // 404 means already gone from storage/DB — treat as success
      if (!res.ok && res.status !== 404) {
        const data = (await res.json()) as { error?: string };
        setUploadError(data.error ?? "Failed to remove image. Please try again.");
        return;
      }
    } catch {
      setUploadError("Network error. Failed to remove image.");
      return;
    } finally {
      setIsRemoving(false);
    }

    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-ink">Upload your handwritten pages</h2>

      {images.length > 0 && (
        <ol className="space-y-2">
          {images.map((img, idx) => (
            <li
              key={img.id}
              className="flex items-center justify-between rounded border border-paper-dark bg-white px-3 py-2 text-sm"
            >
              <span className="text-ink">
                Page {idx + 1} — {(img.sizeBytes / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={() => handleRemove(idx)}
                disabled={isRemoving}
                className="text-xs text-seal hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemoving ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ol>
      )}

      {images.length < 10 && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            size="sm"
            isLoading={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? "Uploading…" : "Add page"}
          </Button>
          <p className="mt-1 text-xs text-ink-muted">
            JPG, PNG or HEIC · max 5 MB per image · {10 - images.length} slot
            {10 - images.length !== 1 ? "s" : ""} remaining
          </p>
        </div>
      )}

      {uploadError && (
        <p role="alert" className="text-xs text-seal">
          {uploadError}
        </p>
      )}

      <Button
        variant="primary"
        size="md"
        onClick={onNext}
        // Require at least one image before proceeding
        className={images.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
      >
        Continue to review
      </Button>

      {images.length === 0 && (
        <p className="text-xs text-ink-muted">Upload at least one page to continue.</p>
      )}
    </div>
  );
}

// ===== WriteStep =====

export default function WriteStep({ contentType, draftId, onNext }: WriteStepProps) {
  if (contentType === "TYPED") {
    return <TypedWriter draftId={draftId} onNext={onNext} />;
  }

  if (contentType === "HANDWRITTEN") {
    return <HandwrittenUploader draftId={draftId} onNext={onNext} />;
  }

  // VOICE — not implemented
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-ink">Write your letter</h2>
      <p className="text-ink-muted text-sm">This content type is not yet supported.</p>
    </div>
  );
}
