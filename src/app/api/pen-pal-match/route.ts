/**
 * @file src/app/api/pen-pal-match/route.ts
 * POST /api/pen-pal-match
 *
 * Finds a stranger for the pen pal feature.
 * Matching algorithm:
 *   - Exclude users the requester has already matched with (MatchHistory)
 *   - Match by timezone offset ±3 hours
 *   - Filter by penPalMatchPreference (SAME_REGION | ANYWHERE)
 *   - Random selection from pool
 *   - Insert MatchHistory record (sorted userId1 < userId2)
 *   - Create a DRAFT letter pre-addressed to the match
 *
 * Response (200): { draftLetterId: string }
 *
 * Errors:
 *   403 — account marked for deletion (cannot use pen pal matching)
 *   404 — no eligible match found
 *   409 — user not opted into pen pal matching
 *
 * TODO (Session 5): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 5): implement
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
