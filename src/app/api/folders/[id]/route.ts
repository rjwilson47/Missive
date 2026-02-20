/**
 * @file src/app/api/folders/[id]/route.ts
 * DELETE /api/folders/:id — delete a custom folder
 *
 * On delete (SPEC §F folder deletion implementation):
 *   1. Verify the folder belongs to the session user
 *   2. Reject if it is a system folder (UNOPENED, OPENED, DRAFTS)
 *   3. Move all LetterFolder entries from this folder to the OPENED system folder
 *   4. Delete the custom folder
 *   Steps 3 and 4 are executed in a single DB transaction for atomicity.
 *
 * The client should confirm before calling if the folder has letters
 * (use GET /api/folders to get letterCount).
 *
 * Authorization: session user must be the folder owner.
 * Response (200): { success: true, movedLetterCount: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * Deletes a custom folder and moves its letters to the OPENED system folder.
 *
 * Flow:
 *   1. Authenticate session user
 *   2. Find the folder (must be owned by me, must not be a system folder)
 *   3. Find (or create defensively) the user's OPENED system folder
 *   4. Transaction: update all LetterFolder rows + delete custom folder
 *
 * @param req    - Incoming request with Authorization header
 * @param params - Route params containing the folder UUID
 * @returns { success: true, movedLetterCount } or error response
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Fetch folder ──────────────────────────────────────────────────────────
  const folder = await prisma.folder.findFirst({
    where: { id: params.id, userId: me.id },
    select: { id: true, system_type: true, name: true },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  // System folders cannot be deleted
  if (folder.system_type !== null) {
    return NextResponse.json(
      { error: `System folder "${folder.name}" cannot be deleted.` },
      { status: 422 }
    );
  }

  // ── Find the OPENED system folder ─────────────────────────────────────────
  // Letters in the deleted folder are moved here (standard Prisma cascade-
  // resistant approach — we redirect before deleting the parent folder).
  let openedFolder = await prisma.folder.findFirst({
    where: { userId: me.id, system_type: "OPENED" },
    select: { id: true },
  });

  if (!openedFolder) {
    // Defensive creation — should always exist after signup
    openedFolder = await prisma.folder.create({
      data: { userId: me.id, name: "Opened", system_type: "OPENED" },
      select: { id: true },
    });
  }

  // ── Count letters to be moved (for the response) ──────────────────────────
  const letterCount = await prisma.letterFolder.count({
    where: { folderId: params.id },
  });

  // ── Atomic transaction: move letters + delete folder ──────────────────────
  try {
    await prisma.$transaction([
      // Move all letters from the custom folder to the OPENED system folder
      prisma.letterFolder.updateMany({
        where: { folderId: params.id },
        data: { folderId: openedFolder.id },
      }),
      // Delete the now-empty custom folder
      prisma.folder.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({ success: true, movedLetterCount: letterCount });
  } catch (err) {
    console.error("[DELETE /api/folders/:id] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
