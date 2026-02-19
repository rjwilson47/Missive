/**
 * @file src/components/letter/LetterView.tsx
 * Displays a received letter's full content.
 *
 * Renders:
 *   - Typed letters: TipTap editor in readOnly mode (copy permitted)
 *   - Handwritten letters: ImageCarousel
 *   - Font applied via CSS class on wrapper
 *
 * Note: no copy/paste restrictions here (readOnly mode, see SPEC §7).
 *
 * TODO (Session 4): Implement.
 */

"use client";

import type { LetterDetail } from "@/types";

interface LetterViewProps {
  letter: LetterDetail;
}

export default function LetterView({ letter: _letter }: LetterViewProps) {
  // TODO (Session 4): render typed content in readOnly TipTap OR handwritten ImageCarousel
  return (
    <div className="max-w-prose mx-auto space-y-6">
      <p className="text-ink-muted text-sm">TODO: letter content</p>
    </div>
  );
}
