/**
 * @file src/app/api/letters/[id]/block-sender/route.ts
 * POST /api/letters/:id/block-sender
 *
 * Adds the letter's sender to the current user's BlockList (SPEC §I).
 *
 * Effect:
 *   - Future letters from the blocked sender are silently marked BLOCKED by
 *     the cron job when they would otherwise be delivered.
 *   - The blocked sender is NEVER notified (privacy for the blocker).
 *   - Existing letters from the sender are NOT affected.
 *
 * Idempotent: calling this endpoint again when already blocked is a no-op (200).
 *
 * Authorization: session user must be the recipientUserId of the given letter.
 * Response (200): { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * POST /api/letters/:id/block-sender handler.
 *
 * Upserts a BlockList record: (blockerUserId = me, blockedUserId = letter.senderId).
 * The upsert prevents duplicates if the user tries to block the same sender twice.
 *
 * @param req    - Incoming request with Authorization header
 * @param params - Route params containing the letter UUID
 * @returns { success: true } or error response
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Fetch letter — must be delivered to me ────────────────────────────────
  const letter = await prisma.letter.findFirst({
    where: {
      id: params.id,
      recipientUserId: me.id,
      status: "DELIVERED",
    },
    select: { senderId: true },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  // Sanity: prevent self-block (shouldn't occur in normal use)
  if (letter.senderId === me.id) {
    return NextResponse.json({ error: "Cannot block yourself." }, { status: 422 });
  }

  // ── Upsert BlockList record ───────────────────────────────────────────────
  // The @@unique([blockerUserId, blockedUserId]) constraint means this is safe
  // to call multiple times — the try/catch handles the race-condition edge case.
  try {
    await prisma.blockList.upsert({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: me.id,
          blockedUserId: letter.senderId,
        },
      },
      create: {
        blockerUserId: me.id,
        blockedUserId: letter.senderId,
      },
      update: {}, // Already blocked — no-op update
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/letters/:id/block-sender] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
