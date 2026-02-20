/**
 * @file src/app/api/letters/[id]/report/route.ts
 * POST /api/letters/:id/report
 *
 * Creates a Report record for future admin review (SPEC §I).
 *
 * The report does NOT:
 *   - Notify the sender
 *   - Take any immediate action on the letter or the sender's account
 *   - Expose the report details to the sender
 *
 * Data stored: (reporterUserId, letterId, reason, timestamp).
 * Admin review of reports is out of scope for MVP (no admin UI required).
 *
 * Request body (optional): { reason: string }
 * Authorization: session user must be the recipientUserId of the letter.
 * Response (201): { success: true }
 *
 * Note: multiple reports for the same letter by the same user are allowed
 * (no unique constraint on (reporterUserId, letterId)) as the SPEC is silent on this.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Maximum length for the optional reason field */
const MAX_REASON_LENGTH = 1000;

/**
 * POST /api/letters/:id/report handler.
 *
 * Verifies the letter was received by the session user, then inserts a Report row.
 *
 * @param req    - Incoming request (Authorization header + optional JSON body)
 * @param params - Route params containing the letter UUID
 * @returns { success: true } (201) or error response
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

  // ── Fetch letter — must be delivered to me ────────────────────────────────
  const letter = await prisma.letter.findFirst({
    where: {
      id: params.id,
      recipientUserId: me.id,
      status: "DELIVERED",
    },
    select: { id: true },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  // ── Parse optional reason ─────────────────────────────────────────────────
  let reason: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.reason === "string" && body.reason.trim()) {
      reason = body.reason.trim().slice(0, MAX_REASON_LENGTH);
    }
  } catch {
    // Body is optional — JSON parse failure is acceptable
  }

  // ── Insert Report record ──────────────────────────────────────────────────
  try {
    await prisma.report.create({
      data: {
        reporterUserId: me.id,
        letterId: params.id,
        reason: reason,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/letters/:id/report] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
