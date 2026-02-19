/**
 * @file src/components/letter/LetterView.tsx
 * Displays a received letter's full content.
 *
 * Renders based on contentType:
 *   - TYPED:       TipTap editor in readOnly mode (copy/paste fully permitted —
 *                  recipients may copy quotes, addresses, recipes, etc.)
 *   - HANDWRITTEN: ImageCarousel showing all uploaded pages/images
 *   - VOICE:       "Voice letters coming soon" placeholder (SPEC §2-B)
 *
 * For TYPED letters, any images attached are shown below the text in a carousel.
 * The chosen stationery font is applied to the TYPED editor wrapper.
 *
 * IMPORTANT: No copy/paste restrictions in this component (SPEC §7).
 * Copy is only blocked in LetterEditor during composition, not when reading.
 */

"use client";

import type { LetterDetail, StationeryFont } from "@/types";
import LetterEditor from "@/components/editor/LetterEditor";
import ImageCarousel from "@/components/letter/ImageCarousel";

interface LetterViewProps {
  /** Full letter detail including content and images with signed URLs */
  letter: LetterDetail;
}

/**
 * Renders the body of a received or drafted letter.
 *
 * TYPED:       Read-only TipTap with the chosen stationery font.
 * HANDWRITTEN: ImageCarousel of uploaded pages.
 * Attached images: shown below the typed body if any are present.
 *
 * @param letter - LetterDetail with signed image URLs
 */
export default function LetterView({ letter }: LetterViewProps) {
  const hasImages = letter.images.length > 0;

  // ── VOICE (coming soon) ────────────────────────────────────────────────────
  if (letter.contentType === "VOICE") {
    return (
      <div className="max-w-prose mx-auto py-8 text-center">
        <p className="text-ink-muted text-sm italic">
          Voice letters are not supported yet.
        </p>
      </div>
    );
  }

  // ── HANDWRITTEN ────────────────────────────────────────────────────────────
  if (letter.contentType === "HANDWRITTEN") {
    if (!hasImages) {
      return (
        <div className="max-w-prose mx-auto py-8 text-center">
          <p className="text-ink-muted text-sm italic">
            No images attached to this letter.
          </p>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto">
        <ImageCarousel images={letter.images} />
      </div>
    );
  }

  // ── TYPED ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-prose mx-auto space-y-8">
      {/* Typed body rendered in read-only TipTap (copy/paste NOT blocked) */}
      {letter.typedBodyJson ? (
        <LetterEditor
          initialContent={letter.typedBodyJson}
          fontFamily={(letter.fontFamily as StationeryFont) ?? "Crimson Text"}
          readOnly
        />
      ) : (
        <p className="text-ink-muted text-sm italic py-4">(Empty letter)</p>
      )}

      {/* Image attachments below typed text (if any) */}
      {hasImages && (
        <div className="pt-4 border-t border-paper-dark space-y-2">
          <p className="text-ink-muted text-xs uppercase tracking-wide">
            Attachments ({letter.images.length})
          </p>
          <ImageCarousel images={letter.images} />
        </div>
      )}
    </div>
  );
}
