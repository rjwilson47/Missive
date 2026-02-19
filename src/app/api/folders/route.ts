/**
 * @file src/app/api/folders/route.ts
 * GET  /api/folders — list all folders for the current user
 * POST /api/folders — create a new custom folder
 *
 * GET response (200): FolderShape[]
 *   Includes both system folders (UNOPENED, OPENED, DRAFTS) and custom folders.
 *
 * POST body: { name: string }
 * POST constraints:
 *   - Max 30 custom folders per user
 *   - Name max 30 characters
 *   - Name must be unique per user (case-insensitive)
 * POST response (201): FolderShape
 *
 * TODO (Session 5): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 5): fetch all folders for current user
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 5): validate, enforce max 30, create folder
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
