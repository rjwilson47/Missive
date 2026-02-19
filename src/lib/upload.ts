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
 *
 * TODO (Session 3): Implement fully.
 * See SPEC.md §2-B, §2-J, §9 for constraints and security requirements.
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
 *
 * TODO (Session 3 / V2): Integrate actual scanner.
 */
export async function scanUpload(_buffer: Buffer): Promise<void> {
  // TODO: integrate ClamAV or similar
  // Example: await clamavClient.scan(buffer);
}

// ===== Validation =====

/**
 * Validates a file's MIME type and size before processing.
 *
 * @param mimeType  - Declared MIME type from the upload
 * @param sizeBytes - File size in bytes
 * @returns null if valid, or an error string if invalid
 *
 * TODO (Session 3): Call this from the /api/upload route handler.
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
  // Strip directory separators and allow only safe chars
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 128);
}

// ===== Processing =====

/**
 * Processes an uploaded image: converts HEIC, strips EXIF, generates thumbnail.
 *
 * @param buffer   - Raw file buffer
 * @param mimeType - Declared MIME type
 * @returns ProcessedImage with converted buffer, thumbnail, and metadata
 *
 * @throws Error with user-safe message if HEIC conversion fails
 *
 * TODO (Session 3): Implement using Sharp.
 * - Use sharp(buffer).rotate() to auto-strip EXIF
 * - For HEIC: wrap in try-catch, return 400 if libheif unavailable
 * - Thumbnail: sharp(buffer).resize(THUMBNAIL_WIDTH).toBuffer()
 */
export async function processImage(_buffer: Buffer, _mimeType: string): Promise<ProcessedImage> {
  // TODO (Session 3): Implement
  throw new Error("processImage not yet implemented");
}

// ===== Storage =====

/**
 * Uploads a processed image (and its thumbnail) to Supabase Storage.
 *
 * @param letterId       - The letter this image belongs to
 * @param orderIndex     - Position in the letter's image sequence
 * @param processed      - The result of processImage()
 * @returns UploadResult with storage paths and metadata
 *
 * TODO (Session 3): Implement using supabaseAdmin.storage.
 */
export async function uploadImageToStorage(
  _letterId: string,
  _orderIndex: number,
  _processed: ProcessedImage
): Promise<UploadResult> {
  // TODO (Session 3): Implement
  throw new Error("uploadImageToStorage not yet implemented");
}

/**
 * Generates a signed URL for a storage path, valid for SIGNED_URL_EXPIRY_SECONDS.
 * Only call this after verifying the requesting user is authorised to view the letter.
 *
 * @param storagePath - Path within the Supabase Storage bucket
 * @returns Signed URL string
 *
 * TODO (Session 3): Implement using supabaseAdmin.storage.from(...).createSignedUrl().
 */
export async function getSignedUrl(_storagePath: string): Promise<string> {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "letters-images";
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(_storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}
