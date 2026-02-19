/**
 * @file src/app/api/lookup/route.ts
 * POST /api/lookup
 *
 * Looks up a recipient by email, phone, or address for letter routing.
 * ANTI-ENUMERATION: always returns the same generic response regardless of
 * whether an account was found. Never reveals if identifier is registered.
 *
 * Request body:
 *   { type: "EMAIL" | "PHONE" | "ADDRESS", value: string }
 * Response (200):
 *   { message: "If an account exists, we'll route it." }
 *
 * Rate limit: 10 requests / hour per IP.
 *
 * TODO (Session 5): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

const GENERIC_RESPONSE = "If an account exists, we'll route it.";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 5): implement
  // 1. Rate-limit by IP (identifierLookupLimiter)
  // 2. Parse body, normalise identifier
  // 3. Look up UserIdentifier (respecting discoverability flag)
  // 4. Store result internally for letter routing — NEVER reveal in response
  // 5. Always return generic message
  return NextResponse.json({ message: GENERIC_RESPONSE });
}
