/**
 * @file src/app/api/me/cancel-delete/route.ts
 * POST /api/me/cancel-delete
 *
 * Cancels a pending account deletion by clearing markedForDeletionAt (SPEC §K).
 *
 * After cancellation:
 *   - The account is fully restored to normal (all restrictions lifted).
 *   - The user can send letters, change username, add identifiers, etc.
 *   - All existing letters and data are preserved.
 *
 * Idempotent: calling this when markedForDeletionAt is already null is a no-op (200).
 *
 * Authorization: session user only.
 * Response (200): { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * POST /api/me/cancel-delete handler.
 *
 * Clears markedForDeletionAt, restoring the account to full active status.
 * Safe to call even if the account is not currently marked for deletion.
 *
 * @param req - Incoming request with Authorization header
 * @returns { success: true } (200) or 401/500
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Idempotency: not marked, nothing to do ────────────────────────────────
  if (me.markedForDeletionAt === null) {
    return NextResponse.json({ success: true });
  }

  // ── Clear the deletion mark ───────────────────────────────────────────────
  try {
    await prisma.user.update({
      where: { id: me.id },
      data: { markedForDeletionAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/me/cancel-delete] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
