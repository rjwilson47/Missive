/**
 * @file src/app/api/cron/deliver/route.ts
 * POST /api/cron/deliver
 *
 * Delivery processor — runs every 5 minutes via Vercel Cron.
 * Protected by Authorization: Bearer <CRON_SECRET> header.
 *
 * Steps (in order):
 *   1. Authenticate request (verify Authorization header matches CRON_SECRET).
 *   2. Mark unroutable letters as UNDELIVERABLE (IN_TRANSIT, recipientUserId=null, sent >3 days ago).
 *   3. Attempt to resolve still-unroutable letters (re-check UserIdentifiers).
 *   4. Find all IN_TRANSIT letters with scheduled_delivery_at <= now.
 *   5. For each:
 *      a. Check if sender is blocked by recipient → mark BLOCKED, skip.
 *      b. Mark DELIVERED, set delivered_at = now.
 *      c. Assign to recipient's UNOPENED folder (upsert LetterFolder).
 *   6. Handle errors per-letter (log + continue; retry next cron run).
 *
 * Response (200): { delivered: number, blocked: number, undeliverable: number }
 *
 * TODO (Session 2): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth check (must be first, before any DB access) ---
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO (Session 2): implement delivery processor
  return NextResponse.json({ delivered: 0, blocked: 0, undeliverable: 0 });
}
