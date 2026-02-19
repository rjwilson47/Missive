/**
 * @file src/app/layout.tsx
 * Root layout for the Missive application.
 * Applies global styles (Tailwind base) and the default HTML shell.
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Missive — Digital Post Mail",
  description: "Write letters. Seal them. Wait for delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
