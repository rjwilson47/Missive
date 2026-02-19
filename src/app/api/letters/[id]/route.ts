/**
 * @file src/app/api/letters/[id]/route.ts
 * GET    /api/letters/:id — fetch full letter detail (authorised recipient or draft owner)
 * PUT    /api/letters/:id — update a DRAFT letter (content, font, addressing)
 * DELETE /api/letters/:id — delete a DRAFT letter (rejected if status != DRAFT)
 *
 * Authorization:
 *   GET: session user must be the senderId (for DRAFT) or recipientUserId (for DELIVERED)
 *   PUT/DELETE: session user must be senderId AND status must be DRAFT
 *
 * TODO (Session 3): Implement PUT/DELETE.
 * TODO (Session 4): Implement GET with signed URL generation.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 4): fetch letter, verify auth, generate signed URLs for images
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function PUT(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 3): validate DRAFT status, update fields
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function DELETE(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 3): reject if status != DRAFT, then delete
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
