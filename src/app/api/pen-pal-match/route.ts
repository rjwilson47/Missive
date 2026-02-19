/**
 * @file src/app/api/pen-pal-match/route.ts
 * POST /api/pen-pal-match
 *
 * Finds a stranger for the pen pal feature (SPEC §H).
 *
 * Matching algorithm:
 *   1. Verify requester is opted in and not marked for deletion
 *   2. Find all users previously matched with (MatchHistory table)
 *   3. Collect all eligible candidates:
 *        - availableForPenPalMatching = true
 *        - Not the requester
 *        - Not previously matched with the requester
 *   4. Filter candidates by timezone offset ±3 hours (DST-aware via Luxon)
 *   5. If requester's penPalMatchPreference = SAME_REGION: further filter by
 *      matching region string (case-insensitive)
 *   6. Random selection from remaining pool
 *   7. Create MatchHistory record (IDs sorted: userId1 < userId2) to prevent
 *      future duplicate matches
 *   8. Create a DRAFT letter pre-addressed to the matched user
 *   9. Return { draftLetterId }
 *
 * Rate limit: reuses sendLimiter (5 req/hr per user) — pen pal matching is an
 *   infrequent action, but the same per-user hourly cap is appropriate.
 *
 * Response (200): { draftLetterId: string }
 *
 * Errors:
 *   401 — unauthenticated
 *   403 — account marked for deletion (pen pal matching blocked)
 *   404 — no eligible match found in the pool
 *   409 — user not opted into pen pal matching
 *   429 — rate limited
 */

import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendLimiter } from "@/lib/ratelimit";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Pen pal timezone window: ±3 hours = ±180 minutes */
const TZ_WINDOW_MINUTES = 180;

// ===== Helpers =====

/**
 * Returns the current UTC offset for a given IANA timezone in minutes.
 * Luxon's setZone resolves DST automatically.
 *
 * @param timezone - IANA timezone string (e.g. "Australia/Melbourne")
 * @returns Signed offset in minutes (e.g. +660 for UTC+11, -300 for UTC-5)
 */
function getOffsetMinutes(timezone: string): number {
  return DateTime.now().setZone(timezone).offset;
}

// ===== Route Handler =====

/**
 * POST /api/pen-pal-match handler.
 *
 * Finds and returns a new pen pal match for the authenticated user.
 * Creates a MatchHistory record (bidirectional, sorted) and a pre-addressed draft.
 *
 * @param req - Incoming Next.js request with Authorization header
 * @returns { draftLetterId } on success or appropriate error
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Guards ────────────────────────────────────────────────────────────────
  // Account deletion guard: matching blocked if scheduled for deletion
  if (me.markedForDeletionAt !== null) {
    return NextResponse.json(
      { error: "Account scheduled for deletion. Cancel deletion in Settings to use pen pal matching." },
      { status: 403 }
    );
  }

  // Opt-in guard: user must have enabled pen pal matching in their settings
  if (!me.availableForPenPalMatching) {
    return NextResponse.json(
      { error: "You haven't opted into pen pal matching. Enable it in Settings." },
      { status: 409 }
    );
  }

  // ── Rate limiting (fail open if Upstash unavailable) ──────────────────────
  try {
    const { success } = await sendLimiter.limit(me.id);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  } catch {
    // Upstash unavailable — fail open
    console.warn("[POST /api/pen-pal-match] Rate limiter unavailable — failing open");
  }

  // ── Find previous matches ─────────────────────────────────────────────────
  // MatchHistory stores pairs as (userId1 < userId2) to prevent duplicates.
  // We must check both columns to find all matches for this user.
  const previousMatches = await prisma.matchHistory.findMany({
    where: {
      OR: [{ userId1: me.id }, { userId2: me.id }],
    },
    select: { userId1: true, userId2: true },
  });

  // Build a Set of already-matched user IDs for O(1) exclusion
  const alreadyMatchedIds = new Set<string>();
  for (const record of previousMatches) {
    alreadyMatchedIds.add(record.userId1 === me.id ? record.userId2 : record.userId1);
  }

  // ── Collect eligible candidates ───────────────────────────────────────────
  const candidates = await prisma.user.findMany({
    where: {
      availableForPenPalMatching: true,
      id: { not: me.id },
      markedForDeletionAt: null,  // don't match with accounts pending deletion
    },
    select: {
      id: true,
      username: true,
      timezone: true,
      region: true,
    },
  });

  // ── Timezone filtering ────────────────────────────────────────────────────
  const myOffset = getOffsetMinutes(me.timezone);

  let pool = candidates.filter((c) => {
    // Exclude previously matched users
    if (alreadyMatchedIds.has(c.id)) return false;

    // Timezone must be within ±3 hours
    const theirOffset = getOffsetMinutes(c.timezone);
    return Math.abs(myOffset - theirOffset) <= TZ_WINDOW_MINUTES;
  });

  // ── Region filtering (if preference = SAME_REGION) ────────────────────────
  if (me.penPalMatchPreference === "SAME_REGION") {
    const myRegion = me.region.toLowerCase().trim();
    pool = pool.filter((c) => c.region.toLowerCase().trim() === myRegion);
  }

  // ── No candidates found ───────────────────────────────────────────────────
  if (pool.length === 0) {
    return NextResponse.json(
      { error: "No pen pal matches found right now. Try again later or change your match preference." },
      { status: 404 }
    );
  }

  // ── Random selection ──────────────────────────────────────────────────────
  const match = pool[Math.floor(Math.random() * pool.length)];

  // ── Create MatchHistory + pre-addressed DRAFT (atomic transaction) ─────────
  // MatchHistory IDs are always stored sorted (userId1 < userId2) so that the
  // composite @@unique([userId1, userId2]) constraint treats (A,B) and (B,A) as the same pair.
  const [matchId1, matchId2] = [me.id, match.id].sort();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the MatchHistory record (bidirectional match prevention)
      await tx.matchHistory.create({
        data: { userId1: matchId1, userId2: matchId2 },
      });

      // Create a DRAFT pre-addressed to the matched user
      const draft = await tx.letter.create({
        data: {
          senderId: me.id,
          recipientUserId: match.id,
          addressingInputType: "PEN_PAL_MATCH",
          addressingInputValue: match.username,
          contentType: "TYPED",
          status: "DRAFT",
        },
        select: { id: true },
      });

      return draft;
    });

    return NextResponse.json({ draftLetterId: result.id });
  } catch (err) {
    console.error("[POST /api/pen-pal-match] Transaction error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
