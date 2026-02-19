/**
 * @file src/app/api/letters/route.ts
 * GET  /api/letters?folder=DRAFTS|UNOPENED|OPENED|<folder-uuid>
 * POST /api/letters
 *
 * GET — list letters in a mailbox view:
 *   DRAFTS        → letters where senderId = me AND status = DRAFT
 *   UNOPENED      → letters in the user's UNOPENED system folder
 *   OPENED        → letters in the user's OPENED system folder
 *   <folder-uuid> → letters in the specified custom folder (must belong to me)
 *   Returns LetterSummary[] ordered newest-first.
 *   NEVER returns IN_TRANSIT letters (no sent folder).
 *
 * POST — create a new DRAFT letter:
 *   Body: { contentType, addressingInputType?, addressingInputValue?, recipientUserId? }
 *   Response (201): { id: string }
 *
 * Both require Authorization: Bearer <token>.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { LetterSummary } from "@/types";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// ===== Helpers =====

const VALID_CONTENT_TYPES = ["TYPED", "HANDWRITTEN", "VOICE"] as const;
const VALID_ADDRESSING_TYPES = [
  "USERNAME",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "PEN_PAL_MATCH",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function letterToSummary(letter: any): LetterSummary {
  return {
    id: letter.id,
    senderId: letter.senderId,
    senderUsername: letter.sender?.username ?? "",
    // These fields are null/empty for DRAFT letters (only set on send)
    senderRegionAtSend: letter.sender_region_at_send ?? "",
    senderTimezoneAtSend: letter.sender_timezone_at_send ?? "",
    contentType: letter.contentType,
    status: letter.status,
    sentAt: letter.sent_at?.toISOString() ?? null,
    scheduledDeliveryAt: letter.scheduled_delivery_at?.toISOString() ?? null,
    deliveredAt: letter.delivered_at?.toISOString() ?? null,
    openedAt: letter.opened_at?.toISOString() ?? null,
    createdAt: letter.created_at?.toISOString() ?? new Date().toISOString(),
  };
}

// ===== GET =====

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  const folder = req.nextUrl.searchParams.get("folder") ?? "DRAFTS";

  try {
    // --- DRAFTS: query by ownership + status (no folder join) ---
    if (folder === "DRAFTS") {
      const letters = await prisma.letter.findMany({
        where: { senderId: me.id, status: "DRAFT" },
        include: { sender: { select: { username: true } } },
        orderBy: { created_at: "desc" },
      });
      return NextResponse.json(letters.map(letterToSummary));
    }

    // --- System folders: UNOPENED / OPENED ---
    if (folder === "UNOPENED" || folder === "OPENED") {
      const systemFolder = await prisma.folder.findFirst({
        where: { userId: me.id, systemType: folder },
        select: { id: true },
      });

      if (!systemFolder) {
        return NextResponse.json([]);
      }

      const letters = await prisma.letter.findMany({
        where: {
          recipientUserId: me.id,
          status: "DELIVERED",
          folderEntry: { folderId: systemFolder.id },
        },
        include: { sender: { select: { username: true } } },
        orderBy: { delivered_at: "desc" },
      });

      return NextResponse.json(letters.map(letterToSummary));
    }

    // --- Custom folder (UUID): verify ownership first ---
    const customFolder = await prisma.folder.findFirst({
      where: { id: folder, userId: me.id },
      select: { id: true },
    });

    if (!customFolder) {
      return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    }

    const letters = await prisma.letter.findMany({
      where: {
        recipientUserId: me.id,
        status: "DELIVERED",
        folderEntry: { folderId: customFolder.id },
      },
      include: { sender: { select: { username: true } } },
      orderBy: { delivered_at: "desc" },
    });

    return NextResponse.json(letters.map(letterToSummary));
  } catch (err) {
    console.error("[GET /api/letters] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// ===== POST =====

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  if (me.markedForDeletionAt !== null) {
    return NextResponse.json(
      { error: "Account scheduled for deletion. Cannot create letters." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    contentType,
    addressingInputType,
    addressingInputValue,
    recipientUserId,
  } = body as Record<string, unknown>;

  if (
    typeof contentType !== "string" ||
    !VALID_CONTENT_TYPES.includes(contentType as (typeof VALID_CONTENT_TYPES)[number])
  ) {
    return NextResponse.json(
      { error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  if (
    addressingInputType !== undefined &&
    addressingInputType !== null &&
    (typeof addressingInputType !== "string" ||
      !VALID_ADDRESSING_TYPES.includes(
        addressingInputType as (typeof VALID_ADDRESSING_TYPES)[number]
      ))
  ) {
    return NextResponse.json({ error: "Invalid addressingInputType." }, { status: 400 });
  }

  try {
    const letter = await prisma.letter.create({
      data: {
        senderId: me.id,
        contentType: contentType as (typeof VALID_CONTENT_TYPES)[number],
        status: "DRAFT",
        ...(addressingInputType != null && {
          addressingInputType: addressingInputType as (typeof VALID_ADDRESSING_TYPES)[number],
        }),
        ...(typeof addressingInputValue === "string" && { addressingInputValue }),
        ...(typeof recipientUserId === "string" && { recipientUserId }),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: letter.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/letters] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
