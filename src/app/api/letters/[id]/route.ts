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
 * TODO (Session 4): Implement GET with signed URL generation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const VALID_ADDRESSING_TYPES = [
  "USERNAME",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "PEN_PAL_MATCH",
] as const;

// ===== GET =====

export async function GET(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 4): fetch letter, verify auth, generate signed URLs for images
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

// ===== PUT =====

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // Verify letter exists, belongs to me, and is a DRAFT
  const letter = await prisma.letter.findFirst({
    where: { id: params.id, senderId: me.id },
    select: { id: true, status: true },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  if (letter.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT letters can be edited." },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    typedBodyJson,
    fontFamily,
    addressingInputType,
    addressingInputValue,
    recipientUserId,
  } = body as Record<string, unknown>;

  // Validate addressingInputType if provided
  if (
    addressingInputType !== undefined &&
    addressingInputType !== null &&
    (typeof addressingInputType !== "string" ||
      !VALID_ADDRESSING_TYPES.includes(
        addressingInputType as (typeof VALID_ADDRESSING_TYPES)[number]
      ))
  ) {
    return NextResponse.json({ error: "Invalid addressingInputType." }, { status: 400 });
  }

  // Build update payload — only include fields that were provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (typedBodyJson !== undefined) {
    // Accept null (clear body) or an object (ProseMirror JSON)
    if (typedBodyJson !== null && typeof typedBodyJson !== "object") {
      return NextResponse.json({ error: "typedBodyJson must be an object or null." }, { status: 400 });
    }
    data.typed_body_json = typedBodyJson ?? null;
  }

  if (fontFamily !== undefined) {
    data.font_family = typeof fontFamily === "string" ? fontFamily : null;
  }

  if (addressingInputType !== undefined) {
    data.addressingInputType =
      addressingInputType != null
        ? (addressingInputType as (typeof VALID_ADDRESSING_TYPES)[number])
        : null;
  }

  if (addressingInputValue !== undefined) {
    data.addressingInputValue =
      typeof addressingInputValue === "string" ? addressingInputValue : null;
  }

  if (recipientUserId !== undefined) {
    data.recipientUserId =
      typeof recipientUserId === "string" ? recipientUserId : null;
  }

  try {
    await prisma.letter.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/letters/:id] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// ===== DELETE =====

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // Verify letter exists and belongs to me
  const letter = await prisma.letter.findFirst({
    where: { id: params.id, senderId: me.id },
    select: { id: true, status: true },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  if (letter.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT letters can be deleted." },
      { status: 409 }
    );
  }

  try {
    await prisma.letter.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/letters/:id] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
