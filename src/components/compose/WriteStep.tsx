/**
 * @file src/components/compose/WriteStep.tsx
 * Step 3 of the compose flow: writing the letter.
 *
 * For TYPED letters:
 *   - LetterEditor with font selector dropdown
 *   - Italic toggle button
 *   - Character counter (max 50,000)
 *   - Copy/paste blocked in editor
 *
 * For HANDWRITTEN letters:
 *   - Image upload UI (up to 10 total, 5MB each, 25MB total)
 *   - Upload progress indicator
 *   - Warn before leaving page while uploads are in progress
 *
 * Autosave: debounced 2-3s after typing stops.
 *
 * TODO (Session 3): Implement.
 */

"use client";

import type { ContentType, StationeryFont } from "@/types";

interface WriteStepProps {
  contentType: ContentType;
  draftId: string;
  onNext: () => void;
}

export default function WriteStep({ contentType: _contentType, draftId: _draftId, onNext: _onNext }: WriteStepProps) {
  // TODO (Session 3): render editor or image uploader based on contentType
  const _font: StationeryFont = "Crimson Text"; // TODO: move to state
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-ink">Write your letter</h2>
      <p className="text-ink-muted text-sm">TODO: write step</p>
    </div>
  );
}
