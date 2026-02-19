/**
 * @file src/app/api/letters/[id]/reply/route.ts
 * POST /api/letters/:id/reply
 *
 * Creates a new DRAFT letter pre-addressed to the original sender.
 * Sets in_reply_to = original letter ID for future threading (v2).
 * Does NOT quote the original letter body.
 *
 * Authorization: session user must be the recipientUserId of the original letter.
 * Constraint: letter must be DELIVERED (can only reply to received letters).
 *
 * Response (201): { draftLetterId: string }
 *
 * TODO (Session 4): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 4): create new draft pre-addressed to original sender
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
