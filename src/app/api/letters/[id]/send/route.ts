/**
 * @file src/app/api/letters/[id]/send/route.ts
 * POST /api/letters/:id/send
 *
 * Seals and sends a DRAFT letter.
 *
 * Actions:
 *   1. Verify session user is the senderId and status = DRAFT.
 *   2. Check DailyQuota for sender's local date (max 3/day). Reject with 429 if exceeded.
 *   3. Resolve recipient (if not already set on the draft).
 *   4. Compute scheduled_delivery_at via computeScheduledDelivery().
 *   5. Set status = IN_TRANSIT, sent_at = now.
 *   6. Capture sender_region_at_send, sender_timezone_at_send.
 *   7. Increment DailyQuota sent_count (upsert).
 *   8. Return 200. Letter now invisible to sender (no sent folder).
 *
 * Errors:
 *   400 — letter is not a DRAFT
 *   403 — not the sender / account marked for deletion
 *   429 — daily quota exceeded OR rate limit exceeded
 *
 * TODO (Session 2): Implement (depends on computeScheduledDelivery being complete).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 2): implement send flow
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
