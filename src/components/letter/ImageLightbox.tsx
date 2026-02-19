/**
 * @file src/components/letter/ImageLightbox.tsx
 * Full-size image lightbox using Radix UI Dialog.
 *
 * Opens when user clicks an image in ImageCarousel.
 * Shows the full-resolution image with close button (Escape key also closes).
 *
 * TODO (Session 4): Implement using @radix-ui/react-dialog.
 */

"use client";

import type { LetterImageShape } from "@/types";

interface ImageLightboxProps {
  image: LetterImageShape | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ isOpen: _isOpen, onClose: _onClose, image: _image }: ImageLightboxProps) {
  // TODO (Session 4): implement Radix Dialog with full-size image
  return null;
}
