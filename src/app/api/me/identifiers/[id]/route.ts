/**
 * @file src/app/api/me/identifiers/[id]/route.ts
 * DELETE /api/me/identifiers/:id
 *
 * Removes a UserIdentifier from the session user's account.
 *
 * Ownership is strictly enforced: the identifier must belong to the session
 * user (prevents removing another user's identifier via a known UUID).
 *
 * Removing an identifier means the user can no longer be routed via that
 * email, phone, or address. Existing IN_TRANSIT letters addressed via that
 * identifier are NOT affected (they have already been routed or will fail
 * to route and eventually become UNDELIVERABLE).
 *
 * Authorization: session user must own the identifier.
 * Response (200): { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * DELETE /api/me/identifiers/:id handler.
 *
 * Verifies the identifier exists and belongs to the session user,
 * then deletes it. Returns 404 if not found or not owned by session user.
 *
 * @param req    - Incoming request with Authorization header
 * @param params - Route params containing the identifier UUID
 * @returns { success: true } (200) or error response
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

  // ── Verify ownership ──────────────────────────────────────────────────────
  // Always scope by userId so a user can't delete another user's identifier
  const identifier = await prisma.userIdentifier.findFirst({
    where: { id: params.id, userId: me.id },
    select: { id: true },
  });

  if (!identifier) {
    return NextResponse.json({ error: "Identifier not found." }, { status: 404 });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  try {
    await prisma.userIdentifier.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/me/identifiers/:id] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
