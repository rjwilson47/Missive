/**
 * @file src/app/api/letters/[id]/block-sender/route.ts
 * POST /api/letters/:id/block-sender
 *
 * Adds the letter's sender to the current user's BlockList.
 * Future letters from that sender will be silently marked BLOCKED by the cron job.
 * The blocked sender is never notified.
 *
 * Authorization: session user must be the recipientUserId.
 *
 * TODO (Session 5): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 5): upsert BlockList record (blockerUserId, blockedUserId)
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
