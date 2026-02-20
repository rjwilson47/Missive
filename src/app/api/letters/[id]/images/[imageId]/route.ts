/**
 * @file src/app/api/letters/[id]/images/[imageId]/route.ts
 * DELETE /api/letters/:id/images/:imageId
 *
 * Removes a handwritten image from a DRAFT letter.
 * Deletes both Supabase Storage objects (full-res + thumbnail) and the
 * LetterImage DB row.
 *
 * Authorization: caller must be the draft's sender (senderId = me) and
 *                the letter must be in DRAFT status.
 *
 * Errors:
 *   401 — not authenticated
 *   404 — image not found, not part of this letter, or letter not owned by caller
 *   422 — letter is not a DRAFT (can only remove images from drafts)
 *   500 — server error
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader, supabaseAdmin } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; imageId: string } }
): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  const { id: letterId, imageId } = params;

  // ── Verify image exists, belongs to this letter, and letter is owned by caller ──
  const image = await prisma.letterImage.findFirst({
    where: {
      id: imageId,
      letterId,
      letter: { senderId: me.id },
    },
    select: {
      storage_path: true,
      thumbnail_path: true,
      letter: { select: { status: true } },
    },
  });

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  // ── DRAFT guard ───────────────────────────────────────────────────────────
  if (image.letter.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot remove images from a letter that is not a draft." },
      { status: 422 }
    );
  }

  // ── Delete from Supabase Storage (best-effort; log but don't block) ───────
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "letters-images";
  const { error: storageError } = await supabaseAdmin.storage
    .from(bucket)
    .remove([image.storage_path, image.thumbnail_path]);

  if (storageError) {
    console.error(
      `[DELETE /api/letters/${letterId}/images/${imageId}] Storage delete failed:`,
      storageError.message
    );
    // Continue — the DB row should still be removed so the image won't be served
  }

  // ── Delete DB row ─────────────────────────────────────────────────────────
  try {
    await prisma.letterImage.delete({ where: { id: imageId } });
  } catch (err) {
    console.error(
      `[DELETE /api/letters/${letterId}/images/${imageId}] DB delete failed:`,
      err
    );
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
