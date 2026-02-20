/**
 * @file src/app/api/auth/forgot-password/route.ts
 * POST /api/auth/forgot-password
 *
 * Initiates a password reset email for a user who has set a recovery email.
 * Callers are never told definitively whether a username exists (anti-enumeration),
 * EXCEPT when the account is found but has no recovery email — per SPEC §2-A this
 * message is shown explicitly so users know to set one in Settings.
 *
 * Request body:
 *   { username: string }
 *
 * Responses:
 *   200 { status: "sent" }              — email sent, or username not found (looks the same)
 *   200 { status: "no_recovery_email" } — account exists but no recovery_email set
 *   400                                 — missing/invalid username
 *   429                                 — rate limited (same window as login/signup)
 *   500                                 — server error
 *
 * SECURITY:
 *   "sent" is returned whether or not the username exists.
 *   Rate-limited via authLimiter (5 req / 15 min per IP).
 *   Fail-open on Redis failure (allow request through).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { normaliseUsername } from "@/lib/auth";
import { authLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  try {
    const ip = getClientIp(req);
    const { success } = await authLimiter.limit(`forgot:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  } catch {
    // Fail-open: if Redis unavailable, allow the request
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawUsername = body.username;
  if (typeof rawUsername !== "string" || rawUsername.trim() === "") {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const username = normaliseUsername(rawUsername);

  // ── Look up user ───────────────────────────────────────────────────────────
  let dbUser: { supabase_user_id: string; recovery_email: string | null } | null;
  try {
    dbUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { supabase_user_id: true, recovery_email: true },
    });
  } catch (err) {
    console.error("[forgot-password] DB error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  // Username not found — return generic "sent" to prevent enumeration
  if (!dbUser) {
    return NextResponse.json({ status: "sent" });
  }

  // Account found but no recovery email — SPEC §2-A requires this specific message.
  // This intentionally reveals the account exists; it is explicitly required by spec.
  if (!dbUser.recovery_email) {
    return NextResponse.json({ status: "no_recovery_email" });
  }

  // ── Trigger Supabase password reset ────────────────────────────────────────
  // Sends a reset email to the recovery_email address stored in the app DB.
  // Supabase must have this email on the auth.users record (ensured by FIX-9).
  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      dbUser.recovery_email
      // redirectTo omitted — uses Supabase project's default Site URL setting
    );
    if (error) {
      console.error("[forgot-password] Supabase reset error:", error.message);
      // Don't reveal the error to the client; return generic success
    }
  } catch (err) {
    console.error("[forgot-password] Unexpected Supabase error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  return NextResponse.json({ status: "sent" });
}
