/**
 * @file src/components/compose/TypeStep.tsx
 * Step 2 of the compose flow: choosing the letter type.
 *
 * Options:
 *   - Typed (plain text + italics, TipTap editor)
 *   - Handwritten (photo upload of handwritten pages)
 *   - Voice — shown as disabled "coming soon"
 *   - Video — shown as disabled "coming soon"
 *
 * TODO (Session 3): Implement.
 */

"use client";

import type { ContentType } from "@/types";

interface TypeStepProps {
  onNext: (type: ContentType) => void;
}

export default function TypeStep({ onNext: _onNext }: TypeStepProps) {
  // TODO (Session 3): render letter type selection
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-ink">How would you like to write?</h2>
      <p className="text-ink-muted text-sm">TODO: type step</p>
    </div>
  );
}
