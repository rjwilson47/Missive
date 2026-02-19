/**
 * @file src/app/api/letters/[id]/tear-open/route.ts
 * POST /api/letters/:id/tear-open
 *
 * Marks a DELIVERED letter as opened.
 * Sets opened_at = now and moves letter to the OPENED system folder.
 *
 * Authorization: session user must be the recipientUserId.
 *
 * TODO (Session 4): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 4): set opened_at, move to OPENED folder
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
