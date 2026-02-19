/**
 * @file src/app/safety/page.tsx
 * Safety page (/safety) — static, public.
 *
 * Explains blocking and reporting features to users.
 *
 * TODO (Session 5): Flesh out full safety copy.
 */

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-16">
      <div className="max-w-prose mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-ink">Safety</h1>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Blocking</h2>
          <p className="text-ink-muted leading-relaxed">
            After receiving a letter from someone, you can block them. Once
            blocked, any future letters they attempt to send you will silently
            not be delivered — they will not know they are blocked.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Reporting</h2>
          <p className="text-ink-muted leading-relaxed">
            You can report any letter you receive. Reports are reviewed by our
            team. Reporting does not notify the sender.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Privacy</h2>
          <p className="text-ink-muted leading-relaxed">
            Your username is private — it can only be used to send you a letter
            if someone already knows it. You can control whether you are
            discoverable via email, phone number, or address in Settings.
          </p>
        </section>
      </div>
    </main>
  );
}
