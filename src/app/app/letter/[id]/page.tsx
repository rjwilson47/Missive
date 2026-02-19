/**
 * @file src/app/app/letter/[id]/page.tsx
 * Letter detail view (/app/letter/[id]).
 *
 * Behaviour:
 *   - If letter.openedAt is null: show envelope front + "Tear open envelope" button.
 *   - If opened: show full letter content, image carousel, Reply button.
 *   - Signed URLs are generated server-side on page load (~1hr expiry).
 *   - Recipient CAN copy text from received letters (no restriction in view mode).
 *
 * TODO (Session 4): Implement tear-open action, LetterView, ImageCarousel.
 */

export default function LetterDetailPage({ params }: { params: { id: string } }) {
  // TODO: fetch letter by id, check opened state, render accordingly
  return (
    <div className="space-y-4">
      <p className="text-ink-muted text-sm">TODO: letter detail {params.id}</p>
    </div>
  );
}
