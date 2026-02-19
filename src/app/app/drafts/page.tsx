/**
 * @file src/app/app/drafts/page.tsx
 * Drafts (/app/drafts).
 *
 * Shows letters with status=DRAFT where senderId = current user.
 * User can click to continue editing, or delete a draft.
 *
 * TODO (Session 3): Implement — fetch from GET /api/letters?status=DRAFT.
 */

export default function DraftsPage() {
  // TODO: fetch drafts and render list with delete action
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif text-ink">Drafts</h1>
      <p className="text-ink-muted text-sm">TODO: list of draft letters</p>
    </div>
  );
}
