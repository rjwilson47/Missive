/**
 * @file src/app/api/letters/[id]/send/route.ts
 * POST /api/letters/:id/send
 *
 * Seals and sends a DRAFT letter.
 *
 * Steps:
 *   1. Validate session user via Supabase JWT.
 *   2. Rate-limit by user ID (5 req/hr; fail open if Redis unavailable).
 *   3. Reject if account is marked for deletion.
 *   4. Load the letter; verify current user is the sender and status = DRAFT.
 *   5. Check DailyQuota for sender's local date (max 3/day in sender's TZ).
 *   6. Resolve recipient timezone (from recipient record if set, else "UTC").
 *   7. Compute scheduled_delivery_at via computeScheduledDelivery().
 *   8. In a single DB transaction:
 *      - Update letter to IN_TRANSIT, capture send metadata.
 *      - Upsert DailyQuota (increment sent_count or create with sent_count = 1).
 *   9. Return 200 { success: true }.
 *
 * Errors:
 *   400 — letter is not a DRAFT or invalid body
 *   401 — missing or invalid auth token
 *   403 — not the sender, or account marked for deletion
 *   429 — daily quota exceeded OR rate limit exceeded
 *   404 — letter not found
 *   500 — unexpected server error
 */

import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { computeScheduledDelivery } from "@/lib/delivery";
import { sendLimiter } from "@/lib/ratelimit";

/** Maximum number of letters a user may send per calendar day (in their TZ) */
const DAILY_SEND_LIMIT = 3;

/** Shared response objects */
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const TOO_MANY_REQUESTS = NextResponse.json(
  { error: "Too many requests. Please try again later." },
  { status: 429 }
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // ===== 1. Validate Supabase JWT =====
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) {
    return UNAUTHORIZED;
  }

  const currentUser = await getAppUser(supabaseUser.id);
  if (!currentUser) {
    console.error(`[send] No app User found for supabase_user_id: ${supabaseUser.id}`);
    return UNAUTHORIZED;
  }

  // ===== 2. Rate-limit by user ID (fail open if Redis unavailable) =====
  try {
    const { success } = await sendLimiter.limit(currentUser.id);
    if (!success) {
      return TOO_MANY_REQUESTS;
    }
  } catch (err) {
    // Redis unavailable — fail open; daily quota check below still protects us
    console.warn("[send] Rate-limit check failed (Redis unavailable?), failing open:", err);
  }

  // ===== 3. Reject if account is marked for deletion =====
  if (currentUser.markedForDeletionAt !== null) {
    return NextResponse.json(
      {
        error:
          "Account scheduled for deletion. Cancel deletion in Settings to send letters.",
      },
      { status: 403 }
    );
  }

  // ===== 4. Load letter and verify ownership + status =====
  const letterId = params.id;

  let letter: {
    id: string;
    senderId: string;
    recipientUserId: string | null;
    addressingInputType: string | null;
    addressingInputValue: string | null;
    status: string;
  } | null;

  try {
    letter = await prisma.letter.findUnique({
      where: { id: letterId },
      select: {
        id: true,
        senderId: true,
        recipientUserId: true,
        addressingInputType: true,
        addressingInputValue: true,
        status: true,
      },
    });
  } catch (err) {
    console.error("[send] DB error fetching letter:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!letter) {
    return NextResponse.json({ error: "Letter not found" }, { status: 404 });
  }

  // Verify the caller is the sender (never trust URL params for ownership)
  if (letter.senderId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only DRAFT letters can be sent
  if (letter.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Letter has already been sent or is not a draft." },
      { status: 400 }
    );
  }

  // ===== 5. Check DailyQuota for sender's local date =====
  // Quota resets at midnight in the sender's current timezone.
  const senderTz = currentUser.timezone;
  const senderLocalDate = DateTime.now().setZone(senderTz).toFormat("yyyy-MM-dd");

  let quotaRecord: { sentCount: number } | null;
  try {
    quotaRecord = await prisma.dailyQuota.findUnique({
      where: {
        userId_date: {
          userId: currentUser.id,
          date: senderLocalDate,
        },
      },
      select: { sentCount: true },
    });
  } catch (err) {
    console.error("[send] DB error fetching quota:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (quotaRecord && quotaRecord.sentCount >= DAILY_SEND_LIMIT) {
    return NextResponse.json(
      { error: "You've sent 3 letters today. Try again tomorrow." },
      { status: 429 }
    );
  }

  // ===== 6. Resolve recipient timezone =====
  // Used for computing the scheduled delivery window (24 business hours + next 4 PM
  // in the RECEIVER's timezone). If the recipient is not yet resolved (null), fall
  // back to UTC; the cron job will recompute scheduled_delivery_at when it resolves
  // the recipient.
  let recipientTimezone = "UTC";
  if (letter.recipientUserId) {
    try {
      const recipient = await prisma.user.findUnique({
        where: { id: letter.recipientUserId },
        select: { timezone: true },
      });
      if (recipient?.timezone) {
        recipientTimezone = recipient.timezone;
      }
    } catch (err) {
      // Non-fatal — fall back to UTC; cron will correct it on re-routing
      console.warn("[send] Could not fetch recipient timezone, falling back to UTC:", err);
    }
  }

  // ===== 7. Compute scheduled delivery =====
  const now = new Date();
  const { scheduledDeliveryUtc } = computeScheduledDelivery(now, recipientTimezone);

  // ===== 8. Update letter + upsert DailyQuota in a single transaction =====
  try {
    await prisma.$transaction([
      // Transition letter to IN_TRANSIT, capturing send-time metadata
      prisma.letter.update({
        where: { id: letterId },
        data: {
          status: "IN_TRANSIT",
          sentAt: now,
          scheduledDeliveryAt: scheduledDeliveryUtc,
          // Capture sender context at the moment of sending (immutable record)
          senderRegionAtSend: currentUser.region,
          senderTimezoneAtSend: senderTz,
        },
      }),

      // Upsert DailyQuota: increment existing record or create a new one
      prisma.dailyQuota.upsert({
        where: {
          userId_date: {
            userId: currentUser.id,
            date: senderLocalDate,
          },
        },
        update: { sentCount: { increment: 1 } },
        create: {
          userId: currentUser.id,
          date: senderLocalDate,
          sentCount: 1,
        },
      }),
    ]);
  } catch (err) {
    console.error("[send] Transaction failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // Letter is now IN_TRANSIT and invisible to the sender (no sent folder).
  return NextResponse.json({ success: true });
}
