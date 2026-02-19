/**
 * @file src/app/app/opened/page.tsx
 * My Mailbox — Opened letters (/app/opened).
 *
 * Shows DELIVERED letters with opened_at IS NOT NULL for the current user.
 * Fetches from GET /api/letters?folder=OPENED.
 * Clicking a card navigates to /app/letter/[id] to view the full letter content.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LetterSummary } from "@/types";
import MailboxList from "@/components/mailbox/MailboxList";

const TOKEN_KEY = "missive_token";

/**
 * Opened mailbox page — displays letters that have already been read.
 */
export default function OpenedPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { router.replace("/login"); return; }

      try {
        const res = await fetch("/api/letters?folder=OPENED", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load opened letters.");
        setLetters(await res.json());
      } catch {
        setError("Failed to load letters. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-serif text-ink">Opened</h1>

      {loading && (
        <p className="text-ink-muted text-sm">Loading…</p>
      )}

      {!loading && error && (
        <p className="text-red-600 text-sm" role="alert">{error}</p>
      )}

      {!loading && !error && (
        <MailboxList
          letters={letters}
          emptyMessage="No opened letters yet. Letters move here after you tear them open."
        />
      )}
    </div>
  );
}
