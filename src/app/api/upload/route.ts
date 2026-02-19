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
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  validateImageFile,
  scanUpload,
  processImage,
  uploadImageToStorage,
  MAX_IMAGES_PER_LETTER,
  MAX_TOTAL_IMAGE_SIZE_BYTES,
} from "@/lib/upload";
import type { LetterImageShape } from "@/types";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabaseUser = await getUserFromHeader(req.headers.get("authorization"));
  if (!supabaseUser) return UNAUTHORIZED;

  const me = await getAppUser(supabaseUser.id);
  if (!me) return UNAUTHORIZED;

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const letterId = formData.get("letterId");
  const orderIndexRaw = formData.get("orderIndex");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing or invalid 'file' field." }, { status: 400 });
  }

  if (typeof letterId !== "string" || !letterId) {
    return NextResponse.json({ error: "Missing 'letterId' field." }, { status: 400 });
  }

  const orderIndex = parseInt(String(orderIndexRaw ?? "0"), 10);
  if (isNaN(orderIndex) || orderIndex < 0) {
    return NextResponse.json({ error: "Invalid 'orderIndex' field." }, { status: 400 });
  }

  // Verify letter exists, belongs to me, and is a DRAFT
  const letter = await prisma.letter.findFirst({
    where: { id: letterId, senderId: me.id },
    select: { id: true, status: true },
  });

  if (!letter) {
    return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }

  if (letter.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Images can only be uploaded to DRAFT letters." },
      { status: 409 }
    );
  }

  // Count existing images and sum their sizes
  const existingImages = await prisma.letterImage.findMany({
    where: { letterId },
    select: { size_bytes: true },
  });

  if (existingImages.length >= MAX_IMAGES_PER_LETTER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES_PER_LETTER} images per letter.` },
      { status: 422 }
    );
  }

  const existingTotalBytes = existingImages.reduce((sum, img) => sum + img.size_bytes, 0);
  const fileSizeBytes = file.size;

  if (existingTotalBytes + fileSizeBytes > MAX_TOTAL_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Total image size for this letter would exceed 25 MB." },
      { status: 422 }
    );
  }

  // Validate MIME type and size
  const mimeType = file.type;
  const validationError = validateImageFile(mimeType, fileSizeBytes);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Antivirus scan (no-op placeholder)
  try {
    await scanUpload(buffer);
  } catch (err) {
    console.error("[POST /api/upload] Scan rejected file:", err);
    return NextResponse.json({ error: "File rejected by security scan." }, { status: 422 });
  }

  // Process: EXIF strip, HEIC conversion, thumbnail
  let processed;
  try {
    processed = await processImage(buffer, mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image processing failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Upload to Supabase Storage
  let uploadResult;
  try {
    uploadResult = await uploadImageToStorage(letterId, orderIndex, processed);
  } catch (err) {
    console.error("[POST /api/upload] Storage upload error:", err);
    return NextResponse.json({ error: "Failed to store image. Please try again." }, { status: 500 });
  }

  // Insert LetterImage DB row
  try {
    const image = await prisma.letterImage.create({
      data: {
        letterId,
        storage_path: uploadResult.storagePath,
        thumbnail_path: uploadResult.thumbnailPath,
        mimeType: uploadResult.mimeType,
        size_bytes: uploadResult.sizeBytes,
        width: uploadResult.width,
        height: uploadResult.height,
        order_index: orderIndex,
      },
      select: {
        id: true,
        storage_path: true,
        thumbnail_path: true,
        mimeType: true,
        size_bytes: true,
        width: true,
        height: true,
        order_index: true,
      },
    });

    const shape: LetterImageShape = {
      id: image.id,
      storagePath: image.storage_path,
      thumbnailPath: image.thumbnail_path,
      mimeType: image.mimeType,
      sizeBytes: image.size_bytes,
      width: image.width,
      height: image.height,
      orderIndex: image.order_index,
    };

    return NextResponse.json(shape, { status: 201 });
  } catch (err) {
    console.error("[POST /api/upload] DB insert error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
