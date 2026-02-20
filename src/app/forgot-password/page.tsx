/**
 * @file src/app/forgot-password/page.tsx
 * Forgot password page (/forgot-password).
 *
 * Allows users to request a password reset via their recovery email.
 * Calls POST /api/auth/forgot-password with their username.
 *
 * Three outcomes (rendered after submit):
 *   "sent"             — generic confirmation; hides whether account exists
 *   "no_recovery_email" — account has no recovery email; user must log in to add one
 *   Error              — rate limit or server failure
 */

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

type SubmitStatus = "idle" | "sent" | "no_recovery_email";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);
    setStatus("idle");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      const data = (await res.json()) as {
        status?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.status === "no_recovery_email") {
        setStatus("no_recovery_email");
      } else {
        setStatus("sent");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6 py-12">
      <div className="max-w-sm w-full space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif text-ink">Reset your password</h1>
          <p className="text-sm text-ink-muted">
            Remember your password?{" "}
            <Link href="/login" className="underline hover:text-ink">
              Log in
            </Link>
          </p>
        </div>

        {/* ── Success: email sent ───────────────────────────────────────────── */}
        {status === "sent" && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-4 space-y-1">
            <p className="text-sm font-medium text-green-800">Check your email</p>
            <p className="text-sm text-green-700">
              If that username has a recovery email on file, a password reset link has been sent.
              It may take a few minutes to arrive.
            </p>
          </div>
        )}

        {/* ── No recovery email on account ─────────────────────────────────── */}
        {status === "no_recovery_email" && (
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-4 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              No recovery email on this account
            </p>
            <p className="text-sm text-amber-700">
              This account doesn&apos;t have a recovery email set. Log in and go to{" "}
              <strong>Settings → Password Recovery</strong> to add one.
            </p>
            <Link href="/login" className="block text-sm text-amber-800 underline hover:text-amber-900">
              Go to login →
            </Link>
          </div>
        )}

        {/* ── Form (hidden after success) ───────────────────────────────────── */}
        {status === "idle" && (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded border border-seal/40 bg-seal/10 px-4 py-3 text-sm text-seal"
              >
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-ink">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                required
                placeholder="your_username"
                className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
              />
              <p className="text-xs text-ink-muted">
                We&apos;ll send a reset link to the recovery email linked to this account.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              Send reset link
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
