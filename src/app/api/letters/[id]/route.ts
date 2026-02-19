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
 * Signed URL rules (SPEC §9):
 *   - DRAFT sender: signed URLs generated (they uploaded these images)
 *   - DELIVERED recipient: signed URLs generated (they are the authorised viewer)
 *   - Sender of a DELIVERED letter: no access (no sent folder; letter is gone)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSignedUrl } from "@/lib/upload";
import type { LetterDetail, LetterImageShape } from "@/types";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const VALID_ADDRESSING_TYPES = [
  "USERNAME",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "PEN_PAL_MATCH",
] as const;

// ===== GET =====

/**
 * Fetches a full letter detail for the authorised owner or recipient.
 *
 * Access control:
 *   - DRAFT:     only the sender (senderId = me) may view
 *   - DELIVERED: only the recipient (recipientUserId = me) may view
 *   - Any other status or ownership mismatch → 404 (avoids leaking existence)
 *
 * Signed URLs are generated for images when the caller is authorised.
 * Images are returned in order_index order.
 *
 * @param req    - Incoming request (Authorization header required)
 * @param params - Route params containing the letter UUID
 * @returns LetterDetail JSON or error response
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Fetch letter with all related data ────────────────────────────────────
  const letter = await prisma.letter.findUnique({
    where: { id: params.id },
    include: {
      sender: { select: { username: true } },
      images: { orderBy: { order_index: "asc" } },
      folderEntry: { select: { folderId: true } },
    },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  // ── Authorization ─────────────────────────────────────────────────────────
  // DRAFT: only the sender may access (for preview/edit in compose flow)
  // DELIVERED: only the recipient may access (for reading)
  // Any other status (IN_TRANSIT, BLOCKED, UNDELIVERABLE): inaccessible to both parties
  const isSenderViewingDraft =
    letter.status === "DRAFT" && letter.senderId === me.id;
  const isRecipientViewingDelivered =
    letter.status === "DELIVERED" && letter.recipientUserId === me.id;

  if (!isSenderViewingDraft && !isRecipientViewingDelivered) {
    // Return 404 rather than 403 to avoid revealing that the letter exists
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  // ── Generate signed URLs for images ───────────────────────────────────────
  // Both the draft owner and the delivered recipient are authorised to view images.
  const imagesWithUrls: LetterImageShape[] = await Promise.all(
    letter.images.map(async (img) => {
      let signedUrl: string | undefined;
      let thumbnailSignedUrl: string | undefined;
      try {
        [signedUrl, thumbnailSignedUrl] = await Promise.all([
          getSignedUrl(img.storage_path),
          getSignedUrl(img.thumbnail_path),
        ]);
      } catch (err) {
        // Log but don't fail the whole request — images may still load if URLs are cached
        console.error(`[GET /api/letters/:id] Failed to sign URL for image ${img.id}:`, err);
      }
      return {
        id: img.id,
        storagePath: img.storage_path,
        thumbnailPath: img.thumbnail_path,
        mimeType: img.mimeType,
        sizeBytes: img.size_bytes,
        width: img.width,
        height: img.height,
        orderIndex: img.order_index,
        signedUrl,
        thumbnailSignedUrl,
      };
    })
  );

  // ── Build response ─────────────────────────────────────────────────────────
  const detail: LetterDetail = {
    id: letter.id,
    senderId: letter.senderId,
    senderUsername: letter.sender.username,
    senderRegionAtSend: letter.sender_region_at_send ?? "",
    senderTimezoneAtSend: letter.sender_timezone_at_send ?? "",
    contentType: letter.contentType as LetterDetail["contentType"],
    status: letter.status as LetterDetail["status"],
    sentAt: letter.sent_at?.toISOString() ?? null,
    scheduledDeliveryAt: letter.scheduled_delivery_at?.toISOString() ?? null,
    deliveredAt: letter.delivered_at?.toISOString() ?? null,
    openedAt: letter.opened_at?.toISOString() ?? null,
    createdAt: letter.created_at.toISOString(),
    typedBodyJson: (letter.typed_body_json as Record<string, unknown>) ?? null,
    fontFamily: letter.font_family ?? null,
    images: imagesWithUrls,
    folderId: letter.folderEntry?.folderId ?? null,
    inReplyToId: letter.in_reply_to ?? null,
  };

  return NextResponse.json(detail);
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
