/**
 * @file src/app/login/page.tsx
 * Login page (/login).
 *
 * Collects: username, password.
 * Calls POST /api/auth/login on submit.
 * On success: stores access token and redirects to /app/unopened.
 *
 * TODO (Session 1): Implement form + API call.
 */

"use client";

export default function LoginPage() {
  // TODO: implement login form
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-serif text-ink">Log in</h1>
        <p className="text-ink-muted text-sm">TODO: login form</p>
      </div>
    </main>
  );
}
