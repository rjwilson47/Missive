/**
 * @file src/app/app/letter/[id]/page.tsx
 * Letter detail view (/app/letter/[id]).
 *
 * Behaviour per SPEC §8-B:
 *   - DRAFT:     show a read-only preview with a back-to-drafts link.
 *   - DELIVERED + unopened (openedAt = null): show the sealed envelope front
 *     and a "Tear open envelope" button that calls POST /api/letters/:id/tear-open.
 *   - DELIVERED + opened:  show full letter content (LetterView) and a Reply button.
 *
 * Signed URLs (~1hr) are generated server-side by GET /api/letters/:id.
 * Images break after 1hr; user can refresh the page to regenerate (SPEC §9).
 * Recipient CAN copy text from received letters — no copy restrictions in view mode.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LetterDetail } from "@/types";
import LetterView from "@/components/letter/LetterView";
import Button from "@/components/ui/Button";

const TOKEN_KEY = "missive_token";

/**
 * Formats a UTC ISO date string to the receiver's local date/time for display.
 * Falls back to a simple date string if formatting fails.
 *
 * @param iso - ISO 8601 timestamp string
 * @returns Human-readable date string
 */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      weekday: "short",
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
 * Letter detail page component.
 * Fetches the letter from GET /api/letters/:id and renders the appropriate view.
 *
 * @param params - Next.js route params containing the letter UUID
 */
export default function LetterDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [letter, setLetter] = useState<LetterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tearing, setTearing] = useState(false);
  const [replying, setReplying] = useState(false);

  // ── Fetch letter detail ────────────────────────────────────────────────────
  const fetchLetter = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`/api/letters/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Letter not found.");
        return;
      }
      setLetter(await res.json());
    } catch {
      setError("Failed to load letter. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchLetter();
  }, [fetchLetter]);

  // ── Tear-open action ───────────────────────────────────────────────────────
  /**
   * Calls POST /api/letters/:id/tear-open to mark the letter as opened.
   * On success, re-fetches the letter so openedAt is populated.
   */
  async function tearOpen() {
    setTearing(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`/api/letters/${params.id}/tear-open`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Re-fetch to get the updated openedAt + same signed URLs
        await fetchLetter();
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to open letter.");
      }
    } catch {
      setError("Failed to open letter. Please try again.");
    } finally {
      setTearing(false);
    }
  }

  // ── Reply action ───────────────────────────────────────────────────────────
  /**
   * Calls POST /api/letters/:id/reply to create a new reply draft,
   * then navigates to the compose page with the new draft pre-loaded.
   */
  async function handleReply() {
    setReplying(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`/api/letters/${params.id}/reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { draftLetterId } = (await res.json()) as { draftLetterId: string };
        // Navigate to the compose page with the pre-created reply draft
        router.push(`/app/compose?draft=${draftLetterId}&contentType=TYPED`);
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to create reply.");
      }
    } catch {
      setError("Failed to create reply. Please try again.");
    } finally {
      setReplying(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="max-w-prose mx-auto space-y-4 pt-8">
        <p className="text-ink-muted text-sm">{error ?? "Letter not found."}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>
    );
  }

  // ── Draft preview ──────────────────────────────────────────────────────────
  if (letter.status === "DRAFT") {
    return (
      <div className="max-w-prose mx-auto space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/app/drafts")}>
            ← Drafts
          </Button>
          <span className="text-xs text-ink-muted uppercase tracking-wide">Draft preview</span>
        </div>
        <LetterView letter={letter} />
      </div>
    );
  }

  // ── Sealed envelope (DELIVERED, not yet opened) ────────────────────────────
  if (letter.status === "DELIVERED" && !letter.openedAt) {
    return (
      <div className="max-w-prose mx-auto space-y-8 pt-10">
        {/* Envelope metaphor header */}
        <div className="border border-paper-dark rounded-lg p-8 bg-paper-warm shadow-card text-center space-y-2">
          {/* Large envelope icon */}
          <div className="text-6xl mb-4" aria-hidden="true">✉</div>
          <p className="text-ink font-serif text-lg">
            A letter from <strong>{letter.senderUsername}</strong>
          </p>
          <p className="text-ink-muted text-sm">
            Postmarked: {formatDate(letter.sentAt)}
            {letter.senderRegionAtSend ? ` — ${letter.senderRegionAtSend}` : ""}
          </p>
          <p className="text-ink-muted text-sm">
            Arrived: {formatDate(letter.deliveredAt)}
          </p>
        </div>

        {/* Tear-open CTA */}
        <div className="flex justify-center">
          <Button
            onClick={tearOpen}
            isLoading={tearing}
            aria-label="Tear open envelope"
          >
            Tear open envelope
          </Button>
        </div>
      </div>
    );
  }

  // ── Opened letter (DELIVERED, openedAt set) ────────────────────────────────
  return (
    <div className="max-w-prose mx-auto space-y-8 pt-6">
      {/* Postmark / metadata header */}
      <header className="border-b border-paper-dark pb-4 space-y-1">
        <p className="text-ink font-serif text-lg">
          From <strong>{letter.senderUsername}</strong>
        </p>
        <p className="text-ink-muted text-sm">
          Postmarked {formatDate(letter.sentAt)}
          {letter.senderRegionAtSend ? ` — ${letter.senderRegionAtSend}` : ""}
        </p>
        <p className="text-ink-muted text-sm">
          Arrived {formatDate(letter.deliveredAt)}
        </p>
      </header>

      {/* Letter content */}
      <LetterView letter={letter} />

      {/* Reply CTA */}
      <div className="pt-4 border-t border-paper-dark">
        <Button
          onClick={handleReply}
          isLoading={replying}
          variant="secondary"
          aria-label="Reply to this letter"
        >
          Reply
        </Button>
      </div>

      {/* Error message (non-blocking) */}
      {error && (
        <p className="text-red-600 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
