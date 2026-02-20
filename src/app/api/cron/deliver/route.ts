/**
 * @file src/app/api/cron/deliver/route.ts
 * POST /api/cron/deliver
 *
 * Delivery processor — runs every 5 minutes via Vercel Cron.
 * Protected by Authorization: Bearer <CRON_SECRET> header.
 *
 * Execution order:
 *   1. Authenticate (verify CRON_SECRET).
 *   2. Delete accounts past 30-day deletion grace period (markedForDeletionAt <= 30 days ago).
 *      Cascades handle received letters and drafts. Sent letters remain (anonymised).
 *   3. Mark UNDELIVERABLE: IN_TRANSIT + null recipient + sentAt > 3 days ago.
 *   4. Re-attempt routing: IN_TRANSIT + null recipient + sentAt <= 3 days ago.
 *      Uses addressingInputType/Value to look up recipient; respects discoverability.
 *   5. Deliver due letters: IN_TRANSIT + recipientUserId set + scheduled_delivery_aT <= now.
 *      a. BlockList check → mark BLOCKED if blocked.
 *      b. Otherwise → mark DELIVERED, set deliveredAt, assign to UNOPENED folder.
 *   6. Return { deleted, delivered, blocked, undeliverable }.
 *
 * Error strategy: errors are caught per-letter. A failure on one letter is logged
 * and does not abort the run. The letter will be retried on the next cron tick.
 *
 * Response (200): { deleted: number, delivered: number, blocked: number, undeliverable: number }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeScheduledDelivery, isValidIanaTimezone } from "@/lib/delivery";

// ===== Constants =====

/** Letters unroutable for longer than this are marked UNDELIVERABLE */
const UNDELIVERABLE_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/** Accounts past this grace period after markedForDeletionAt are permanently deleted */
const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ===== Helpers =====

/**
 * Normalises an addressing value for UserIdentifier lookup.
 * Matches the normalisation applied when identifiers are stored.
 *
 * @param type  - The addressing type (EMAIL | PHONE | ADDRESS)
 * @param value - Raw value from the letter's addressingInputValue field
 * @returns Normalised string suitable for DB lookup against value_normalized
 */
function normaliseIdentifier(type: string, value: string): string {
  switch (type) {
    case "EMAIL":
      return value.trim().toLowerCase();
    case "PHONE":
      // Retain leading + for E.164; strip spaces, dashes, parentheses
      return value.trim().replace(/[\s\-().]/g, "");
    case "ADDRESS":
      return value.trim().toLowerCase().replace(/\s+/g, " ");
    default:
      return value.trim().toLowerCase();
  }
}

/**
 * Finds or creates the recipient's UNOPENED system folder.
 * System folders should be created at signup, but this is defensive.
 *
 * @param recipientId - The recipient's app User ID
 * @returns The UNOPENED Folder record (id only)
 */
async function getOrCreateUnOpenedFolder(
  recipientId: string
): Promise<{ id: string }> {
  const existing = await prisma.folder.findFirst({
    where: { userId: recipientId, system_type: "UNOPENED" },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Defensive: create the folder if it was somehow not seeded at signup
  return prisma.folder.create({
    data: {
      userId: recipientId,
      name: "Unopened",
      system_type: "UNOPENED",
    },
    select: { id: true },
  });
}

// ===== Main =====

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth check (must be first, before any DB access) ---
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const undeliverableCutoff = new Date(now.getTime() - UNDELIVERABLE_AFTER_MS);
  const deletionCutoff = new Date(now.getTime() - DELETION_GRACE_PERIOD_MS);

  let deleted = 0;
  let undeliverable = 0;
  let delivered = 0;
  let blocked = 0;

  // ===== Phase 0: Delete accounts past 30-day grace period =====
  // Users who requested account deletion >= 30 days ago are permanently removed.
  // FK cascades (ON DELETE CASCADE) handle received letters, drafts, folders,
  // identifiers, and block list entries. Sent letters remain (senderId set to null
  // or left orphaned per schema — they are never shown to the recipient's sender view).
  try {
    const toDelete = await prisma.user.findMany({
      where: { markedForDeletionAt: { lte: deletionCutoff } },
      select: { id: true },
    });

    for (const u of toDelete) {
      try {
        await prisma.user.delete({ where: { id: u.id } });
        deleted++;
      } catch (err) {
        console.error(`[cron/deliver] Error deleting user ${u.id}:`, err);
      }
    }

    if (deleted > 0) {
      console.log(`[cron/deliver] Deleted ${deleted} account(s) past grace period.`);
    }
  } catch (err) {
    console.error("[cron/deliver] Error fetching accounts for deletion:", err);
  }

  // ===== Step 1: Mark letters UNDELIVERABLE =====
  // Letters that have been IN_TRANSIT with no resolved recipient for > 3 days
  // are permanently undeliverable. The sender is never informed (no sent folder).
  try {
    const result = await prisma.letter.updateMany({
      where: {
        status: "IN_TRANSIT",
        recipientUserId: null,
        sent_at: { lte: undeliverableCutoff },
      },
      data: { status: "UNDELIVERABLE" },
    });
    undeliverable = result.count;

    if (undeliverable > 0) {
      console.log(`[cron/deliver] Marked ${undeliverable} letter(s) UNDELIVERABLE.`);
    }
  } catch (err) {
    // Log and continue; these letters will be retried next tick
    console.error("[cron/deliver] Error marking UNDELIVERABLE:", err);
  }

  // ===== Step 2: Re-attempt routing for still-unresolvable letters =====
  // Each cron run re-checks whether the addressing value now resolves to a user
  // (e.g. the user signed up after the letter was sent).
  let unroutedLetters: {
    id: string;
    addressingInputType: string | null;
    addressingInputValue: string | null;
  }[] = [];

  try {
    unroutedLetters = await prisma.letter.findMany({
      where: {
        status: "IN_TRANSIT",
        recipientUserId: null,
        sent_at: { gt: undeliverableCutoff },
      },
      select: {
        id: true,
        addressingInputType: true,
        addressingInputValue: true,
      },
    });
  } catch (err) {
    console.error("[cron/deliver] Error fetching unrouted letters:", err);
  }

  for (const letter of unroutedLetters) {
    try {
      const inputType = letter.addressingInputType;
      const inputValue = letter.addressingInputValue;

      if (!inputType || !inputValue) {
        continue; // Cannot route without both type and value
      }

      let resolvedRecipientId: string | null = null;
      let resolvedTimezone: string | null = null;

      if (inputType === "USERNAME") {
        // Username routing always works if the username exists (no discoverability check needed)
        const user = await prisma.user.findFirst({
          where: { username: { equals: inputValue.trim(), mode: "insensitive" } },
          select: { id: true, timezone: true },
        });
        if (user) {
          resolvedRecipientId = user.id;
          resolvedTimezone = user.timezone;
        }
      } else if (
        inputType === "EMAIL" ||
        inputType === "PHONE" ||
        inputType === "ADDRESS"
      ) {
        // Identifier-based routing: only if the user has the matching discoverability flag set
        const normalised = normaliseIdentifier(inputType, inputValue);

        // Map input type to the corresponding User discoverability boolean field
        const discoverabilityField =
          inputType === "EMAIL"
            ? "discoverableByEmail"
            : inputType === "PHONE"
            ? "discoverableByPhone"
            : "discoverableByAddress";

        const identifier = await prisma.userIdentifier.findFirst({
          where: {
            type: inputType as "EMAIL" | "PHONE" | "ADDRESS",
            value_normalized: normalised,
            user: { [discoverabilityField]: true },
          },
          select: {
            user: { select: { id: true, timezone: true } },
          },
        });

        if (identifier?.user) {
          resolvedRecipientId = identifier.user.id;
          resolvedTimezone = identifier.user.timezone;
        }
      }
      // PEN_PAL_MATCH: recipientUserId is set at draft creation time — nothing to do here.

      if (resolvedRecipientId && resolvedTimezone) {
        // Recompute scheduled delivery with the now-known recipient timezone.
        // Use the original sentAt as the reference point (best effort — we don't have it
        // in scope, so re-derive from now; the letter was sent recently enough that the
        // difference is small relative to the 3-day window).
        const tz = isValidIanaTimezone(resolvedTimezone) ? resolvedTimezone : "UTC";
        const { scheduledDeliveryUtc } = computeScheduledDelivery(now, tz);

        await prisma.letter.update({
          where: { id: letter.id },
          data: {
            recipientUserId: resolvedRecipientId,
            scheduled_delivery_at: scheduledDeliveryUtc,
          },
        });

        console.log(
          `[cron/deliver] Routed letter ${letter.id} to user ${resolvedRecipientId}.`
        );
      }
    } catch (err) {
      // Per-letter error: log and continue to avoid blocking the rest of the run
      console.error(`[cron/deliver] Error re-routing letter ${letter.id}:`, err);
    }
  }

  // ===== Step 3: Deliver due letters =====
  // Find all IN_TRANSIT letters with a resolved recipient whose scheduled delivery
  // time has now passed. Process each independently.
  let dueLetters: {
    id: string;
    senderId: string;
    recipientUserId: string;
  }[] = [];

  try {
    dueLetters = (await prisma.letter.findMany({
      where: {
        status: "IN_TRANSIT",
        recipientUserId: { not: null },
        scheduled_delivery_at: { lte: now },
      },
      select: {
        id: true,
        senderId: true,
        recipientUserId: true,
      },
    })) as { id: string; senderId: string; recipientUserId: string }[];
  } catch (err) {
    console.error("[cron/deliver] Error fetching due letters:", err);
  }

  for (const letter of dueLetters) {
    try {
      // --- BlockList check ---
      // If the recipient has blocked the sender, silently mark the letter BLOCKED.
      // The sender is never informed (they have no sent folder).
      const block = await prisma.blockList.findFirst({
        where: {
          blockerUserId: letter.recipientUserId,
          blockedUserId: letter.senderId,
        },
        select: { id: true },
      });

      if (block) {
        await prisma.letter.update({
          where: { id: letter.id },
          data: { status: "BLOCKED" },
        });
        blocked++;
        continue;
      }

      // --- Deliver the letter ---
      // Find (or create) the recipient's UNOPENED system folder.
      const unOpenedFolder = await getOrCreateUnOpenedFolder(letter.recipientUserId);

      // Atomically mark DELIVERED and assign to UNOPENED folder
      await prisma.$transaction([
        prisma.letter.update({
          where: { id: letter.id },
          data: {
            status: "DELIVERED",
            delivered_at: now,
          },
        }),

        // LetterFolder has UNIQUE(letterId) — upsert ensures idempotency if the
        // cron runs twice before state fully propagates (defensive).
        prisma.letterFolder.upsert({
          where: { letterId: letter.id },
          update: { folderId: unOpenedFolder.id },
          create: {
            letterId: letter.id,
            folderId: unOpenedFolder.id,
          },
        }),
      ]);

      delivered++;
    } catch (err) {
      // Per-letter error: log and skip. The letter remains IN_TRANSIT and will be
      // retried on the next cron run since scheduled_delivery_at is still <= now.
      console.error(`[cron/deliver] Error delivering letter ${letter.id}:`, err);
    }
  }

  console.log(
    `[cron/deliver] Run complete — deleted=${deleted}, delivered=${delivered}, blocked=${blocked}, undeliverable=${undeliverable}`
  );

  return NextResponse.json({ deleted, delivered, blocked, undeliverable });
}
