/**
 * @file src/app/app/settings/page.tsx
 * Settings page (/app/settings).
 *
 * Sections:
 *   1. Profile          — username, region, timezone (explicit Save)
 *   2. Discoverability  — email/phone/address toggles (auto-save on toggle)
 *   3. Pen Pal          — matching opt-in + region preference (auto-save on change)
 *   4. Password Recovery — recovery email for password reset (explicit Save)
 *   5. Identifiers      — list + add email/phone/address; delete individual entries
 *   6. Account          — delete account (30-day grace) or cancel pending deletion
 *
 * All API calls use the stored missive_token from localStorage.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AppUser, UserIdentifierShape, IdentifierType } from "@/types";
import Button from "@/components/ui/Button";
import TimezoneSelect from "@/components/ui/TimezoneSelect";

const TOKEN_KEY = "missive_token";

// ===== Helpers =====

/** Formats an ISO timestamp as a human-readable date (e.g. "19 Mar 2026"). */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Returns the ISO string 30 days after a given ISO timestamp. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ===== Toggle switch =====

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Accessible toggle switch (ARIA role="switch").
 * Clicking immediately calls onChange — callers handle async save.
 */
function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-label={label}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-ink" : "bg-paper-dark",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow",
          "transform transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ===== Section wrapper =====

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 py-6 border-b border-paper-dark last:border-0">
      <h2 className="text-lg font-serif text-ink">{title}</h2>
      {children}
    </section>
  );
}

// ===== Main page =====

/**
 * Settings page component.
 * Loads profile + identifiers on mount; provides forms for all settings sections.
 */
export default function SettingsPage() {
  const router = useRouter();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [user, setUser] = useState<AppUser | null>(null);
  const [identifiers, setIdentifiers] = useState<UserIdentifierShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Profile form state ─────────────────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [region, setRegion] = useState("");
  const [timezone, setTimezone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // ── Toggle saving state ────────────────────────────────────────────────────
  const [toggleSaving, setToggleSaving] = useState<string | null>(null); // field name being saved
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ── Identifiers state ──────────────────────────────────────────────────────
  const [addType, setAddType] = useState<IdentifierType>("EMAIL");
  const [addValue, setAddValue] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Recovery email state ───────────────────────────────────────────────────
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryEmailSaving, setRecoveryEmailSaving] = useState(false);
  const [recoveryEmailError, setRecoveryEmailError] = useState<string | null>(null);
  const [recoveryEmailSuccess, setRecoveryEmailSuccess] = useState(false);

  // ── Account deletion state ─────────────────────────────────────────────────
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { router.replace("/login"); return; }

      try {
        const [meRes, idRes] = await Promise.all([
          fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/me/identifiers", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!meRes.ok) { router.replace("/login"); return; }

        const userData: AppUser = await meRes.json();
        setUser(userData);
        setUsername(userData.username);
        setRegion(userData.region);
        setTimezone(userData.timezone);
        setRecoveryEmail(userData.recoveryEmail ?? "");

        if (idRes.ok) setIdentifiers(await idRes.json());
      } catch {
        setLoadError("Failed to load settings. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // ── Profile save ───────────────────────────────────────────────────────────
  const handleProfileSave = useCallback(async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, region, timezone }),
      });

      const body = await res.json();
      if (!res.ok) {
        setProfileError((body as { error?: string }).error ?? "Failed to save.");
      } else {
        setUser(body as AppUser);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch {
      setProfileError("Failed to save. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }, [user, username, region, timezone]);

  // ── Auto-save a boolean toggle field via PUT /api/me ──────────────────────
  const handleToggle = useCallback(async (field: string, value: boolean) => {
    if (!user) return;
    setToggleSaving(field);
    setToggleError(null);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      const body = await res.json();
      if (!res.ok) {
        setToggleError((body as { error?: string }).error ?? "Failed to save.");
      } else {
        setUser(body as AppUser);
      }
    } catch {
      setToggleError("Failed to save. Please try again.");
    } finally {
      setToggleSaving(null);
    }
  }, [user]);

  // ── Save recovery email ────────────────────────────────────────────────────
  const handleSaveRecoveryEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryEmailSaving(true);
    setRecoveryEmailError(null);
    setRecoveryEmailSuccess(false);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Send null to clear; send trimmed value to set
        body: JSON.stringify({ recoveryEmail: recoveryEmail.trim() || null }),
      });

      const body = await res.json();
      if (!res.ok) {
        setRecoveryEmailError((body as { error?: string }).error ?? "Failed to save.");
      } else {
        setUser(body as AppUser);
        setRecoveryEmailSuccess(true);
        setTimeout(() => setRecoveryEmailSuccess(false), 3000);
      }
    } catch {
      setRecoveryEmailError("Failed to save. Please try again.");
    } finally {
      setRecoveryEmailSaving(false);
    }
  }, [recoveryEmail]);

  // ── Add identifier ─────────────────────────────────────────────────────────
  const handleAddIdentifier = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addValue.trim()) { setAddError("Please enter a value."); return; }

    setAddLoading(true);
    setAddError(null);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch("/api/me/identifiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: addType, value: addValue }),
      });

      const body = await res.json();
      if (!res.ok) {
        setAddError((body as { error?: string }).error ?? "Failed to add.");
      } else {
        setIdentifiers((prev) => [...prev, body as UserIdentifierShape]);
        setAddValue("");
      }
    } catch {
      setAddError("Failed to add. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }, [addType, addValue]);

  // ── Remove identifier ──────────────────────────────────────────────────────
  const handleRemoveIdentifier = useCallback(async (id: string) => {
    setDeletingId(id);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`/api/me/identifiers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIdentifiers((prev) => prev.filter((x) => x.id !== id));
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = useCallback(async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account?\n\n" +
      "Your account will be scheduled for deletion in 30 days. " +
      "You can cancel this in Settings during the grace period.\n\n" +
      "After 30 days: all your received letters will be permanently deleted. " +
      "Letters you sent will remain in your recipients' mailboxes."
    );
    if (!confirmed) return;

    setDeleteLoading(true);
    setDeleteError(null);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch("/api/me/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError((body as { error?: string }).error ?? "Failed to initiate deletion.");
      } else {
        // Refresh user to show updated markedForDeletionAt
        const meRes = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        if (meRes.ok) setUser(await meRes.json());
      }
    } catch {
      setDeleteError("Failed to initiate deletion. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }, []);

  // ── Cancel deletion ────────────────────────────────────────────────────────
  const handleCancelDeletion = useCallback(async () => {
    setCancelLoading(true);

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch("/api/me/cancel-delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Refresh user to clear markedForDeletionAt
        const meRes = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        if (meRes.ok) setUser(await meRes.json());
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setCancelLoading(false);
    }
  }, []);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="max-w-prose space-y-4">
        <p className="text-red-600 text-sm" role="alert">{loadError ?? "Failed to load settings."}</p>
        <Button variant="ghost" onClick={() => router.back()}>← Back</Button>
      </div>
    );
  }

  const inDeletionGrace = user.markedForDeletionAt !== null;
  const deletionDeadline = inDeletionGrace ? addDays(user.markedForDeletionAt!, 30) : null;

  return (
    <div className="max-w-prose space-y-0">
      <h1 className="text-2xl font-serif text-ink mb-2">Settings</h1>

      {/* Deletion banner */}
      {inDeletionGrace && (
        <div className="bg-seal/10 border border-seal/30 rounded p-4 mb-6">
          <p className="text-sm text-ink font-medium">
            Your account is scheduled for deletion on{" "}
            <strong>{formatDate(deletionDeadline!)}</strong>.
          </p>
          <p className="text-sm text-ink-muted mt-1">
            Until then you can cancel deletion below. After that date, all received letters will be permanently deleted.
          </p>
        </div>
      )}

      {/* ── Section 1: Profile ─────────────────────────────────────────────── */}
      <Section title="Profile">
        <div className="space-y-4">
          {/* Username */}
          <div className="space-y-1">
            <label htmlFor="username" className="block text-sm font-medium text-ink">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={profileSaving || inDeletionGrace}
              aria-describedby={inDeletionGrace ? "username-disabled-note" : undefined}
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none disabled:opacity-60"
              maxLength={20}
              autoComplete="username"
            />
            {inDeletionGrace && (
              <p id="username-disabled-note" className="text-xs text-ink-muted">
                Username changes are disabled during the deletion grace period.
              </p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-1">
            <label htmlFor="region" className="block text-sm font-medium text-ink">
              Region
            </label>
            <input
              id="region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={profileSaving}
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none disabled:opacity-60"
              placeholder="e.g. Victoria, AU"
            />
          </div>

          {/* Timezone */}
          <TimezoneSelect
            value={timezone}
            onChange={setTimezone}
            label="Timezone"
            id="settings-timezone"
          />

          {/* Save */}
          {profileError && (
            <p className="text-red-600 text-sm" role="alert">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-green-600 text-sm" role="status">Saved.</p>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleProfileSave}
            isLoading={profileSaving}
            disabled={inDeletionGrace && username !== user.username}
          >
            Save profile
          </Button>
        </div>
      </Section>

      {/* ── Section 2: Discoverability ─────────────────────────────────────── */}
      <Section title="Discoverability">
        <p className="text-sm text-ink-muted">
          When enabled, senders who know your email, phone number, or address
          can route letters to you without knowing your username.
        </p>

        {toggleError && (
          <p className="text-red-600 text-sm" role="alert">{toggleError}</p>
        )}

        <div className="space-y-3">
          {(
            [
              { field: "discoverableByEmail", label: "Discoverable by email" },
              { field: "discoverableByPhone", label: "Discoverable by phone" },
              { field: "discoverableByAddress", label: "Discoverable by address" },
            ] as const
          ).map(({ field, label }) => (
            <div key={field} className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink">{label}</span>
              <Toggle
                checked={user[field]}
                onChange={(val) => handleToggle(field, val)}
                label={label}
                disabled={toggleSaving === field}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Section 3: Pen Pal Matching ────────────────────────────────────── */}
      <Section title="Pen Pal Matching">
        <p className="text-sm text-ink-muted">
          Opt in to receive a randomly matched stranger to write to via "Write to a stranger."
        </p>

        <div className="space-y-4">
          {/* Availability toggle */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink">Available for pen pal matching</span>
            <Toggle
              checked={user.availableForPenPalMatching}
              onChange={(val) => handleToggle("availableForPenPalMatching", val)}
              label="Available for pen pal matching"
              disabled={toggleSaving === "availableForPenPalMatching"}
            />
          </div>

          {/* Match preference (only meaningful when opted in) */}
          <fieldset className={user.availableForPenPalMatching ? "" : "opacity-50"}>
            <legend className="text-sm font-medium text-ink mb-2">
              Match me with people
            </legend>
            <div className="space-y-2">
              {(
                [
                  { value: "SAME_REGION", label: "In my region" },
                  { value: "ANYWHERE", label: "Anywhere" },
                ] as const
              ).map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="penPalMatchPreference"
                    value={value}
                    checked={user.penPalMatchPreference === value}
                    onChange={() => handleToggle("penPalMatchPreference" as string, value as unknown as boolean)}
                    disabled={!user.availableForPenPalMatching || toggleSaving === "penPalMatchPreference"}
                    className="accent-ink"
                  />
                  <span className="text-sm text-ink">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>

      {/* ── Section 4: Password Recovery ───────────────────────────────────── */}
      <Section title="Password Recovery">
        <p className="text-sm text-ink-muted">
          Add a recovery email so you can reset your password if you forget it.
          This email is never used for login and never shown to other users.
        </p>

        <form onSubmit={handleSaveRecoveryEmail} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="recovery-email" className="block text-sm font-medium text-ink">
              Recovery email
            </label>
            <input
              id="recovery-email"
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={recoveryEmailSaving}
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none disabled:opacity-60"
              autoComplete="email"
            />
          </div>

          {/* SPEC §2-A warning — shown when input has a value */}
          {recoveryEmail.trim() !== "" && (
            <p className="text-xs text-ink-muted bg-paper-warm border border-paper-dark rounded px-3 py-2">
              ⚠️ Make sure this email is correct. We cannot verify it, and this is your only way to reset your password.
            </p>
          )}

          {recoveryEmailError && (
            <p className="text-red-600 text-sm" role="alert">{recoveryEmailError}</p>
          )}
          {recoveryEmailSuccess && (
            <p className="text-green-600 text-sm" role="status">Recovery email saved.</p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={recoveryEmailSaving}
            >
              Save
            </Button>
            {recoveryEmail.trim() !== "" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={recoveryEmailSaving}
                onClick={() => {
                  setRecoveryEmail("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </Section>

      {/* ── Section 5: Identifiers ─────────────────────────────────────────── */}
      <Section title="Routing Identifiers">
        <p className="text-sm text-ink-muted">
          Register your email, phone, or address so senders who know these can route
          letters to you (only when your discoverability setting is enabled above).
        </p>

        {/* Existing identifiers */}
        {identifiers.length > 0 ? (
          <ul className="space-y-2" role="list">
            {identifiers.map((id) => (
              <li
                key={id.id}
                className="flex items-center justify-between gap-4 bg-paper-warm px-3 py-2 rounded text-sm"
              >
                <div>
                  <span className="font-medium text-ink-muted uppercase text-xs mr-2">
                    {id.type}
                  </span>
                  <span className="text-ink">{id.valueNormalized}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveIdentifier(id.id)}
                  isLoading={deletingId === id.id}
                  aria-label={`Remove ${id.type.toLowerCase()} ${id.valueNormalized}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted italic">No identifiers registered.</p>
        )}

        {/* Add identifier form */}
        {!inDeletionGrace && (
          <form onSubmit={handleAddIdentifier} className="space-y-3 pt-2">
            <div className="flex gap-2">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as IdentifierType)}
                className="border border-paper-dark rounded px-3 py-2 text-sm bg-white text-ink focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
                aria-label="Identifier type"
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="ADDRESS">Address</option>
              </select>
              <input
                type={addType === "EMAIL" ? "email" : "text"}
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder={
                  addType === "EMAIL"
                    ? "you@example.com"
                    : addType === "PHONE"
                    ? "+61 412 345 678"
                    : "123 Main St, City"
                }
                className="flex-1 border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
                aria-label={`${addType.toLowerCase()} value`}
              />
              <Button type="submit" variant="secondary" size="sm" isLoading={addLoading}>
                Add
              </Button>
            </div>
            {addError && <p className="text-red-600 text-sm" role="alert">{addError}</p>}
          </form>
        )}
      </Section>

      {/* ── Section 6: Account ─────────────────────────────────────────────── */}
      <Section title="Account">
        {inDeletionGrace ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Your account is scheduled for permanent deletion on{" "}
              <strong>{formatDate(deletionDeadline!)}</strong>. You can cancel
              this before that date.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelDeletion}
              isLoading={cancelLoading}
            >
              Cancel account deletion
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              Deleting your account begins a 30-day grace period. After that:
              all received letters are deleted; letters you sent remain in recipients' mailboxes.
            </p>
            {deleteError && (
              <p className="text-red-600 text-sm" role="alert">{deleteError}</p>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAccount}
              isLoading={deleteLoading}
            >
              Delete account
            </Button>
          </div>
        )}
      </Section>
    </div>
  );
}
