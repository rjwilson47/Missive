/**
 * @file src/components/letter/ImageCarousel.tsx
 * Horizontal image carousel for letter images (handwritten pages + attachments).
 *
 * Behaviour per SPEC §8-D:
 *   - Manual navigation only (arrow buttons, no auto-advance)
 *   - Click image to open ImageLightbox (full-size)
 *   - Image counter display (e.g. "2 / 5")
 *   - No thumbnail strip
 *   - Carousel resets to first image if user navigates away and returns
 *
 * TODO (Session 4): Implement.
 */

"use client";

import type { LetterImageShape } from "@/types";

interface ImageCarouselProps {
  images: LetterImageShape[];
}

export default function ImageCarousel({ images: _images }: ImageCarouselProps) {
  // TODO (Session 4): implement carousel with arrow navigation, lightbox trigger
  return (
    <div className="relative border border-paper-dark rounded-lg overflow-hidden">
      <p className="text-ink-muted text-sm p-4">TODO: image carousel</p>
    </div>
  );
}
