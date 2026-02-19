/**
 * @file src/app/api/upload/route.ts
 * POST /api/upload
 *
 * Accepts a single image file, processes it, and stores it in Supabase Storage.
 *
 * Processing pipeline:
 *   1. Validate MIME type (JPG/PNG/HEIC) and size (≤5 MB).
 *   2. Scan for malware (placeholder hook — scanUpload).
 *   3. Convert HEIC → JPG if needed (graceful failure if libheif unavailable).
 *   4. Strip EXIF data (Sharp .rotate()).
 *   5. Generate 300px thumbnail.
 *   6. Upload main image + thumbnail to Supabase Storage (private bucket).
 *   7. Insert LetterImage row in DB.
 *
 * Request: multipart/form-data — fields: file, letterId, orderIndex
 * Response (201): LetterImageShape (without signed URLs)
 *
 * Authorization: session user must be the draft's senderId.
 *
 * TODO (Session 3): Implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Session 3): implement upload pipeline
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
