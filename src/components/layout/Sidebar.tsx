/**
 * @file src/components/layout/Sidebar.tsx
 * Left sidebar navigation for authenticated /app/* pages.
 *
 * Links per SPEC §8-B:
 *   - My mailbox (unopened)
 *   - My mailbox (opened)
 *   - Drafts
 *   - Custom folders (dynamically loaded, up to 30)
 *   - Settings
 *
 * Active link highlighted with subtle background.
 *
 * TODO (Session 4): Implement with folder list fetched from GET /api/folders.
 */

"use client";

import Link from "next/link";
import type { FolderShape } from "@/types";

interface SidebarProps {
  customFolders?: FolderShape[];
}

export default function Sidebar({ customFolders = [] }: SidebarProps) {
  // TODO (Session 4): implement sidebar with active state, custom folders
  return (
    <nav
      className="w-56 shrink-0 border-r border-paper-dark bg-paper-warm min-h-screen p-4 space-y-1"
      aria-label="Mailbox navigation"
    >
      <Link href="/app/unopened" className="block px-3 py-2 text-sm text-ink rounded hover:bg-paper-dark transition-colors">
        Mailbox (unopened)
      </Link>
      <Link href="/app/opened" className="block px-3 py-2 text-sm text-ink rounded hover:bg-paper-dark transition-colors">
        Mailbox (opened)
      </Link>
      <Link href="/app/drafts" className="block px-3 py-2 text-sm text-ink rounded hover:bg-paper-dark transition-colors">
        Drafts
      </Link>

      {customFolders.length > 0 && (
        <div className="pt-2 border-t border-paper-dark space-y-1">
          {customFolders.map((folder) => (
            <Link
              key={folder.id}
              href={`/app/folder/${folder.id}`}
              className="block px-3 py-2 text-sm text-ink rounded hover:bg-paper-dark transition-colors truncate"
            >
              {folder.name}
            </Link>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-paper-dark">
        <Link href="/app/settings" className="block px-3 py-2 text-sm text-ink-muted rounded hover:bg-paper-dark transition-colors">
          Settings
        </Link>
      </div>
    </nav>
  );
}
