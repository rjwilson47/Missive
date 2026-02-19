/**
 * @file src/app/api/me/route.ts
 * GET /api/me
 *
 * Returns the current authenticated user's app profile.
 * Used by the client on load to hydrate the user session context.
 *
 * Request:  Authorization: Bearer <access_token>
 * Response (200): AppUser
 *
 * Errors:
 *   401 — missing, invalid, or expired token; or no app User record found
 *
 * SECURITY: Token is validated against Supabase before any DB access.
 *           All queries are scoped to the session user's ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";

/** Shared 401 — same message for all failure modes (prevents enumeration) */
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ===== 1. Validate Supabase JWT =====
  // getUserFromHeader() verifies the token with Supabase and returns the auth user.
  // Returns null for missing, expired, or tampered tokens — always check before DB.
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));

  if (!supabaseUser) {
    return UNAUTHORIZED;
  }

  // ===== 2. Look up app User record =====
  // The supabase_user_id links Supabase auth to the app User table.
  // Null here means the auth user exists but the signup DB insert failed (data issue).
  const appUser = await getAppUser(supabaseUser.id);

  if (!appUser) {
    console.error(`[me] No app User found for supabase_user_id: ${supabaseUser.id}`);
    return UNAUTHORIZED;
  }

  return NextResponse.json(appUser);
}
