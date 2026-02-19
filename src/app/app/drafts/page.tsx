/**
 * @file src/app/app/drafts/page.tsx
 * Drafts (/app/drafts).
 *
 * Shows letters with status=DRAFT where senderId = current user.
 * User can click to continue editing, or delete a draft.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { LetterSummary } from "@/types";

const TOKEN_KEY = "missive_token";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function contentTypeLabel(ct: string): string {
  if (ct === "TYPED") return "Typed letter";
  if (ct === "HANDWRITTEN") return "Handwritten letter";
  return "Letter";
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<LetterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";
    try {
      const res = await fetch("/api/letters?folder=DRAFTS", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError("Failed to load drafts.");
        return;
      }
      const data = (await res.json()) as LetterSummary[];
      setDrafts(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const token =
      typeof window !== "undefined" ? (localStorage.getItem(TOKEN_KEY) ?? "") : "";
    try {
      const res = await fetch(`/api/letters/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // silent — draft stays in list
    } finally {
      setDeletingId(null);
    }
  }

  function handleContinue(draft: LetterSummary) {
    router.push(`/app/compose?draft=${draft.id}&contentType=${draft.contentType}`);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-serif text-ink">Drafts</h1>
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-serif text-ink">Drafts</h1>
        <Button variant="primary" size="sm" onClick={() => router.push("/app/compose")}>
          Write a letter
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-seal/40 bg-seal/10 px-4 py-3 text-sm text-seal"
        >
          {error}
        </div>
      )}

      {!error && drafts.length === 0 && (
        <p className="text-ink-muted text-sm">No drafts yet. Start writing!</p>
      )}

      <ul className="space-y-2">
        {drafts.map((draft) => (
          <li
            key={draft.id}
            className="flex items-center justify-between rounded border border-paper-dark bg-white px-4 py-3 shadow-envelope"
          >
            <button
              className="flex-1 text-left space-y-0.5 hover:opacity-80 focus:outline-none focus-visible:underline"
              onClick={() => handleContinue(draft)}
            >
              <p className="text-sm font-medium text-ink">
                {contentTypeLabel(draft.contentType)}
              </p>
              <p className="text-xs text-ink-muted">Started {formatDate(draft.createdAt)}</p>
            </button>

            <Button
              variant="danger"
              size="sm"
              isLoading={deletingId === draft.id}
              onClick={() => handleDelete(draft.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
