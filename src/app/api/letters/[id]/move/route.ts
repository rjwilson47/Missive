/**
 * @file src/app/api/letters/[id]/move/route.ts
 * POST /api/letters/:id/move
 *
 * Moves an opened letter to a different folder (SPEC §F).
 *
 * Constraints:
 *   - The letter must be DELIVERED with opened_at set (only opened letters can be filed).
 *   - The target folder must belong to the session user (prevents moving to another user's folders).
 *   - The target can be a custom folder OR the OPENED system folder (to "un-file" a letter).
 *   - The UNOPENED and DRAFTS system folders are rejected as targets.
 *
 * The LetterFolder record is upserted: if no folder entry exists, one is created;
 * if one exists already, it is updated to point to the new folder.
 *
 * Request body: { folderId: string }
 * Authorization: session user must be the recipientUserId.
 * Response (200): { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * POST /api/letters/:id/move handler.
 *
 * Validates ownership and folder eligibility, then upserts the LetterFolder row.
 *
 * @param req    - Incoming request (Authorization header + JSON body { folderId })
 * @param params - Route params containing the letter UUID
 * @returns { success: true } or error response
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { folderId } = (body ?? {}) as Record<string, unknown>;

  if (typeof folderId !== "string" || folderId.trim() === "") {
    return NextResponse.json({ error: "folderId is required." }, { status: 400 });
  }

  // ── Verify letter — must be opened and addressed to me ────────────────────
  const letter = await prisma.letter.findFirst({
    where: {
      id: params.id,
      recipientUserId: me.id,
      status: "DELIVERED",
      // Only opened letters can be moved (opened_at must be set)
      NOT: { opened_at: null },
    },
    select: { id: true },
  });

  if (!letter) {
    return NextResponse.json(
      { error: "Letter not found or not yet opened." },
      { status: 404 }
    );
  }

  // ── Verify target folder belongs to me ────────────────────────────────────
  const targetFolder = await prisma.folder.findFirst({
    where: { id: folderId, userId: me.id },
    select: { id: true, system_type: true },
  });

  if (!targetFolder) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  // UNOPENED and DRAFTS are not valid filing destinations
  if (targetFolder.system_type === "UNOPENED" || targetFolder.system_type === "DRAFTS") {
    return NextResponse.json(
      { error: "Letters can only be moved to custom folders or the Opened system folder." },
      { status: 422 }
    );
  }

  // ── Upsert LetterFolder ───────────────────────────────────────────────────
  try {
    await prisma.letterFolder.upsert({
      where: { letterId: params.id },
      create: { letterId: params.id, folderId: folderId },
      update: { folderId: folderId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/letters/:id/move] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
