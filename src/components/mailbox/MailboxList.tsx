/**
 * @file src/components/mailbox/MailboxList.tsx
 * Renders a list of EnvelopeCards for a mailbox folder.
 *
 * Handles the empty state with a customisable message.
 * Used by all mailbox folder pages (unopened, opened, drafts, custom folders).
 */

"use client";

import type { LetterSummary } from "@/types";
import EnvelopeCard from "./EnvelopeCard";

interface MailboxListProps {
  letters: LetterSummary[];
  /** Custom empty-state message. Defaults to "No letters here yet." */
  emptyMessage?: string;
}

/**
 * Renders a vertical stack of EnvelopeCards, or an empty-state message.
 *
 * @param letters       - Array of letter summaries to display
 * @param emptyMessage  - Message shown when the list is empty
 */
export default function MailboxList({ letters, emptyMessage = "No letters here yet." }: MailboxListProps) {
  if (letters.length === 0) {
    return (
      <p className="text-ink-muted text-sm italic py-8 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Letters">
      {letters.map((letter) => (
        <div key={letter.id} role="listitem">
          <EnvelopeCard letter={letter} />
        </div>
      ))}
    </div>
  );
}
