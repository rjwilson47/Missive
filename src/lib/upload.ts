/**
 * @file src/lib/upload.ts
 * Image upload, processing, and storage utilities.
 *
 * Responsibilities:
 *   - MIME type + size validation
 *   - HEIC → JPG conversion via Sharp (graceful fallback if libheif unavailable)
 *   - EXIF stripping via Sharp's .rotate() (auto-strips all metadata)
 *   - Thumbnail generation (300px wide, preserve aspect ratio)
 *   - Upload to Supabase Storage (private bucket)
 *   - Antivirus placeholder hook (scanUpload)
 *   - Signed URL generation for authorised viewers
 */

import { supabaseAdmin } from "@/lib/supabase";

// ===== Constants =====

/** Accepted MIME types (client + server both validate) */
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

/** Maximum file size per image: 5 MB */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum total image size per letter: 25 MB */
export const MAX_TOTAL_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;

/** Maximum images per letter (includes handwritten pages) */
export const MAX_IMAGES_PER_LETTER = 10;

/** Thumbnail width in pixels */
export const THUMBNAIL_WIDTH = 300;

/** Signed URL expiry: 1 hour (3600 seconds) */
export const SIGNED_URL_EXPIRY_SECONDS = 3600;

// ===== Types =====

export interface ProcessedImage {
  /** Processed image buffer (HEIC converted to JPG, EXIF stripped) */
  buffer: Buffer;
  /** Thumbnail buffer (300px wide) */
  thumbnailBuffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  sizeBytes: number;
}

export interface UploadResult {
  storagePath: string;
  thumbnailPath: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

// ===== Antivirus Placeholder =====

/**
 * Placeholder antivirus hook. Currently a no-op.
 * V2: integrate ClamAV or a cloud scanning service here.
 *
 * @param buffer - Raw file buffer to scan
 * @returns Promise<void> — throws if the file is considered malicious
 */
export async function scanUpload(_buffer: Buffer): Promise<void> {
  // TODO (V2): integrate ClamAV or similar
}

// ===== Validation =====

/**
 * Validates a file's MIME type and size before processing.
 *
 * @param mimeType  - Declared MIME type from the upload
 * @param sizeBytes - File size in bytes
 * @returns null if valid, or an error string if invalid
 */
export function validateImageFile(mimeType: string, sizeBytes: number): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(mimeType as AcceptedMimeType)) {
    return "Unsupported file type. Please upload JPG, PNG, or HEIC.";
  }
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return "File too large. Maximum size per image is 5 MB.";
  }
  return null;
}

/**
 * Sanitises a filename to prevent path traversal and injection.
 *
 * @param filename - Raw filename from the client
 * @returns Safe filename string
 */
export function sanitiseFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 128);
}

// ===== Processing =====

/**
 * Processes an uploaded image: converts HEIC, strips EXIF, generates thumbnail.
 *
 * Sharp's `.rotate()` with no arguments auto-orients the image using its EXIF
 * orientation tag and strips all EXIF metadata from the output — satisfying the
 * privacy requirement of SPEC §2-J.
 *
 * HEIC input is converted to JPEG. If libheif is unavailable on the host, Sharp
 * will throw and we surface a user-safe error message.
 *
 * @param buffer   - Raw file buffer
 * @param mimeType - Declared MIME type
 * @returns ProcessedImage with converted buffer, thumbnail, and metadata
 * @throws Error with user-safe message if HEIC conversion fails
 */
export async function processImage(buffer: Buffer, mimeType: string): Promise<ProcessedImage> {
  // Dynamic import keeps Sharp server-only (it's a native module)
  const sharp = (await import("sharp")).default;

  const isPng = mimeType === "image/png";
  const isHeic = mimeType === "image/heic" || mimeType === "image/heif";

  // .rotate() auto-orients from EXIF and strips metadata
  const base = sharp(buffer, { failOnError: !isHeic }).rotate();

  let processedBuffer: Buffer;
  let outMimeType: "image/jpeg" | "image/png";

  try {
    if (isPng) {
      processedBuffer = await base.png().toBuffer();
      outMimeType = "image/png";
    } else {
      // JPEG and HEIC both output as JPEG
      processedBuffer = await base.jpeg({ quality: 90 }).toBuffer();
      outMimeType = "image/jpeg";
    }
  } catch (err) {
    if (isHeic) {
      throw new Error(
        "HEIC conversion failed. Please convert your image to JPG or PNG and try again."
      );
    }
    throw err;
  }

  // Read dimensions from the processed buffer
  const meta = await sharp(processedBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Thumbnail: resize to 300px wide, JPEG regardless of input format
  const thumbnailBuffer = await sharp(processedBuffer)
    .resize(THUMBNAIL_WIDTH)
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    buffer: processedBuffer,
    thumbnailBuffer,
    mimeType: outMimeType,
    width,
    height,
    sizeBytes: processedBuffer.length,
  };
}

// ===== Storage =====

/**
 * Uploads a processed image (and its thumbnail) to Supabase Storage.
 *
 * Storage paths follow the pattern:
 *   Main:      {letterId}/{uuid}.jpg
 *   Thumbnail: {letterId}/{uuid}-thumb.jpg
 *
 * The bucket is private; files are only accessible via signed URLs.
 *
 * @param letterId   - The letter this image belongs to
 * @param orderIndex - Position in the letter's image sequence
 * @param processed  - The result of processImage()
 * @returns UploadResult with storage paths and metadata
 */
export async function uploadImageToStorage(
  letterId: string,
  orderIndex: number,
  processed: ProcessedImage
): Promise<UploadResult> {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "letters-images";
  const ext = processed.mimeType === "image/png" ? "png" : "jpg";
  const uid = crypto.randomUUID();

  const storagePath = `${letterId}/${orderIndex}-${uid}.${ext}`;
  const thumbnailPath = `${letterId}/${orderIndex}-${uid}-thumb.jpg`;

  // Upload main image
  const { error: mainError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, processed.buffer, {
      contentType: processed.mimeType,
      upsert: false,
    });

  if (mainError) {
    throw new Error(`Failed to upload image: ${mainError.message}`);
  }

  // Upload thumbnail (best-effort cleanup of main on failure)
  const { error: thumbError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(thumbnailPath, processed.thumbnailBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (thumbError) {
    await supabaseAdmin.storage.from(bucket).remove([storagePath]);
    throw new Error(`Failed to upload thumbnail: ${thumbError.message}`);
  }

  return {
    storagePath,
    thumbnailPath,
    mimeType: processed.mimeType,
    sizeBytes: processed.sizeBytes,
    width: processed.width,
    height: processed.height,
  };
}

/**
 * Generates a signed URL for a storage path, valid for SIGNED_URL_EXPIRY_SECONDS.
 * Only call this after verifying the requesting user is authorised to view the letter.
 *
 * @param storagePath - Path within the Supabase Storage bucket
 * @returns Signed URL string
 */
export async function getSignedUrl(storagePath: string): Promise<string> {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "letters-images";
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}
