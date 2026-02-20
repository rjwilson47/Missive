/**
 * @file src/app/api/me/delete/route.ts
 * POST /api/me/delete
 *
 * Initiates account deletion by setting markedForDeletionAt to now (SPEC §K).
 *
 * Grace period behaviour:
 *   - Account is NOT immediately deleted.
 *   - A background job (out of MVP scope) actually deletes the account 30 days
 *     after markedForDeletionAt.
 *   - During the grace period the user can log in, view letters, and cancel deletion.
 *   - Restricted actions during grace period: send letters, pen pal matching,
 *     change username, add identifiers (enforced in those API routes).
 *
 * Idempotent: calling this endpoint when already marked for deletion returns 200
 * with the existing markedForDeletionAt timestamp (no-op re-setting).
 *
 * Authorization: session user only.
 * Response (200): { success: true, markedForDeletionAt: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser, prismaUserToAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * POST /api/me/delete handler.
 *
 * Sets markedForDeletionAt = now if not already set.
 * Idempotent — safe to call multiple times (no-op if already marked).
 *
 * @param req - Incoming request with Authorization header
 * @returns { success: true, markedForDeletionAt } (200) or 401/500
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Idempotency: already marked, return existing timestamp ────────────────
  if (me.markedForDeletionAt !== null) {
    return NextResponse.json({
      success: true,
      markedForDeletionAt: me.markedForDeletionAt,
    });
  }

  // ── Mark for deletion ─────────────────────────────────────────────────────
  try {
    const updated = await prisma.user.update({
      where: { id: me.id },
      data: { markedForDeletionAt: new Date() },
    });

    const appUser = prismaUserToAppUser(updated);

    return NextResponse.json({
      success: true,
      markedForDeletionAt: appUser.markedForDeletionAt,
    });
  } catch (err) {
    console.error("[POST /api/me/delete] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
