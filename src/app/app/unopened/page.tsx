/**
 * @file src/app/app/unopened/page.tsx
 * My Mailbox — Unopened letters (/app/unopened).
 *
 * Shows letters with status=DELIVERED and opened_at=null for the current user.
 * Each letter is shown as an envelope card with a red dot badge.
 * Clicking a letter navigates to /app/letter/[id].
 *
 * TODO (Session 4): Implement — fetch from GET /api/letters?folder=UNOPENED.
 */

export default function UnopenedPage() {
  // TODO: fetch unopened letters and render EnvelopeCard list
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif text-ink">My Mailbox</h1>
      <p className="text-ink-muted text-sm">TODO: list of unopened letters</p>
    </div>
  );
}
