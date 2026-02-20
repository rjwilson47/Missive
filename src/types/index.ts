/**
 * @file src/types/index.ts
 * Shared TypeScript types used across the Missive application.
 * These mirror the Prisma schema enums and common API shapes.
 */

// ===== Prisma Enum Mirrors =====
// Keep these in sync with prisma/schema.prisma

export type LetterStatus =
  | "DRAFT"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "BLOCKED"
  | "UNDELIVERABLE";

export type ContentType = "TYPED" | "HANDWRITTEN" | "VOICE";

export type AddressingInputType =
  | "USERNAME"
  | "EMAIL"
  | "PHONE"
  | "ADDRESS"
  | "PEN_PAL_MATCH";

export type IdentifierType = "EMAIL" | "PHONE" | "ADDRESS";

export type PenPalMatchPreference = "SAME_REGION" | "ANYWHERE";

export type SystemFolderType = "UNOPENED" | "OPENED" | "DRAFTS";

// ===== Auth =====

/** Shape returned by GET /api/me */
export interface AppUser {
  id: string;
  username: string;
  region: string;
  timezone: string;
  discoverableByEmail: boolean;
  discoverableByPhone: boolean;
  discoverableByAddress: boolean;
  availableForPenPalMatching: boolean;
  penPalMatchPreference: PenPalMatchPreference;
  markedForDeletionAt: string | null; // ISO string or null
  /** Recovery email for password reset (UNVERIFIED; never used for login). */
  recoveryEmail: string | null;
  createdAt: string;
}

// ===== Letters =====

/** Minimal letter shape used in mailbox list views */
export interface LetterSummary {
  id: string;
  senderId: string;
  senderUsername: string;
  senderRegionAtSend: string;
  senderTimezoneAtSend: string;
  contentType: ContentType;
  status: LetterStatus;
  sentAt: string | null;
  scheduledDeliveryAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Resolved recipient username (null if unresolved) */
  recipientUsername: string | null;
  /** Raw addressing input value as typed by the sender (null if not set) */
  addressingInputValue: string | null;
}

/** Full letter shape used in letter detail views */
export interface LetterDetail extends LetterSummary {
  typedBodyJson: Record<string, unknown> | null; // ProseMirror JSON
  fontFamily: string | null;
  images: LetterImageShape[];
  folderId: string | null;
  inReplyToId: string | null;
}

/** Shape for a single image attached to a letter */
export interface LetterImageShape {
  id: string;
  storagePath: string;
  thumbnailPath: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  orderIndex: number;
  /** Signed URL for displaying the full image (generated server-side, ~1hr expiry) */
  signedUrl?: string;
  /** Signed URL for the 300px thumbnail */
  thumbnailSignedUrl?: string;
}

// ===== Compose =====

/** Step identifiers for the multi-step compose flow */
export type ComposeStep = "address" | "type" | "write" | "review";

/** The available stationery fonts */
export type StationeryFont =
  | "Crimson Text"
  | "Merriweather"
  | "Lora"
  | "Courier Prime"
  | "Caveat"
  | "Open Sans";

// ===== Folders =====

export interface FolderShape {
  id: string;
  userId: string;
  name: string;
  systemType: SystemFolderType | null;
  createdAt: string;
  /** Number of letters in folder (computed, not stored) */
  letterCount?: number;
}

// ===== UserIdentifiers =====

/** Shape for a user identifier returned by GET /api/me/identifiers */
export interface UserIdentifierShape {
  id: string;
  type: IdentifierType;
  valueNormalized: string;
  createdAt: string;
}

// ===== API helpers =====

/** Generic API error response */
export interface ApiError {
  error: string;
}

/** Generic API success response */
export interface ApiSuccess {
  success: true;
}
