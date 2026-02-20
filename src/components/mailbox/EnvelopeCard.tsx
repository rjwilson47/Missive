/**
 * @file src/components/mailbox/EnvelopeCard.tsx
 * Envelope card displayed in mailbox list views.
 *
 * Shows per SPEC §8-A:
 *   - From: sender username
 *   - Postmarked: sent time + sender region (e.g. "Sent 16 Feb 2026, 5:12 PM — Victoria, AU")
 *   - Status line: "In transit" | "Arrives Wed 4:00 PM" | "Delivered Tue 4:00 PM"
 *   - Red dot badge for unopened letters (deliveredAt set, openedAt null)
 *
 * Clicking the card navigates to /app/letter/[id].
 * Keyboard accessible (Enter / Space activates).
 */

"use client";

import { useRouter } from "next/navigation";
import type { LetterSummary } from "@/types";

interface EnvelopeCardProps {
  letter: LetterSummary;
}

// ===== Formatting Helpers =====

/**
 * Formats a UTC ISO timestamp for display.
 *
 * @param iso     - ISO 8601 string or null
 * @param short   - If true, use shorter format (no year, abbreviated month)
 * @returns Human-readable date/time string
 */
function fmt(iso: string | null, short = false): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (short) {
      return d.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Formats a scheduled delivery timestamp as "Arrives Wed 4:00 PM".
 *
 * @param iso - ISO 8601 string or null
 * @returns Formatted arrival string
 */
function fmtArrival(iso: string | null): string {
  if (!iso) return "In transit";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "In transit";
  }
}

/**
 * Returns the status line text and styling for a letter card.
 *
 * @param letter - The letter summary object
 * @returns { text, className } for the status chip
 */
function statusLine(letter: LetterSummary): { text: string; className: string } {
  switch (letter.status) {
    case "DRAFT":
      return { text: "Draft", className: "text-ink-muted" };
    case "IN_TRANSIT":
      return {
        text: letter.scheduledDeliveryAt
          ? `Arrives ${fmtArrival(letter.scheduledDeliveryAt)}`
          : "In transit",
        className: "text-ink-muted",
      };
    case "DELIVERED":
      if (!letter.openedAt) {
        // Unopened — show delivery time
        return {
          text: `Delivered ${fmt(letter.deliveredAt, true)}`,
          className: "text-ink",
        };
      }
      return {
        text: `Opened ${fmt(letter.openedAt, true)}`,
        className: "text-ink-muted",
      };
    case "BLOCKED":
      return { text: "Blocked", className: "text-ink-muted" };
    case "UNDELIVERABLE":
      return { text: "Undeliverable", className: "text-ink-muted" };
    default:
      return { text: "—", className: "text-ink-muted" };
  }
}

/**
 * Envelope card component for mailbox list views.
 *
 * Displays a letter as a tactile card with envelope metaphor.
 * Navigates to /app/letter/[id] on click or keyboard activation.
 *
 * @param letter - The LetterSummary to display
 */
export default function EnvelopeCard({ letter }: EnvelopeCardProps) {
  const router = useRouter();
  const { text: statusText, className: statusClass } = statusLine(letter);

  const isUnopened = letter.status === "DELIVERED" && !letter.openedAt;

  function handleClick() {
    router.push(`/app/letter/${letter.id}`);
  }

  return (
    <article
      className="relative border border-paper-dark rounded-lg p-4 cursor-pointer hover:shadow-card hover:border-ink-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink bg-paper"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Letter from ${letter.senderUsername}${isUnopened ? ", unopened" : ""}`}
    >
      {/* Unopened badge — red dot in top-right corner */}
      {isUnopened && (
        <span
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500"
          aria-label="Unopened"
          title="Unopened"
        />
      )}

      {/* Content type icon */}
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5 shrink-0" aria-hidden="true">
          {letter.contentType === "HANDWRITTEN" ? "✍️" : "✉️"}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          {/* Sender */}
          <p className="font-medium text-ink leading-tight">
            {letter.senderUsername}
          </p>

          {/* Postmark: sent date + region */}
          <p className="text-ink-muted text-xs leading-tight">
            {letter.sentAt
              ? `Sent ${fmt(letter.sentAt)}${letter.senderRegionAtSend ? ` — ${letter.senderRegionAtSend}` : ""}`
              : "Draft"}
          </p>

          {/* Status line */}
          <p className={`text-xs leading-tight ${statusClass}`}>
            {statusText}
          </p>
        </div>
      </div>
    </article>
  );
}
