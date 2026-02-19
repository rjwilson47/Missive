/**
 * @file src/app/page.tsx
 * Landing page (/).
 *
 * Public page — displays the Missive concept with Sign Up / Log In CTAs.
 *
 * TODO (Session 6): Implement full landing page design.
 */

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-paper px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-4xl font-serif tracking-tight text-ink">Missive</h1>
        <p className="text-ink-muted text-lg leading-relaxed">
          Write letters. Seal them. Wait for delivery.
          <br />
          Intentionally slow. Deliberately personal.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-ink text-paper rounded text-sm font-medium hover:bg-ink/80 transition-colors focus-visible:ring-2 focus-visible:ring-seal"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-ink-muted text-ink rounded text-sm font-medium hover:bg-paper-warm transition-colors"
          >
            Log in
          </Link>
        </div>
        <p className="text-ink-faint text-xs">
          <Link href="/safety" className="underline underline-offset-2 hover:text-ink-muted">
            Safety &amp; blocking
          </Link>
        </p>
      </div>
    </main>
  );
}
