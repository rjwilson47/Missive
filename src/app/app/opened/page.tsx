/**
 * @file src/app/app/opened/page.tsx
 * My Mailbox — Opened letters (/app/opened).
 *
 * Shows letters with status=DELIVERED and opened_at IS NOT NULL for the current user.
 * Includes letters in the default OPENED system folder.
 *
 * TODO (Session 4): Implement — fetch from GET /api/letters?folder=OPENED.
 */

export default function OpenedPage() {
  // TODO: fetch opened letters and render list
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif text-ink">Opened</h1>
      <p className="text-ink-muted text-sm">TODO: list of opened letters</p>
    </div>
  );
}
