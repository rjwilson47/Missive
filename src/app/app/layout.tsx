/**
 * @file src/app/app/layout.tsx
 * Authenticated app shell layout.
 *
 * Wraps all /app/* pages with the left sidebar and the main content panel.
 * Auth guard: redirects to /login if no access token is present.
 *
 * TODO (Session 4): Implement sidebar + auth guard.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Missive — My Mailbox",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // TODO: implement sidebar + auth guard
  return (
    <div className="flex min-h-screen bg-paper">
      {/* TODO: <Sidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
