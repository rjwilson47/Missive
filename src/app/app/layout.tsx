/**
 * @file src/app/app/layout.tsx
 * Authenticated app shell layout for all /app/* pages.
 *
 * Architecture:
 *   - This server component exports metadata and renders the AppShell client wrapper.
 *   - AppShell (client) reads the JWT from localStorage, validates it via GET /api/me,
 *     and redirects to /login if the token is missing or invalid.
 *   - Custom folders are fetched inside AppShell and passed to the Sidebar.
 *
 * Auth guard approach:
 *   We cannot use Next.js middleware without a cookies-based session (we use localStorage).
 *   The client-side guard is the correct pattern for localStorage token auth.
 *   A brief loading spinner is shown while the token is being verified.
 */

import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Penned — My Mailbox",
};

/**
 * Root layout for all authenticated /app/* routes.
 * Renders AppShell which handles token validation and sidebar.
 *
 * @param children - The page content to render inside the main panel.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
