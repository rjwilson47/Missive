/**
 * @file src/app/api/folders/route.ts
 * GET  /api/folders — list all folders for the current user
 * POST /api/folders — create a new custom folder
 *
 * GET response (200): FolderShape[]
 *   Returns system folders (UNOPENED, OPENED, DRAFTS) first, then custom
 *   folders in creation order. Each folder includes a letterCount.
 *
 * POST body: { name: string }
 * POST constraints (SPEC §F):
 *   - Max 30 custom folders per user (system folders don't count toward limit)
 *   - Name max 30 characters, non-empty
 *   - Name must be unique per user (case-insensitive, enforced in code)
 * POST response (201): FolderShape
 *
 * Authorization: both handlers require a valid JWT session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { FolderShape } from "@/types";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Maximum custom (non-system) folders a user may create (SPEC §F) */
const MAX_CUSTOM_FOLDERS = 30;

/** Maximum folder name length in characters (SPEC §F) */
const MAX_NAME_LENGTH = 30;

/**
 * Maps a Prisma Folder row to the FolderShape API type.
 *
 * @param folder     - Prisma row with optional _count
 * @returns FolderShape ready for JSON serialisation
 */
function toFolderShape(
  folder: {
    id: string;
    userId: string;
    name: string;
    system_type: string | null;
    created_at: Date;
    _count?: { letters: number };
  }
): FolderShape {
  return {
    id: folder.id,
    userId: folder.userId,
    name: folder.name,
    systemType: folder.system_type as FolderShape["systemType"],
    createdAt: folder.created_at.toISOString(),
    letterCount: folder._count?.letters,
  };
}

// ===== GET =====

/**
 * Lists all folders for the authenticated user.
 *
 * Returns system folders first (UNOPENED, OPENED, DRAFTS), then custom folders
 * sorted by creation time (oldest first). Each folder includes a letterCount
 * derived from the LetterFolder join table.
 *
 * @param req - Incoming request with Authorization header
 * @returns FolderShape[] JSON
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Fetch folders ─────────────────────────────────────────────────────────
  const folders = await prisma.folder.findMany({
    where: { userId: me.id },
    include: { _count: { select: { letters: true } } },
    orderBy: { created_at: "asc" },
  });

  // System folders first, custom folders after
  const systemOrder: Record<string, number> = { UNOPENED: 0, OPENED: 1, DRAFTS: 2 };
  folders.sort((a, b) => {
    const aOrder = a.system_type ? (systemOrder[a.system_type] ?? 3) : 99;
    const bOrder = b.system_type ? (systemOrder[b.system_type] ?? 3) : 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.created_at.getTime() - b.created_at.getTime();
  });

  return NextResponse.json(folders.map(toFolderShape));
}

// ===== POST =====

/**
 * Creates a new custom folder for the authenticated user.
 *
 * Enforces:
 *   - Max 30 custom folders (system folders excluded from count)
 *   - Name ≤ 30 characters, non-empty
 *   - Case-insensitive name uniqueness per user
 *
 * @param req - Incoming request with Authorization header and JSON body
 * @returns Created FolderShape (201) or error response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Folder name is required." }, { status: 400 });
  }

  const trimmedName = name.trim();

  if (trimmedName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Folder name must be ${MAX_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  // ── Enforce custom folder limit ────────────────────────────────────────────
  const customFolderCount = await prisma.folder.count({
    where: { userId: me.id, system_type: null },
  });

  if (customFolderCount >= MAX_CUSTOM_FOLDERS) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_CUSTOM_FOLDERS} custom folders.` },
      { status: 422 }
    );
  }

  // ── Case-insensitive name uniqueness check ────────────────────────────────
  // Prisma doesn't natively support case-insensitive unique checks for all DBs,
  // so we do this in application code. The DB only has a varchar(30) column.
  const existingFolders = await prisma.folder.findMany({
    where: { userId: me.id, system_type: null },
    select: { name: true },
  });

  const nameLower = trimmedName.toLowerCase();
  const isDuplicate = existingFolders.some((f) => f.name.toLowerCase() === nameLower);

  if (isDuplicate) {
    return NextResponse.json(
      { error: "A folder with that name already exists." },
      { status: 409 }
    );
  }

  // ── Create folder ─────────────────────────────────────────────────────────
  try {
    const folder = await prisma.folder.create({
      data: {
        userId: me.id,
        name: trimmedName,
        system_type: null,
      },
      include: { _count: { select: { letters: true } } },
    });

    return NextResponse.json(toFolderShape(folder), { status: 201 });
  } catch (err) {
    console.error("[POST /api/folders] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
