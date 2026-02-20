/**
 * @file src/app/app/folder/[id]/page.tsx
 * Custom folder view (/app/folder/[id]).
 *
 * Shows opened letters that the user has moved into a custom folder.
 * The folder name is displayed in the heading (fetched from GET /api/folders).
 * Letters are fetched from GET /api/letters?folder={id}.
 *
 * Delete folder:
 *   A "Delete folder" button is shown. If the folder has letters, the user is
 *   warned they will be moved to "Opened" before proceeding.
 *   On confirm, calls DELETE /api/folders/:id and navigates to /app/opened.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LetterSummary, FolderShape } from "@/types";
import MailboxList from "@/components/mailbox/MailboxList";
import Button from "@/components/ui/Button";

const TOKEN_KEY = "missive_token";

/**
 * Custom folder page component.
 * Fetches the folder metadata and its letters, then renders them.
 *
 * @param params - Next.js route params containing the folder UUID
 */
export default function CustomFolderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [folder, setFolder] = useState<FolderShape | null>(null);
  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { router.replace("/login"); return; }

      try {
        // Fetch folder metadata (name) and letters in parallel
        const [foldersRes, lettersRes] = await Promise.all([
          fetch("/api/folders", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/letters?folder=${params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!foldersRes.ok || !lettersRes.ok) throw new Error("Failed to load.");

        const allFolders: FolderShape[] = await foldersRes.json();
        const folderData = allFolders.find((f) => f.id === params.id);

        if (!folderData) {
          setError("Folder not found.");
          return;
        }

        setFolder(folderData);
        setLetters(await lettersRes.json());
      } catch {
        setError("Failed to load folder. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  /**
   * Deletes the current folder.
   * Warns if letters will be moved to "Opened", then calls DELETE /api/folders/:id.
   * On success, navigates to /app/opened.
   */
  async function handleDelete() {
    if (!folder) return;

    const hasLetters = letters.length > 0;
    const confirmed = window.confirm(
      hasLetters
        ? `This folder contains ${letters.length} letter${letters.length !== 1 ? "s" : ""}. They will be moved to "Opened". Delete folder "${folder.name}"?`
        : `Delete folder "${folder.name}"?`
    );
    if (!confirmed) return;

    setDeleting(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`/api/folders/${params.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push("/app/opened");
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to delete folder.");
        setDeleting(false);
      }
    } catch {
      setError("Failed to delete folder. Please try again.");
      setDeleting(false);
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

  if (error || !folder) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-red-600 text-sm" role="alert">{error ?? "Folder not found."}</p>
        <Button variant="ghost" onClick={() => router.back()}>← Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Folder heading + delete action */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-serif text-ink truncate">{folder.name}</h1>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={deleting}
          aria-label={`Delete folder ${folder.name}`}
        >
          Delete folder
        </Button>
      </div>

      {/* Non-blocking error (e.g. delete failed) */}
      {error && (
        <p className="text-red-600 text-sm" role="alert">{error}</p>
      )}

      {/* Letter list */}
      <MailboxList
        letters={letters}
        emptyMessage="This folder is empty. Move opened letters here from any letter's detail view."
      />
    </div>
  );
}
