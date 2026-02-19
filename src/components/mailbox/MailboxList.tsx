/**
 * @file src/components/mailbox/MailboxList.tsx
 * Renders a list of EnvelopeCards for a mailbox folder.
 *
 * Handles empty state ("No letters here yet.").
 *
 * TODO (Session 4): Implement.
 */

"use client";

import type { LetterSummary } from "@/types";
import EnvelopeCard from "./EnvelopeCard";

interface MailboxListProps {
  letters: LetterSummary[];
}

export default function MailboxList({ letters }: MailboxListProps) {
  if (letters.length === 0) {
    return (
      <p className="text-ink-faint text-sm italic">No letters here yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {letters.map((letter) => (
        <EnvelopeCard key={letter.id} letter={letter} />
      ))}
    </div>
  );
}
