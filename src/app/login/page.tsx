/**
 * @file src/app/login/page.tsx
 * Login page (/login).
 *
 * Collects username and password.
 * Calls POST /api/auth/login. On success stores the access token in
 * localStorage under "missive_token" and redirects to /app/unopened.
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

const TOKEN_KEY = "missive_token";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json()) as {
        user?: unknown;
        accessToken?: string;
        error?: string;
      };

      if (!res.ok) {
        // Always show a generic message — server already sends one
        setError(data.error ?? "Invalid username or password.");
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
          <h1 className="text-2xl font-serif text-ink">Log in</h1>
          <p className="text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline hover:text-ink">
              Create one
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
              placeholder="your_username"
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
            />
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
              autoComplete="current-password"
              required
              placeholder="Your password"
              className="w-full border border-paper-dark rounded px-3 py-2 text-sm text-ink bg-white focus-visible:ring-2 focus-visible:ring-seal focus:outline-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Log in
          </Button>

          <p className="text-center text-sm text-ink-muted">
            <Link href="/forgot-password" className="underline hover:text-ink">
              Forgot password?
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
