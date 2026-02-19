/**
 * @file src/app/api/auth/login/route.ts
 * POST /api/auth/login
 *
 * Authenticates a user with username + password.
 *
 * Request body:
 *   { username: string, password: string }
 *
 * Response (200):
 *   { user: AppUser, accessToken: string }
 *
 * Errors:
 *   400 — malformed request body
 *   401 — invalid credentials (always generic — never reveal whether username exists)
 *   429 — rate limited (5 req / 15 min per IP)
 */

import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { authLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ===== 1. Rate limiting =====
  // Critical: prevent password brute-force attacks
  let rateLimitPassed = true;
  try {
    const ip = getClientIp(req);
    const result = await authLimiter.limit(ip);
    rateLimitPassed = result.success;
  } catch (err) {
    // Fail open — Upstash down shouldn't lock out legitimate users
    console.error("[login] Rate limiter unavailable:", err);
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

  const { username, password } = body as Record<string, unknown>;

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "username and password are required." },
      { status: 400 }
    );
  }

  // ===== 3. Authenticate =====
  // loginUser() always throws "Invalid username or password." for any failure —
  // never leaks whether the username exists (anti-enumeration)
  try {
    const result = await loginUser({ username, password });

    return NextResponse.json(
      { user: result.user, accessToken: result.accessToken },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid username or password.";

    // All auth failures → 401 with generic message
    // Never surface the real error (could leak username existence)
    console.error("[login] Auth failure for username:", username, "—", message);
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }
}
