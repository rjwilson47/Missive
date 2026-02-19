/**
 * @file src/app/signup/page.tsx
 * Signup page (/signup).
 *
 * Collects username, password, region, and timezone.
 * Calls POST /api/auth/signup. On success stores the access token in
 * localStorage under "missive_token" and redirects to /app/unopened.
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import TimezoneSelect from "@/components/ui/TimezoneSelect";

const TOKEN_KEY = "missive_token";

export default function SignupPage() {
  const router = useRouter();

  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("");
  const [timezone, setTimezone] = useState(browserTz);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, region, timezone }),
      });

      const data = (await res.json()) as {
        user?: unknown;
        accessToken?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (!data.accessToken) {
        setError("No token returned. Please try again.");
        return;
      }

      localStorage.setItem(TOKEN_KEY, data.accessToken);
      router.replace("/app/unopened");
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
          <h1 className="text-2xl font-serif text-ink">Create account</h1>
          <p className="text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-ink">
              Log in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <div
              role="alert"
              className="rounded border border-seal/40 bg-seal/10 px-4 py-3 text-sm text-seal"
            >
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label htmlFor="username" className="block text-sm font-medium text-ink">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              minLength={3}
              maxLength={20}
              placeholder="e.g. penpal_jane"
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
            />
            <p className="text-xs text-ink-faint">
              3–20 characters. Letters, digits, underscores, hyphens. Must start with
              a letter.
            </p>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
            />
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
              required
              placeholder="e.g. Victoria, Australia"
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
            />
            <p className="text-xs text-ink-faint">
              Shown on your letters (city, country, or region).
            </p>
          </div>

          {/* Timezone */}
          <TimezoneSelect
            id="timezone"
            label="Timezone"
            value={timezone}
            onChange={setTimezone}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Create account
          </Button>
        </form>
      </div>
    </main>
  );
}
