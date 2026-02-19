/**
 * @file src/lib/supabase.ts
 * Supabase client factories.
 *
 * Two clients are exported:
 *   - `supabaseAnon`  — uses the public anon key; safe for server-side
 *     operations that don't require elevated permissions.
 *   - `supabaseAdmin` — uses the service role key; bypasses Row Level Security
 *     (which we don't use in MVP, but service role is required for auth admin
 *     operations such as updating a user's email or deleting an auth user).
 *
 * IMPORTANT: `supabaseAdmin` must NEVER be imported in client components.
 * It is for server-side use only (API routes, server components).
 */

import { createClient } from "@supabase/supabase-js";

// Validate required env vars at module load time (fails fast during startup)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."
  );
}

/**
 * Anon Supabase client.
 * Use for: reading session tokens from request headers, non-admin operations.
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin (service role) Supabase client.
 * Use for: auth user creation/update/deletion, admin DB queries.
 * SERVER SIDE ONLY — never expose service role key to the client.
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export const supabaseAdmin = (() => {
  if (!supabaseServiceRoleKey) {
    // In development, surface a clear error immediately
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY — required for admin Supabase operations."
      );
    }
    // In production, throw at runtime when actually used (avoids build-time crash
    // in edge cases where the admin client isn't needed for a given code path)
    return null as unknown as ReturnType<typeof createClient>;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      // Disable auto-refresh for server-side client (no browser session needed)
      autoRefreshToken: false,
      persistSession: false,
    },
  });
})();

/**
 * Retrieves and validates the current user from the Authorization header.
 *
 * @param authHeader - Value of the `Authorization` header (e.g. "Bearer <token>")
 * @returns Supabase user object if the token is valid, otherwise null
 *
 * @example
 * const user = await getUserFromHeader(req.headers.get("authorization"));
 * if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getUserFromHeader(
  authHeader: string | null
): Promise<import("@supabase/supabase-js").User | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user;
}
