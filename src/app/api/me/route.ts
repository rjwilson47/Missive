/**
 * @file src/app/api/me/route.ts
 * GET /api/me   — returns the current authenticated user's app profile.
 * PUT /api/me   — updates mutable profile fields (partial/patch semantics).
 *
 * GET Response (200): AppUser
 *
 * PUT Request body (all fields optional):
 *   {
 *     username?:                   string  (3–20 chars, lowercase letters/digits/_ -)
 *     region?:                     string  (freeform, required non-empty if supplied)
 *     timezone?:                   string  (must be valid IANA timezone)
 *     discoverableByEmail?:        boolean
 *     discoverableByPhone?:        boolean
 *     discoverableByAddress?:      boolean
 *     availableForPenPalMatching?: boolean
 *     penPalMatchPreference?:      "SAME_REGION" | "ANYWHERE"
 *   }
 * PUT Response (200): Updated AppUser
 *
 * Errors:
 *   401 — missing, invalid, or expired token; or no app User record found
 *   400 — invalid field value
 *   409 — username already taken
 *   422 — username change blocked (account scheduled for deletion)
 *   500 — server error
 *
 * SECURITY: Token validated against Supabase before any DB access.
 *           All queries scoped to the session user's ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser, validateUsername, normaliseUsername, prismaUserToAppUser } from "@/lib/auth";
import { isValidIanaTimezone } from "@/lib/delivery";
import prisma from "@/lib/prisma";

/** Shared 401 — same message for all failure modes (prevents enumeration) */
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// ===== GET /api/me =====

/**
 * Returns the session user's app profile.
 *
 * @param req - Incoming request with Authorization: Bearer <token>
 * @returns AppUser (200) or 401
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const appUser = await getAppUser(supabaseUser.id);
  if (!appUser) {
    console.error(`[me/GET] No app User found for supabase_user_id: ${supabaseUser.id}`);
    return UNAUTHORIZED;
  }

  return NextResponse.json(appUser);
}

// ===== PUT /api/me =====

/** Valid values for penPalMatchPreference */
const VALID_MATCH_PREFS = new Set(["SAME_REGION", "ANYWHERE"]);

/**
 * Partial profile update.
 *
 * Only fields present in the body are updated (patch semantics).
 * Omitted fields remain unchanged. An empty body is a no-op (returns current profile).
 *
 * Restrictions during deletion grace period:
 *   - username change is blocked (SPEC §K)
 *   - all other fields can still be updated
 *
 * @param req - Incoming request with Authorization + JSON body
 * @returns Updated AppUser (200) or error response
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── Build update data — validate only fields that are present ─────────────
  const data: Record<string, unknown> = {};

  // username
  if ("username" in body) {
    // Blocked during deletion grace period
    if (me.markedForDeletionAt !== null) {
      return NextResponse.json(
        { error: "Account scheduled for deletion. Cancel deletion in Settings to change your username." },
        { status: 422 }
      );
    }

    const raw = body.username;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "username must be a string." }, { status: 400 });
    }
    const normalised = normaliseUsername(raw);
    const err = validateUsername(normalised);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    data.username = normalised;
  }

  // region
  if ("region" in body) {
    const raw = body.region;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return NextResponse.json({ error: "region must be a non-empty string." }, { status: 400 });
    }
    data.region = raw.trim();
  }

  // timezone
  if ("timezone" in body) {
    const raw = body.timezone;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "timezone must be a string." }, { status: 400 });
    }
    if (!isValidIanaTimezone(raw)) {
      return NextResponse.json({ error: "Invalid timezone. Please select from the list." }, { status: 400 });
    }
    data.timezone = raw;
  }

  // Boolean discoverability flags
  for (const field of ["discoverableByEmail", "discoverableByPhone", "discoverableByAddress", "availableForPenPalMatching"] as const) {
    if (field in body) {
      if (typeof body[field] !== "boolean") {
        return NextResponse.json({ error: `${field} must be a boolean.` }, { status: 400 });
      }
      data[field] = body[field];
    }
  }

  // penPalMatchPreference
  if ("penPalMatchPreference" in body) {
    const raw = body.penPalMatchPreference;
    if (typeof raw !== "string" || !VALID_MATCH_PREFS.has(raw)) {
      return NextResponse.json(
        { error: "penPalMatchPreference must be \"SAME_REGION\" or \"ANYWHERE\"." },
        { status: 400 }
      );
    }
    data.penPalMatchPreference = raw;
  }

  // No-op if nothing to update
  if (Object.keys(data).length === 0) {
    return NextResponse.json(me);
  }

  // ── Write to DB ───────────────────────────────────────────────────────────
  try {
    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
    });
    return NextResponse.json(prismaUserToAppUser(updated));
  } catch (err: unknown) {
    // Prisma P2002 = unique constraint violation (username taken)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Username already taken. Please try another." },
        { status: 409 }
      );
    }
    console.error("[PUT /api/me] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
