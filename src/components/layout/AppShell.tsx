/**
 * @file src/components/layout/AppShell.tsx
 * Client-side auth guard + app shell for all authenticated /app/* pages.
 *
 * Responsibilities:
 *   1. On mount: read JWT from localStorage("missive_token")
 *   2. Verify token via GET /api/me
 *   3. Redirect to /login if token is absent or the API returns 401
 *   4. Fetch custom folders from GET /api/folders for the Sidebar
 *   5. Render Sidebar + main content panel once authenticated
 *
 * Loading state:
 *   Shows a blank screen (no spinner flash) while the initial auth check runs.
 *   This avoids a content flash before redirect.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser, FolderShape } from "@/types";
import Sidebar from "@/components/layout/Sidebar";

const TOKEN_KEY = "missive_token";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Authenticated application shell component.
 *
 * Guards all /app/* routes by validating the stored JWT.
 * Redirects unauthenticated users to /login.
 * Fetches the folder list for the sidebar.
 *
 * @param children - Page content to render inside the main panel.
 */
export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();

  // null = still checking; AppUser = authenticated; "error" = redirect needed
  const [user, setUser] = useState<AppUser | null | "unauthenticated">(null);
  const [customFolders, setCustomFolders] = useState<FolderShape[]>([]);

  useEffect(() => {
    async function checkAuth() {
      const token =
        typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

      if (!token) {
        // No token stored — send to login immediately
        router.replace("/login");
        setUser("unauthenticated");
        return;
      }

      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // Token invalid or expired — clear and redirect
          localStorage.removeItem(TOKEN_KEY);
          router.replace("/login");
          setUser("unauthenticated");
          return;
        }

        const data: AppUser = await res.json();
        setUser(data);
      } catch {
        // Network error — redirect to login rather than hanging
        router.replace("/login");
        setUser("unauthenticated");
      }
    }

    checkAuth();
  }, [router]);

  // Fetch custom folders once authenticated
  useEffect(() => {
    if (!user || user === "unauthenticated") return;

    async function loadFolders() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;

      try {
        const res = await fetch("/api/folders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: FolderShape[] = await res.json();
          // Only custom folders (no system type) go in the sidebar list
          setCustomFolders(data.filter((f) => f.systemType === null));
        }
      } catch {
        // Non-fatal — sidebar just won't show custom folders
      }
    }

    loadFolders();
  }, [user]);

  // While auth check is in flight, render nothing (avoids flash)
  if (!user || user === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar customFolders={customFolders} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
