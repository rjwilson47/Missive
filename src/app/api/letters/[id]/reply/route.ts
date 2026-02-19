/**
 * @file src/app/api/letters/[id]/reply/route.ts
 * POST /api/letters/:id/reply
 *
 * Creates a new DRAFT letter pre-addressed to the original sender.
 * The reply does NOT quote the original letter body (like traditional mail — you
 * just know you're replying).
 *
 * Metadata stored:
 *   - in_reply_to = original letter ID (for future v2 threading UI)
 *   - recipientUserId = original sender's user ID
 *   - addressingInputType = USERNAME
 *   - addressingInputValue = original sender's username
 *
 * Authorization: session user must be the recipientUserId of the original letter.
 * Constraint: letter must be DELIVERED.
 * Account deletion guard: replies are blocked if the replier's account is scheduled for deletion.
 *
 * Response (201): { draftLetterId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * Creates a reply DRAFT pre-addressed to the original letter's sender.
 *
 * @param req    - Incoming request (Authorization header required)
 * @param params - Route params containing the original letter UUID
 * @returns { draftLetterId } on success (201) or error response
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

  // Account deletion guard: scheduled-for-deletion accounts cannot send
  if (me.markedForDeletionAt !== null) {
    return NextResponse.json(
      { error: "Account scheduled for deletion. Cancel deletion in Settings to send letters." },
      { status: 403 }
    );
  }

  // ── Fetch original letter — must be delivered to me ────────────────────────
  const original = await prisma.letter.findFirst({
    where: {
      id: params.id,
      recipientUserId: me.id,
      status: "DELIVERED",
    },
    include: {
      sender: { select: { id: true, username: true } },
    },
  });

  if (!original) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  // ── Create reply DRAFT ─────────────────────────────────────────────────────
  // Pre-addressed to the original sender; body is empty (user will write it).
  try {
    const draft = await prisma.letter.create({
      data: {
        senderId: me.id,
        recipientUserId: original.sender.id,
        addressingInputType: "USERNAME",
        addressingInputValue: original.sender.username,
        in_reply_to: original.id,
        contentType: "TYPED",
        status: "DRAFT",
      },
      select: { id: true },
    });

    return NextResponse.json({ draftLetterId: draft.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/letters/:id/reply] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
