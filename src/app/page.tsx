/**
 * @file src/app/page.tsx
 * Landing page (/).
 *
 * Public marketing page explaining the Missive concept with sign-up/login CTAs.
 * Static server component — no auth, no data fetching.
 */

import Link from "next/link";

/** A single feature item shown in the "How it works" section. */
function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="space-y-2">
      <div className="text-2xl" aria-hidden="true">{icon}</div>
      <h3 className="font-serif text-ink text-base font-semibold">{title}</h3>
      <p className="text-ink-muted text-sm leading-relaxed">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center min-h-[45vh] px-6 pt-12 pb-8 text-center space-y-5">
        <div className="space-y-3 max-w-xl">
          <p className="text-xs uppercase tracking-widest text-ink-muted font-medium">
            Slow mail for the modern age
          </p>
          <h1 className="text-5xl sm:text-6xl font-serif tracking-tight text-ink leading-tight">
            Penned
          </h1>
          <p className="font-serif text-xl sm:text-2xl text-ink leading-snug">
            The inbox you actually want to open
          </p>
          <p className="text-ink-muted text-lg sm:text-xl leading-relaxed max-w-md mx-auto">
            Write letters. Seal them. Wait for delivery.
            <br className="hidden sm:block" />
            Intentionally slow. Deliberately personal.
          </p>
          <p className="text-ink-faint text-sm leading-relaxed max-w-sm mx-auto">
            Every letter is typed or penned by you, and postmarked for
            delivery - just like the post used to be.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="px-7 py-3 bg-ink text-paper rounded text-sm font-medium hover:bg-ink/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal focus-visible:ring-offset-2"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="px-7 py-3 border border-ink-muted text-ink rounded text-sm font-medium hover:bg-paper-warm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal focus-visible:ring-offset-2"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* ── The idea ──────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-16 space-y-6 border-t border-paper-dark">
        <h2 className="font-serif text-2xl text-ink">In a world of instant messages…</h2>
        <p className="text-ink-muted leading-relaxed">
          Penned brings back the art of the letter. You write. You seal it.
          Then it travels — taking at least 24 business hours or more to arrive,
          delivered at 4:00 PM in your recipient's timezone, just like the post.
        </p>
        <p className="text-ink-muted leading-relaxed">
          No subject lines. No read receipts. No "seen at 9:42 PM." Just the
          quiet anticipation of a letter on its way, and the joy of tearing
          open an envelope that's been waiting in your mailbox.
        </p>
      </section>

      {/* ── No junk mail ──────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-16 space-y-6 border-t border-paper-dark">
        <h2 className="font-serif text-2xl text-ink">No junk mail</h2>
        <p className="text-ink-muted leading-relaxed">
          No promotions. No newsletters. No spam. No algorithmic feed fighting
          for your attention. Your mailbox only has letters from people who sat
          down and wrote to you. That&rsquo;s it. The way a mailbox should be.
        </p>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-12 space-y-10 border-t border-paper-dark">
        <h2 className="font-serif text-2xl text-ink">How it works</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <Feature
            icon="✍️"
            title="Write"
            body="Compose a letter in one of six stationery fonts, or upload photos of your handwritten pages. No copy-paste — you must write it."
          />
          <Feature
            icon="✉️"
            title="Seal"
            body="Address it to a username and seal the envelope. Once sent, the letter is immutable — no edits, no recalls. It's in the post."
          />
          <Feature
            icon="⏳"
            title="Wait"
            body="Letters take at least 24 business hours to arrive, then land at 4:00 PM in the recipient's timezone. The wait is part of the experience."
          />
          <Feature
            icon="📬"
            title="Tear open"
            body="When your letter arrives, it sits sealed in your mailbox. You must click 'Tear open envelope' to reveal the contents — just like real mail."
          />
        </div>
      </section>

      {/* ── Looking for someone ───────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-16 space-y-6 border-t border-paper-dark">
        <h2 className="font-serif text-2xl text-ink">Looking for someone?</h2>
        <p className="text-ink-muted leading-relaxed">
          People can link their email, phone, or mailing address to their
          account username so you can find them. Perfect for tracking down an
          old friend. If they haven&rsquo;t, or they&rsquo;d rather not be found — we&rsquo;ll
          never tell you. We just say &ldquo;if an account exists, we&rsquo;ll route it.&rdquo;
        </p>
      </section>

      {/* ── Write to a stranger ───────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-16 space-y-6 border-t border-paper-dark">
        <h2 className="font-serif text-2xl text-ink">Write to a stranger.</h2>
        <p className="text-ink-muted leading-relaxed">
          Don&rsquo;t know who to write to? We&rsquo;ll match you with someone looking
          for the same thing — a real letter from a real person.
        </p>
      </section>

      {/* ── Rules ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-12 space-y-6 border-t border-paper-dark">
        <h2 className="font-serif text-2xl text-ink">A few ground rules</h2>
        <ul className="space-y-3 text-ink-muted text-sm leading-relaxed list-none">
          {[
            "You can send up to 3 letters per day - we want to encourage meaningful correspondence.",
            "No subject lines. Ever.",
            "Once sent, a letter cannot be deleted, recalled, or edited.",
            "Copy, cut, and paste are disabled while composing — you must type it.",
            "Letters you send disappear from your view. There is no sent folder.",
            "You can block senders; they will never know.",
            "Pen pal matching connects you with a stranger for a first letter.",
          ].map((rule) => (
            <li key={rule} className="flex gap-3">
              <span className="text-ink-faint select-none" aria-hidden="true">—</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-paper-dark text-center py-8 px-6 space-y-3">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-ink-muted">
          <Link href="/signup" className="hover:text-ink transition-colors">
            Create account
          </Link>
          <Link href="/login" className="hover:text-ink transition-colors">
            Log in
          </Link>
          <Link href="/safety" className="hover:text-ink transition-colors">
            Safety &amp; blocking
          </Link>
        </div>
        <p className="text-ink-faint text-xs">
          Penned — slow mail, on purpose.
        </p>
      </footer>
    </main>
  );
}
