/**
 * @file src/components/mailbox/EnvelopeCard.tsx
 * Envelope card displayed in mailbox list views.
 *
 * Shows per SPEC §8-A:
 *   - From: sender username
 *   - Postmarked: sentAt in sender's timezone + region
 *   - Status: "In transit" | "Arrives 4:00 PM Wed" | "Delivered Tue 4:00 PM"
 *   - Unopened badge (red dot) for unread letters
 *
 * Clicking navigates to /app/letter/[id].
 *
 * TODO (Session 4): Implement.
 */

"use client";

import type { LetterSummary } from "@/types";

interface EnvelopeCardProps {
  letter: LetterSummary;
}

export default function EnvelopeCard({ letter: _letter }: EnvelopeCardProps) {
  // TODO (Session 4): render envelope card with postmark, status, unopened badge
  return (
    <div className="border border-paper-dark rounded-lg p-4 cursor-pointer hover:shadow-card transition-shadow">
      <p className="text-ink-muted text-sm">TODO: envelope card</p>
    </div>
  );
}
