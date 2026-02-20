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
 * Active link is highlighted with a subtle background.
 * usePathname() drives active state detection.
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FolderShape } from "@/types";

const TOKEN_KEY = "missive_token";

interface SidebarProps {
  customFolders?: FolderShape[];
}

/**
 * Builds a Tailwind className string for a nav link.
 * Active links get a stronger background; inactive links get a hover background.
 *
 * @param href     - The link destination.
 * @param pathname - The current path from usePathname().
 * @param exact    - If true, only exact path matches count as active.
 */
function navLinkClass(href: string, pathname: string, exact = false): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return [
    "block px-3 py-2 text-sm rounded transition-colors",
    isActive
      ? "bg-paper-dark text-ink font-medium"
      : "text-ink hover:bg-paper-dark",
  ].join(" ");
}

/**
 * Sidebar navigation component.
 *
 * @param customFolders - Custom (non-system) folders for the current user.
 */
export default function Sidebar({ customFolders = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const token = localStorage.getItem(TOKEN_KEY);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/");
  }

  return (
    <nav
      className="w-56 shrink-0 border-r border-paper-dark bg-paper-warm min-h-screen p-4 flex flex-col gap-1"
      aria-label="Mailbox navigation"
    >
      {/* Write a letter CTA */}
      <Link
        href="/app/compose"
        className="block w-full mb-3 px-3 py-2 text-sm text-center font-medium bg-ink text-paper rounded hover:bg-ink-muted transition-colors"
        aria-label="Write a letter"
      >
        Write a letter
      </Link>

      {/* System folders */}
      <Link href="/app/unopened" className={navLinkClass("/app/unopened", pathname)}>
        Mailbox (unopened)
      </Link>
      <Link href="/app/opened" className={navLinkClass("/app/opened", pathname)}>
        Mailbox (opened)
      </Link>
      <Link href="/app/drafts" className={navLinkClass("/app/drafts", pathname)}>
        Drafts
      </Link>

      {/* Custom folders */}
      {customFolders.length > 0 && (
        <div className="mt-2 pt-2 border-t border-paper-dark flex flex-col gap-1">
          {customFolders.map((folder) => (
            <Link
              key={folder.id}
              href={`/app/folder/${folder.id}`}
              className={navLinkClass(`/app/folder/${folder.id}`, pathname, true) + " truncate"}
              title={folder.name}
            >
              {folder.name}
            </Link>
          ))}
        </div>
      )}

      {/* Settings + Logout — pushed to bottom */}
      <div className="mt-auto pt-2 border-t border-paper-dark flex flex-col gap-1">
        <Link
          href="/app/settings"
          className={navLinkClass("/app/settings", pathname) + " text-ink-muted"}
        >
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="block w-full text-left px-3 py-2 text-sm rounded transition-colors text-seal/80 hover:bg-paper-dark hover:text-seal"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
