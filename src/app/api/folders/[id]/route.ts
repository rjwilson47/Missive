/**
 * @file src/app/api/folders/[id]/route.ts
 * DELETE /api/folders/:id — delete a custom folder
 *
 * On delete:
 *   - Move all letters in the folder to the OPENED system folder (in a DB transaction).
 *   - Show confirmation in UI if folder has letters (client-side, before calling this).
 *   - System folders (UNOPENED, OPENED, DRAFTS) cannot be deleted.
 *
 * Authorization: session user must be the folder owner.
 *
 * TODO (Session 5): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
): Promise<NextResponse> {
  // TODO (Session 5): verify folder ownership, move letters, delete folder (transaction)
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
