/**
 * @file src/app/api/auth/logout/route.ts
 * POST /api/auth/logout
 *
 * Invalidates the current Supabase session (server-side sign-out).
 * The client must also discard the stored access token after calling this.
 *
 * Request:  Authorization: Bearer <access_token>
 * Response: { success: true }
 *
 * Errors:
 *   401 — no valid token provided (still returns success-ish; client should clear token anyway)
 *
 * Note: We return 200 even if the token is already expired or invalid.
 * There's no harm in "logging out" an invalid session — the client just clears its token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");

  // Even with no token, return success — the client should clear its stored token regardless
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ success: true });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ success: true });
  }

  // Create a short-lived client scoped to this request's session token.
  // Using the anon key + token allows us to call signOut for this specific session.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Build a per-request client that uses the user's access token
    const sessionClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Sign out this specific session (scope: "local" = only this token, not all devices)
    const { error } = await sessionClient.auth.signOut({ scope: "local" });

    if (error) {
      // Log the error but don't expose it — the session may already be expired
      console.error("[logout] Supabase signOut error:", error.message);
    }
  } catch (err) {
    // Non-fatal — the client will discard the token regardless
    console.error("[logout] Unexpected error:", err);
  }

  return NextResponse.json({ success: true });
}
