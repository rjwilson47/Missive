/**
 * @file src/app/api/letters/[id]/tear-open/route.ts
 * POST /api/letters/:id/tear-open
 *
 * Marks a DELIVERED letter as opened (sets opened_at = now).
 * Moves the letter from the UNOPENED system folder to the OPENED system folder.
 *
 * Authorization: session user must be the recipientUserId.
 *
 * Idempotent: if the letter is already opened, returns 200 without error.
 * The folder move is done atomically with the opened_at update in a transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * Tears open a sealed envelope: sets opened_at and moves to the OPENED system folder.
 *
 * Flow:
 *   1. Authenticate session user
 *   2. Find the DELIVERED letter where recipientUserId = me
 *   3. If already opened, return 200 immediately (idempotent)
 *   4. Look up (or create) the user's OPENED system folder
 *   5. In a transaction: set opened_at, upsert LetterFolder to OPENED folder
 *
 * @param req    - Incoming request (Authorization header required)
 * @param params - Route params containing the letter UUID
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

  // ── Fetch letter — must be DELIVERED and addressed to me ──────────────────
  const letter = await prisma.letter.findFirst({
    where: {
      id: params.id,
      recipientUserId: me.id,
      status: "DELIVERED",
    },
    select: { id: true, opened_at: true },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  // Idempotent: already opened → return success without re-processing
  if (letter.opened_at !== null) {
    return NextResponse.json({ success: true });
  }

  // ── Find recipient's OPENED system folder ──────────────────────────────────
  // System folders are created during user signup by signupUser() in lib/auth.ts.
  // If missing for any reason, create it defensively.
  let openedFolder = await prisma.folder.findFirst({
    where: { userId: me.id, system_type: "OPENED" },
    select: { id: true },
  });

  if (!openedFolder) {
    openedFolder = await prisma.folder.create({
      data: {
        userId: me.id,
        name: "Opened",
        system_type: "OPENED",
      },
      select: { id: true },
    });
  }

  // ── Atomic update: set opened_at + move to OPENED folder ──────────────────
  try {
    await prisma.$transaction([
      // Mark the letter as opened
      prisma.letter.update({
        where: { id: params.id },
        data: { opened_at: new Date() },
      }),
      // Upsert the folder entry: move from UNOPENED → OPENED
      // Uses Prisma's upsert on the unique letterId field of LetterFolder
      prisma.letterFolder.upsert({
        where: { letterId: params.id },
        create: { letterId: params.id, folderId: openedFolder.id },
        update: { folderId: openedFolder.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/letters/:id/tear-open] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
