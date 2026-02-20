/**
 * @file src/app/safety/page.tsx
 * Safety page (/safety) — static, public.
 *
 * Explains blocking, reporting, privacy, and account safety features.
 */

import Link from "next/link";

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-16">
      <div className="max-w-prose mx-auto space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-serif text-ink">Safety &amp; Privacy</h1>
          <p className="text-ink-muted leading-relaxed">
            Penned is designed to be a thoughtful, low-friction space. Here is
            how we keep it safe.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-serif text-ink">Blocking a sender</h2>
          <p className="text-ink-muted leading-relaxed">
            After receiving a letter, you can block the sender from any letter&apos;s
            detail view. Once blocked:
          </p>
          <ul className="text-ink-muted leading-relaxed space-y-1 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Any future letters from that sender are silently not delivered.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>The blocked person is <strong className="text-ink">never notified</strong> — they will not know they are blocked.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Their letters appear to send normally from their end.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Existing letters from them remain in your mailbox.</span>
            </li>
          </ul>
          <p className="text-ink-muted leading-relaxed">
            Blocking is private and entirely in your control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif text-ink">Reporting a letter</h2>
          <p className="text-ink-muted leading-relaxed">
            You can report any letter you receive. Reporting:
          </p>
          <ul className="text-ink-muted leading-relaxed space-y-1 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Stores the letter details and your optional reason for review.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Does <strong className="text-ink">not</strong> notify the sender.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Does not automatically remove the letter from your mailbox.</span>
            </li>
          </ul>
          <p className="text-ink-muted leading-relaxed">
            We encourage you to also block the sender if you do not want to
            receive further letters from them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif text-ink">Your privacy</h2>
          <p className="text-ink-muted leading-relaxed">
            Penned is designed with privacy by default:
          </p>
          <ul className="text-ink-muted leading-relaxed space-y-1 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Your username is private. Someone must already know it to send you a letter — there is no searchable directory.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Email, phone, and address routing are opt-in. You control whether senders can use these to find you (Settings → Discoverability).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Pen pal matching is opt-in. Your profile is not visible to anyone unless you explicitly enable matching.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Images are stored in a private bucket. Signed URLs are generated server-side and expire after one hour.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>EXIF metadata (GPS location, camera info) is stripped from all uploaded images before storage.</span>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif text-ink">Account deletion</h2>
          <p className="text-ink-muted leading-relaxed">
            You can delete your account at any time from Settings. Deletion begins
            a 30-day grace period during which you can cancel. After 30 days:
          </p>
          <ul className="text-ink-muted leading-relaxed space-y-1 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>All letters you received are permanently deleted.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ink-faint" aria-hidden="true">—</span>
              <span>Letters you sent remain in your recipients&apos; mailboxes — you cannot destroy mail that has already been delivered.</span>
            </li>
          </ul>
        </section>

        <div className="pt-4 border-t border-paper-dark">
          <Link
            href="/"
            className="text-sm text-ink-muted hover:text-ink transition-colors underline underline-offset-2"
          >
            ← Back to Penned
          </Link>
        </div>
      </div>
    </main>
  );
}
