/**
 * @file src/app/api/letters/route.ts
 * GET  /api/letters — list letters in a mailbox folder
 * POST /api/letters — create a new draft letter
 *
 * GET query params:
 *   folder: "UNOPENED" | "OPENED" | "DRAFTS" | <custom-folder-id>
 *
 * GET response (200): LetterSummary[]
 *   - For DRAFTS: returns letters where senderId = me AND status = DRAFT
 *   - For UNOPENED/OPENED: returns DELIVERED letters where recipientUserId = me
 *   - NEVER returns IN_TRANSIT letters to the sender (no sent folder)
 *
 * POST body:
 *   { contentType: ContentType, addressingInputType?: AddressingInputType,
 *     addressingInputValue?: string, recipientUserId?: string }
 * POST response (201): { id: string } — the new draft's ID
 *
 * TODO (Session 3): Implement GET.
 * TODO (Session 3): Implement POST (create draft).
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 3): implement
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 3): implement
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
