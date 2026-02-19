/**
 * @file src/app/api/letters/[id]/report/route.ts
 * POST /api/letters/:id/report
 *
 * Creates a Report record for admin review.
 * Does not notify the sender or take immediate action.
 *
 * Request body (optional): { reason: string }
 * Authorization: session user must be the recipientUserId.
 *
 * TODO (Session 5): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 5): insert Report record
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
