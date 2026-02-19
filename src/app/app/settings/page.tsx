/**
 * @file src/app/app/settings/page.tsx
 * Settings page (/app/settings).
 *
 * Sections:
 *   - Change username
 *   - Change region / timezone
 *   - Discoverability toggles (email / phone / address)
 *   - Pen pal matching toggle + preference
 *   - Manage UserIdentifiers (add/remove email, phone, address)
 *   - Account deletion (30-day grace period)
 *   - Cancel pending deletion
 *
 * TODO (Session 6): Implement all settings sections.
 */

"use client";

export default function SettingsPage() {
  // TODO: implement settings form sections
  return (
    <div className="space-y-8 max-w-prose">
      <h1 className="text-xl font-serif text-ink">Settings</h1>
      <p className="text-ink-muted text-sm">TODO: settings sections</p>
    </div>
  );
}
