/**
 * @file src/app/app/unopened/page.tsx
 * My Mailbox — Unopened letters (/app/unopened).
 *
 * Shows DELIVERED letters with opened_at = null for the current user.
 * Fetches from GET /api/letters?folder=UNOPENED.
 * Each letter is shown as an EnvelopeCard with a red dot badge.
 * Clicking a card navigates to /app/letter/[id] where the tear-open action lives.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LetterSummary } from "@/types";
import MailboxList from "@/components/mailbox/MailboxList";

const TOKEN_KEY = "missive_token";

/**
 * Unopened mailbox page — displays letters waiting to be read.
 */
export default function UnopenedPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { router.replace("/login"); return; }

      try {
        const res = await fetch("/api/letters?folder=UNOPENED", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load mailbox.");
        setLetters(await res.json());
      } catch {
        setError("Failed to load mailbox. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-serif text-ink">My Mailbox</h1>

      {loading && (
        <p className="text-ink-muted text-sm">Loading…</p>
      )}

      {!loading && error && (
        <p className="text-red-600 text-sm" role="alert">{error}</p>
      )}

      {!loading && !error && (
        <MailboxList
          letters={letters}
          emptyMessage="Your mailbox is empty. No new letters yet."
        />
      )}
    </div>
  );
}
