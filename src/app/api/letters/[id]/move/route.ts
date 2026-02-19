/**
 * @file src/app/api/letters/[id]/move/route.ts
 * POST /api/letters/:id/move
 *
 * Moves an opened letter into a custom folder (or back to OPENED system folder).
 * Only opened letters can be moved (status = DELIVERED, opened_at IS NOT NULL).
 *
 * Request body: { folderId: string }
 * Authorization: session user must be the recipientUserId.
 *
 * TODO (Session 5): Implement — upsert LetterFolder record.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 5): verify letter is opened, verify folder belongs to user, upsert LetterFolder
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
