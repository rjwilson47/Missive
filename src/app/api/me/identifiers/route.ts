/**
 * @file src/app/api/me/identifiers/route.ts
 * GET  /api/me/identifiers — list the session user's registered identifiers
 * POST /api/me/identifiers — add a new UserIdentifier (email, phone, or address)
 *
 * UserIdentifiers are used for routing letters when the sender knows the
 * recipient's email, phone, or address but not their username (SPEC §E).
 * Each identifier is normalised before storage:
 *   EMAIL:   lowercase + trimmed
 *   PHONE:   digits only
 *   ADDRESS: lowercase + whitespace-normalised
 *
 * Constraints:
 *   - Adding identifiers is blocked during the 30-day deletion grace period (SPEC §K).
 *   - Each (type, value_normalized) pair must be globally unique across all users
 *     (@@unique constraint in schema — prevents two users claiming the same email).
 *
 * POST Request body: { type: "EMAIL" | "PHONE" | "ADDRESS", value: string }
 * POST Response (201): { id, type, valueNormalized, createdAt }
 * GET  Response (200): Array of UserIdentifierShape
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { UserIdentifierShape, IdentifierType } from "@/types";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Allowed identifier types */
const VALID_TYPES = new Set<IdentifierType>(["EMAIL", "PHONE", "ADDRESS"]);

/**
 * Normalises an identifier value according to its type.
 *
 * EMAIL:   lowercase + trimmed
 * PHONE:   digits only (removes all non-numeric characters)
 * ADDRESS: lowercase + collapsed whitespace + trimmed
 *
 * @param type  - Identifier type enum
 * @param value - Raw user-supplied value
 * @returns Normalised string
 */
function normalizeIdentifier(type: IdentifierType, value: string): string {
  switch (type) {
    case "EMAIL":
      return value.toLowerCase().trim();
    case "PHONE":
      // Keep digits only (simple normalization; no E.164 conversion for MVP)
      return value.replace(/\D/g, "");
    case "ADDRESS":
      // Lowercase + collapse internal whitespace
      return value.toLowerCase().replace(/\s+/g, " ").trim();
  }
}

/**
 * Maps a Prisma UserIdentifier record to the public UserIdentifierShape.
 *
 * @param row - Prisma UserIdentifier record
 * @returns UserIdentifierShape safe for API response
 */
function toShape(row: { id: string; type: IdentifierType; value_normalized: string; created_at: Date }): UserIdentifierShape {
  return {
    id: row.id,
    type: row.type,
    valueNormalized: row.value_normalized,
    createdAt: row.created_at.toISOString(),
  };
}

// ===== GET /api/me/identifiers =====

/**
 * Lists all registered identifiers for the session user.
 *
 * @param req - Incoming request with Authorization header
 * @returns Array of UserIdentifierShape (200) or 401
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  const rows = await prisma.userIdentifier.findMany({
    where: { userId: me.id },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(rows.map(toShape));
}

// ===== POST /api/me/identifiers =====

/**
 * Adds a new UserIdentifier for the session user.
 *
 * Adding identifiers is blocked during the account deletion grace period.
 * The (type, value_normalized) pair must be unique globally — if another user
 * already has the same normalized identifier, returns 409.
 *
 * @param req - Incoming request with Authorization header + JSON body
 * @returns Created UserIdentifierShape (201) or error response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // ── Deletion guard (SPEC §K) ───────────────────────────────────────────────
  if (me.markedForDeletionAt !== null) {
    return NextResponse.json(
      { error: "Account scheduled for deletion. Cancel deletion in Settings to add identifiers." },
      { status: 422 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { type, value } = (body ?? {}) as Record<string, unknown>;

  if (typeof type !== "string" || !VALID_TYPES.has(type as IdentifierType)) {
    return NextResponse.json(
      { error: "type must be one of: EMAIL, PHONE, ADDRESS." },
      { status: 400 }
    );
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return NextResponse.json({ error: "value is required." }, { status: 400 });
  }

  const identifierType = type as IdentifierType;
  const normalized = normalizeIdentifier(identifierType, value);

  if (normalized.length === 0) {
    return NextResponse.json({ error: "value is invalid after normalization." }, { status: 400 });
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  try {
    const created = await prisma.userIdentifier.create({
      data: {
        userId: me.id,
        type: identifierType,
        value_normalized: normalized,
      },
    });

    return NextResponse.json(toShape(created), { status: 201 });
  } catch (err: unknown) {
    // P2002 = unique constraint on (type, value_normalized) — already in use
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This identifier is already registered." },
        { status: 409 }
      );
    }
    console.error("[POST /api/me/identifiers] Error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
