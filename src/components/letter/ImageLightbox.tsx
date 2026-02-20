/**
 * @file src/components/letter/ImageLightbox.tsx
 * Full-size image lightbox using Radix UI Dialog.
 *
 * Opens when user clicks an image in ImageCarousel.
 * Features per SPEC §8-D:
 *   - Full-resolution image display (uses signedUrl, falls back to thumbnailPath)
 *   - Close button and Escape key both dismiss the dialog
 *   - Accessible: Radix Dialog handles focus trap and aria attributes
 *
 * The Radix Dialog portal mounts the overlay outside the normal DOM hierarchy,
 * ensuring proper stacking without z-index conflicts.
 */

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { LetterImageShape } from "@/types";

interface ImageLightboxProps {
  /** The image to display, or null when no image is selected */
  image: LetterImageShape | null;
  /** Controls whether the lightbox is visible */
  isOpen: boolean;
  /** Called when the dialog closes (Escape, overlay click, or close button) */
  onClose: () => void;
}

/**
 * Full-screen image lightbox built on Radix UI Dialog.
 *
 * Uses the signed URL for the full-resolution image.
 * Falls back to the thumbnail if no signed URL is available (e.g. expired URL).
 *
 * @param image   - The image to show in full size
 * @param isOpen  - Whether the lightbox is currently open
 * @param onClose - Callback when the dialog is dismissed
 */
export default function ImageLightbox({ image, isOpen, onClose }: ImageLightboxProps) {
  // The image source: prefer the full signed URL, fall back to thumbnail
  const src = image?.signedUrl ?? image?.thumbnailSignedUrl ?? null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        {/* Semi-transparent dark overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-fade-in" />

        {/* Centered content panel */}
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
          aria-describedby={undefined}
          onEscapeKeyDown={onClose}
          onPointerDownOutside={onClose}
        >
          {/* Close button — top right corner */}
          <Dialog.Close
            className="absolute top-4 right-4 z-60 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close image"
          >
            <span aria-hidden="true" className="text-xl leading-none">✕</span>
          </Dialog.Close>

          {/* Full-size image */}
          {src ? (
            <img
              src={src}
              alt={`Letter image ${image?.orderIndex !== undefined ? image.orderIndex + 1 : ""}`}
              className="max-w-full max-h-[90vh] object-contain rounded shadow-xl"
              style={{ cursor: "default" }}
            />
          ) : (
            <p className="text-white text-sm">Image not available.</p>
          )}

          {/* Visually hidden dialog title required by Radix for accessibility */}
          <Dialog.Title className="sr-only">Full size image</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
