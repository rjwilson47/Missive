/**
 * @file src/app/api/auth/signup/route.ts
 * POST /api/auth/signup
 *
 * Creates a new Missive user account.
 *
 * Request body:
 *   {
 *     username: string,    // 3-20 chars, starts with letter, lowercase/digits/underscores/hyphens
 *     password: string,    // min 8 chars
 *     region:   string,    // freeform, e.g. "Victoria, AU"
 *     timezone: string     // IANA timezone, e.g. "Australia/Melbourne"
 *   }
 *
 * Response (201):
 *   { user: AppUser, accessToken: string }
 *
 * Errors:
 *   400 — validation failures (bad username format, invalid timezone, weak password)
 *   409 — username already taken
 *   429 — rate limited (5 req / 15 min per IP)
 *   500 — unexpected server error
 */

import { NextRequest, NextResponse } from "next/server";
import { signupUser } from "@/lib/auth";
import { authLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ===== 1. Rate limiting =====
  // Must happen before any DB query to protect against account creation abuse
  let rateLimitPassed = true;
  try {
    const ip = getClientIp(req);
    const result = await authLimiter.limit(ip);
    rateLimitPassed = result.success;
  } catch (err) {
    // Upstash unavailable — fail open so legitimate users aren't blocked
    console.error("[signup] Rate limiter unavailable:", err);
  }

  if (!rateLimitPassed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // ===== 2. Parse request body =====
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username, password, region, timezone } = body as Record<string, unknown>;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof region !== "string" ||
    typeof timezone !== "string"
  ) {
    return NextResponse.json(
      { error: "username, password, region, and timezone are required." },
      { status: 400 }
    );
  }

  // ===== 3. Create the account =====
  // signupUser() handles all validation, Supabase auth steps, DB insert, and rollback
  try {
    const result = await signupUser({ username, password, region, timezone });

    return NextResponse.json(
      { user: result.user, accessToken: result.accessToken },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create account.";

    // Username conflict (P2002 unique violation caught in signupUser) — 409
    if (message.toLowerCase().includes("already taken")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    // Known client-side validation errors thrown by signupUser — 400
    const isValidationError =
      message.includes("Username") ||
      message.includes("username") ||
      message.includes("Password") ||
      message.includes("password") ||
      message.includes("timezone") ||
      message.includes("Region") ||
      message.includes("region") ||
      message.includes("Account created"); // auto-login failed; account exists; user can log in

    if (isValidationError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Unexpected error — log full details server-side, return generic message to client
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
