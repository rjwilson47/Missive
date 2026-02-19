/**
 * @file src/app/signup/page.tsx
 * Signup page (/signup).
 *
 * Collects: username, password, region (freeform), timezone (IANA dropdown).
 * Calls POST /api/auth/signup on submit.
 * On success: stores access token and redirects to /app/unopened.
 *
 * TODO (Session 1): Implement form + API call.
 * TODO (Session 1): Wire up TimezoneSelect component.
 */

"use client";

export default function SignupPage() {
  // TODO: implement signup form
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-serif text-ink">Create account</h1>
        <p className="text-ink-muted text-sm">TODO: signup form</p>
      </div>
    </main>
  );
}
