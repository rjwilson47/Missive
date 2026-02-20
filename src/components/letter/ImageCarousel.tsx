/**
 * @file src/components/letter/ImageCarousel.tsx
 * Horizontal image carousel for letter images (handwritten pages + attachments).
 *
 * Behaviour per SPEC §8-D:
 *   - Manual navigation only (Prev / Next arrow buttons — no auto-advance)
 *   - Click the main image to open ImageLightbox (full-size Radix Dialog)
 *   - Counter shows current position: "2 / 5"
 *   - No thumbnail strip (keep UI minimal)
 *   - Index resets to 0 on component mount (no position persistence)
 *
 * Images are displayed using the thumbnail signed URL for fast loading;
 * clicking opens the full-resolution image in the lightbox.
 *
 * Keyboard: left/right arrow keys navigate when carousel has focus.
 */

"use client";

import { useState, useCallback } from "react";
import type { LetterImageShape } from "@/types";
import ImageLightbox from "@/components/letter/ImageLightbox";

interface ImageCarouselProps {
  /** Ordered list of images (already sorted by order_index from server) */
  images: LetterImageShape[];
}

/**
 * Image carousel component for displaying letter images.
 *
 * Shows one image at a time with Prev/Next navigation and an image counter.
 * Clicking the image opens a full-size lightbox (Radix Dialog).
 *
 * @param images - Array of images with signed URLs
 */
export default function ImageCarousel({ images }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const total = images.length;

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setIndex((i) => (i < total - 1 ? i + 1 : i)), [total]);

  if (total === 0) {
    return (
      <p className="text-ink-muted text-sm italic py-4 text-center">
        No images to display.
      </p>
    );
  }

  const current = images[index];
  // Show thumbnail in carousel (fast); lightbox will show full-res
  const displaySrc = current.thumbnailSignedUrl ?? current.signedUrl ?? null;

  return (
    <>
      <div
        className="relative border border-paper-dark rounded-lg overflow-hidden bg-paper-warm select-none"
        // Keyboard navigation when the container has focus
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
          if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        }}
        tabIndex={0}
        aria-label={`Image carousel, image ${index + 1} of ${total}`}
        role="region"
      >
        {/* Main image display */}
        <div className="flex items-center justify-center min-h-48 max-h-[480px] overflow-hidden">
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={`Letter image ${index + 1} of ${total}`}
              className="max-w-full max-h-[480px] object-contain cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Image ${index + 1} of ${total}. Click to view full size.`}
            />
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-ink-muted text-sm italic">Image unavailable</p>
            </div>
          )}
        </div>

        {/* Navigation controls */}
        {total > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/30 to-transparent">
            {/* Prev button */}
            <button
              onClick={prev}
              disabled={index === 0}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Previous image"
            >
              ‹
            </button>

            {/* Counter */}
            <span className="text-white text-xs font-medium tabular-nums">
              {index + 1} / {total}
            </span>

            {/* Next button */}
            <button
              onClick={next}
              disabled={index === total - 1}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Next image"
            >
              ›
            </button>
          </div>
        )}

        {/* Single-image hint */}
        {total === 1 && displaySrc && (
          <div className="absolute bottom-2 right-2">
            <span
              className="text-xs text-white/70 bg-black/40 rounded px-1.5 py-0.5"
              aria-hidden="true"
            >
              Click to enlarge
            </span>
          </div>
        )}
      </div>

      {/* Full-size lightbox */}
      <ImageLightbox
        image={current}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
