/**
 * @file src/app/app/compose/page.tsx
 * Compose a new letter (/app/compose).
 *
 * Multi-step flow:
 *   Step 1 — Address: enter recipient (username / email / phone / address)
 *             or "Write to a stranger" (pen pal match)
 *   Step 2 — Type: choose Typed | Handwritten | Voice (disabled)
 *   Step 3 — Write: LetterEditor (typed) or image upload (handwritten)
 *   Step 4 — Review: delivery estimate + "Seal envelope" confirmation
 *
 * TODO (Session 3): Implement compose flow and editor integration.
 * TODO (Session 3): Wire autosave debounce (2-3s after typing stops).
 */

"use client";

export default function ComposePage() {
  // TODO: implement multi-step compose flow
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif text-ink">Write a letter</h1>
      <p className="text-ink-muted text-sm">TODO: compose flow</p>
    </div>
  );
}
