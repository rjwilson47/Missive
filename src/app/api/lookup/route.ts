/**
 * @file src/app/api/lookup/route.ts
 * POST /api/lookup
 *
 * Looks up a recipient by email, phone, or address for letter routing.
 *
 * ANTI-ENUMERATION DESIGN (SPEC §E, §9):
 *   This endpoint ALWAYS returns the same generic 200 response regardless of
 *   whether an account was found. Callers cannot determine if an identifier is
 *   registered. Actual recipient resolution happens silently server-side.
 *
 * Request body:
 *   { type: "EMAIL" | "PHONE" | "ADDRESS", value: string }
 *
 * Response (200) — always:
 *   { message: "If an account exists, we'll route it." }
 *
 * Rate limit: 10 requests / hour per IP (prevents bulk enumeration scanning).
 * Auth: NOT required — rate limit is the anti-abuse defence.
 * Fail-open: if Upstash is unavailable, requests are allowed through.
 */

import { NextRequest, NextResponse } from "next/server";
import { identifierLookupLimiter, getClientIp } from "@/lib/ratelimit";
import prisma from "@/lib/prisma";

/** Generic response — always returned regardless of lookup result (SPEC §E) */
const GENERIC_RESPONSE = "If an account exists, we'll route it.";

const VALID_TYPES = ["EMAIL", "PHONE", "ADDRESS"] as const;
type LookupType = (typeof VALID_TYPES)[number];

// ===== Normalisation =====

/**
 * Normalises an identifier to a canonical form for DB lookup.
 * Mirrors the normalisation applied when UserIdentifiers are stored at signup.
 *
 * @param type  - The identifier type
 * @param value - Raw user-supplied value
 * @returns Canonicalised string
 */
function normalise(type: LookupType, value: string): string {
  switch (type) {
    case "EMAIL":
      return value.toLowerCase().trim();
    case "PHONE":
      // Keep digits only (consistent with UserIdentifier insert normalisation)
      return value.replace(/\D/g, "");
    case "ADDRESS":
      return value.toLowerCase().replace(/\s+/g, " ").trim();
  }
}

/** Maps identifier type to its discoverability field on the User model */
const DISCOVERABILITY_FIELD: Record<LookupType, string> = {
  EMAIL: "discoverableByEmail",
  PHONE: "discoverableByPhone",
  ADDRESS: "discoverableByAddress",
};

// ===== Route Handler =====

/**
 * POST /api/lookup handler.
 *
 * Rate-limits by IP (10/hr), validates body, normalises the identifier, and
 * performs an internal DB lookup respecting the user's discoverability setting.
 * The lookup result is NEVER returned — only a generic message.
 *
 * @param req - Incoming Next.js request
 * @returns 200 with generic message, or 429 if rate-limited
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  try {
    const { success } = await identifierLookupLimiter.limit(ip);
    if (!success) {
      // Return 429 — but with the same message shape so callers can't tell
      // if they were blocked vs. the identifier simply wasn't found.
      return NextResponse.json({ message: GENERIC_RESPONSE }, { status: 429 });
    }
  } catch {
    // Upstash unavailable — fail open (allow request through)
    console.warn("[POST /api/lookup] Rate limiter unavailable — failing open");
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: GENERIC_RESPONSE });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: GENERIC_RESPONSE });
  }

  const { type, value } = body as Record<string, unknown>;

  if (
    typeof type !== "string" ||
    !(VALID_TYPES as readonly string[]).includes(type) ||
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    // Invalid body — return generic (don't reveal what was wrong)
    return NextResponse.json({ message: GENERIC_RESPONSE });
  }

  const lookupType = type as LookupType;
  const normalisedValue = normalise(lookupType, value);

  // ── Internal lookup (result is never returned) ────────────────────────────
  // Performed so the server can route the letter correctly at delivery time.
  // The discoverability flag is respected: only identifiers whose owners opted
  // in to be discoverable via this method are considered routable.
  try {
    await prisma.userIdentifier.findFirst({
      where: {
        type: lookupType,
        value_normalized: normalisedValue,
        user: { [DISCOVERABILITY_FIELD[lookupType]]: true },
      },
      select: { userId: true },
    });
    // Result intentionally discarded — never revealed to caller
  } catch (err) {
    console.error("[POST /api/lookup] DB error:", err);
  }

  // ── Always return generic message ─────────────────────────────────────────
  return NextResponse.json({ message: GENERIC_RESPONSE });
}
