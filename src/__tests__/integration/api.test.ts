/**
 * @file src/__tests__/integration/api.test.ts
 * Integration tests for Missive API route handlers.
 *
 * Mocks Prisma, Supabase, auth helpers, and rate limiters so the route handler
 * logic can be exercised in isolation without real DB or network calls.
 *
 * Test scenarios (SPEC §12):
 *   1. Quota enforcement  — send route rejects the 4th send in a day (429)
 *   2. Cron delivery      — due letter is marked DELIVERED and counted
 *   3. Cron blocking      — blocked sender's letter is marked BLOCKED and counted
 *   4. Account deletion   — cron Phase 0 deletes users past 30-day grace period
 *   5. Cancel deletion    — POST /api/me/cancel-delete clears markedForDeletionAt
 *   6. Reply draft        — POST /api/letters/:id/reply creates correct pre-addressed draft
 *   7. Pen pal dedup      — pen-pal-match returns 404 when all candidates are prior matches
 */

import { NextRequest } from "next/server";

// ─── Module mocks (hoisted by Jest before any imports) ────────────────────────

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    letter: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    dailyQuota: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    blockList: {
      findFirst: jest.fn(),
    },
    folder: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    letterFolder: {
      upsert: jest.fn(),
    },
    matchHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/supabase", () => ({
  __esModule: true,
  getUserFromHeader: jest.fn(),
  supabaseAdmin: {
    auth: { admin: { updateUserById: jest.fn().mockResolvedValue({ error: null }) } },
    storage: {
      from: jest.fn().mockReturnValue({
        remove: jest.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  __esModule: true,
  getAppUser: jest.fn(),
  prismaUserToAppUser: jest.fn((u: unknown) => u),
  buildSyntheticEmail: jest.fn((id: string) => `${id}@users.mailbox.invalid`),
  normaliseUsername: jest.fn((u: string) => u.toLowerCase().trim()),
  validateUsername: jest.fn(() => null),
}));

jest.mock("@/lib/ratelimit", () => ({
  __esModule: true,
  sendLimiter: { limit: jest.fn().mockResolvedValue({ success: true }) },
  authLimiter: { limit: jest.fn().mockResolvedValue({ success: true }) },
  identifierLookupLimiter: { limit: jest.fn().mockResolvedValue({ success: true }) },
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

// ─── Route handler imports (mocks above are in place when these execute) ──────

import { POST as sendLetter } from "@/app/api/letters/[id]/send/route";
import { POST as cronDeliver } from "@/app/api/cron/deliver/route";
import { POST as cancelDelete } from "@/app/api/me/cancel-delete/route";
import { POST as replyLetter } from "@/app/api/letters/[id]/reply/route";
import { POST as penPalMatch } from "@/app/api/pen-pal-match/route";
import { GET as getLetter, DELETE as deleteLetter } from "@/app/api/letters/[id]/route";
import { GET as getMe } from "@/app/api/me/route";

// Typed references to the mocked modules
import prisma from "@/lib/prisma";
import { getUserFromHeader } from "@/lib/supabase";
import { getAppUser } from "@/lib/auth";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const SUPABASE_USER = { id: "supa-uid-1" };

const ME = {
  id: "user-id-1",
  username: "alice",
  region: "US",
  timezone: "UTC",
  discoverableByEmail: false,
  discoverableByPhone: false,
  discoverableByAddress: false,
  availableForPenPalMatching: true,
  penPalMatchPreference: "ANYWHERE" as const,
  markedForDeletionAt: null,
  recoveryEmail: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const DRAFT_LETTER = {
  id: "letter-id-1",
  senderId: ME.id,
  recipientUserId: null,
  addressingInputType: "USERNAME",
  addressingInputValue: "bob",
  status: "DRAFT",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a minimal NextRequest-compatible mock.
 * The handlers only call req.headers.get() and req.json() — both are provided.
 */
function makeReq(
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return {
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body ?? {}),
    url: "http://localhost/test",
  } as unknown as NextRequest;
}

/**
 * Configures $transaction to handle both forms used in the app:
 *   - Interactive (callback) form: executes the callback with prisma as tx context
 *   - Sequential (array) form: resolves all promises in the array
 */
function setupTransaction() {
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (input: unknown) => {
      if (typeof input === "function") {
        // Interactive transaction — call the callback with prisma as the tx context
        return (input as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      // Sequential transaction — await all items in the array
      return Promise.all(input as Promise<unknown>[]);
    }
  );
}

// ─── Global setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  // resetAllMocks clears call history AND pending mockResolvedValueOnce queues,
  // preventing leftover "once" return values from leaking between tests.
  jest.resetAllMocks();
  // Default: valid auth for all tests (overridden per-test when needed)
  (getUserFromHeader as jest.Mock).mockResolvedValue(SUPABASE_USER);
  (getAppUser as jest.Mock).mockResolvedValue(ME);
  // Default: DB writes succeed silently
  (prisma.letter.update as jest.Mock).mockResolvedValue({});
  (prisma.dailyQuota.upsert as jest.Mock).mockResolvedValue({});
  // Default: rate limiter passes (reset by resetAllMocks, so must be re-set)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ratelimit = require("@/lib/ratelimit") as {
    sendLimiter: { limit: jest.Mock };
    authLimiter: { limit: jest.Mock };
  };
  ratelimit.sendLimiter.limit.mockResolvedValue({ success: true });
  ratelimit.authLimiter.limit.mockResolvedValue({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Quota enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("Quota enforcement", () => {
  const req = () => makeReq(undefined, { authorization: "Bearer token" });
  const params = { params: { id: DRAFT_LETTER.id } };

  it("rejects the 4th send when daily quota is exhausted (sent_count = 3)", async () => {
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(DRAFT_LETTER);
    (prisma.dailyQuota.findUnique as jest.Mock).mockResolvedValue({ sent_count: 3 });

    const res = await sendLetter(req(), params);

    expect(res.status).toBe(429);
    const body = await res.json() as { error?: string };
    expect(body.error).toMatch(/3 letters today/);
    // DB transaction must NOT have been called
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows send when quota is at 2 out of 3", async () => {
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(DRAFT_LETTER);
    (prisma.dailyQuota.findUnique as jest.Mock).mockResolvedValue({ sent_count: 2 });
    setupTransaction();

    const res = await sendLetter(req(), params);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("allows send when no quota record exists yet (first send of the day)", async () => {
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(DRAFT_LETTER);
    (prisma.dailyQuota.findUnique as jest.Mock).mockResolvedValue(null);
    setupTransaction();

    const res = await sendLetter(req(), params);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cron delivery
// ─────────────────────────────────────────────────────────────────────────────

describe("Cron delivery", () => {
  const CRON_SECRET = "test-cron-secret";
  const req = () =>
    makeReq(undefined, { authorization: `Bearer ${CRON_SECRET}` });

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    // Phase 0: no accounts to delete by default
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    // Step 1: no undeliverable letters by default
    (prisma.letter.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    // letter.findMany is set up per-test to avoid queue contamination
    setupTransaction();
  });

  it("marks a due letter DELIVERED and increments the delivered count", async () => {
    const recipientId = "recipient-id-1";
    const dueLetter = {
      id: "due-letter-id",
      senderId: ME.id,
      recipientUserId: recipientId,
    };

    // Step 2: no unrouted; Step 3: one due letter
    (prisma.letter.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // Step 2: no unrouted
      .mockResolvedValueOnce([dueLetter]); // Step 3: one due letter

    // No block
    (prisma.blockList.findFirst as jest.Mock).mockResolvedValue(null);
    // UNOPENED folder exists
    (prisma.folder.findFirst as jest.Mock).mockResolvedValue({ id: "folder-id" });
    // letterFolder upsert succeeds
    (prisma.letterFolder.upsert as jest.Mock).mockResolvedValue({});

    const res = await cronDeliver(req());
    const body = await res.json() as { delivered: number; blocked: number; deleted: number };

    expect(res.status).toBe(200);
    expect(body.delivered).toBe(1);
    expect(body.blocked).toBe(0);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cron blocking
// ─────────────────────────────────────────────────────────────────────────────

describe("Cron blocking", () => {
  const CRON_SECRET = "test-cron-secret";
  const req = () =>
    makeReq(undefined, { authorization: `Bearer ${CRON_SECRET}` });

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.letter.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    setupTransaction();
  });

  it("marks a due letter BLOCKED when sender is on recipient's block list", async () => {
    const blockedLetter = {
      id: "blocked-letter-id",
      senderId: "sender-id",
      recipientUserId: "recipient-id",
    };

    (prisma.letter.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // Step 2: no unrouted
      .mockResolvedValueOnce([blockedLetter]); // Step 3: one due letter

    // Recipient has blocked the sender
    (prisma.blockList.findFirst as jest.Mock).mockResolvedValue({ id: "block-id" });

    const res = await cronDeliver(req());
    const body = await res.json() as { delivered: number; blocked: number };

    expect(res.status).toBe(200);
    expect(body.blocked).toBe(1);
    expect(body.delivered).toBe(0);
    // Letter update to BLOCKED must have been called
    expect(prisma.letter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "blocked-letter-id" },
        data: { status: "BLOCKED" },
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Account deletion (cron Phase 0)
// ─────────────────────────────────────────────────────────────────────────────

describe("Cron account deletion (Phase 0)", () => {
  const CRON_SECRET = "test-cron-secret";
  const req = () =>
    makeReq(undefined, { authorization: `Bearer ${CRON_SECRET}` });

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    (prisma.letter.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.letter.findMany as jest.Mock).mockResolvedValue([]);
    setupTransaction();
  });

  it("deletes users whose markedForDeletionAt is past the 30-day grace period", async () => {
    const staleUser = { id: "stale-user-id" };

    // Phase 0: one user past 30-day grace
    (prisma.user.findMany as jest.Mock).mockResolvedValue([staleUser]);
    (prisma.user.delete as jest.Mock).mockResolvedValue({});

    const res = await cronDeliver(req());
    const body = await res.json() as { deleted: number };

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(1);
    expect(prisma.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: staleUser.id } })
    );
  });

  it("does not delete users still within the 30-day grace period", async () => {
    // Phase 0: no users past the cutoff
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.delete as jest.Mock).mockResolvedValue({});

    const res = await cronDeliver(req());
    const body = await res.json() as { deleted: number };

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(0);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cancel deletion
// ─────────────────────────────────────────────────────────────────────────────

describe("Cancel deletion", () => {
  const req = () => makeReq(undefined, { authorization: "Bearer token" });

  it("clears markedForDeletionAt and returns { success: true }", async () => {
    const meWithDeletion = {
      ...ME,
      markedForDeletionAt: "2025-01-01T00:00:00.000Z",
    };
    (getAppUser as jest.Mock).mockResolvedValue(meWithDeletion);
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...meWithDeletion,
      markedForDeletionAt: null,
    });

    const res = await cancelDelete(req());
    const body = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ME.id },
        data: { markedForDeletionAt: null },
      })
    );
  });

  it("is idempotent — returns { success: true } when account is not marked", async () => {
    // ME.markedForDeletionAt is already null
    (getAppUser as jest.Mock).mockResolvedValue(ME);

    const res = await cancelDelete(req());
    const body = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // No DB write needed
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Reply draft
// ─────────────────────────────────────────────────────────────────────────────

describe("Reply draft", () => {
  const ORIGINAL_SENDER = { id: "sender-id-2", username: "bob" };
  const ORIGINAL_LETTER = {
    id: "original-letter-id",
    senderId: ORIGINAL_SENDER.id,
    recipientUserId: ME.id,
    status: "DELIVERED",
    sender: ORIGINAL_SENDER,
  };
  const REPLY_DRAFT = { id: "reply-draft-id" };

  const req = () => makeReq(undefined, { authorization: "Bearer token" });
  const params = { params: { id: ORIGINAL_LETTER.id } };

  it("creates a DRAFT pre-addressed to the original letter's sender", async () => {
    (prisma.letter.findFirst as jest.Mock).mockResolvedValue(ORIGINAL_LETTER);
    (prisma.letter.create as jest.Mock).mockResolvedValue(REPLY_DRAFT);

    const res = await replyLetter(req(), params);
    const body = await res.json() as { draftLetterId: string };

    expect(res.status).toBe(201);
    expect(body.draftLetterId).toBe(REPLY_DRAFT.id);

    // Verify the draft is pre-addressed to the original sender
    expect(prisma.letter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderId: ME.id,
          recipientUserId: ORIGINAL_SENDER.id,
          addressingInputType: "USERNAME",
          addressingInputValue: ORIGINAL_SENDER.username,
          in_reply_to: ORIGINAL_LETTER.id,
          status: "DRAFT",
        }),
      })
    );
  });

  it("returns 404 when the letter is not delivered to the current user", async () => {
    (prisma.letter.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await replyLetter(req(), params);

    expect(res.status).toBe(404);
    expect(prisma.letter.create).not.toHaveBeenCalled();
  });

  it("returns 403 when the user's account is scheduled for deletion", async () => {
    (getAppUser as jest.Mock).mockResolvedValue({
      ...ME,
      markedForDeletionAt: "2025-01-01T00:00:00.000Z",
    });

    const res = await replyLetter(req(), params);

    expect(res.status).toBe(403);
    expect(prisma.letter.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Pen pal deduplication
// ─────────────────────────────────────────────────────────────────────────────

describe("Pen pal deduplication", () => {
  const CANDIDATE = {
    id: "candidate-id",
    username: "charlie",
    timezone: "UTC",
    region: "US",
  };

  const req = () => makeReq(undefined, { authorization: "Bearer token" });

  it("returns 404 when all candidates have already been matched with the requester", async () => {
    // Match history shows ME was already matched with CANDIDATE
    (prisma.matchHistory.findMany as jest.Mock).mockResolvedValue([
      { userId1: ME.id, userId2: CANDIDATE.id },
    ]);
    // Candidate appears in the eligible pool from DB
    (prisma.user.findMany as jest.Mock).mockResolvedValue([CANDIDATE]);
    // After deduplication, pool is empty → 404

    const res = await penPalMatch(req());
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/No pen pal matches found/);
    // Transaction must NOT have been called (no match was selected)
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates a MatchHistory record and DRAFT when a valid match is found", async () => {
    // No previous matches
    (prisma.matchHistory.findMany as jest.Mock).mockResolvedValue([]);
    // One eligible candidate
    (prisma.user.findMany as jest.Mock).mockResolvedValue([CANDIDATE]);
    (prisma.letter.create as jest.Mock).mockResolvedValue({ id: "draft-id" });
    (prisma.matchHistory.create as jest.Mock).mockResolvedValue({});
    setupTransaction();

    const res = await penPalMatch(req());
    const body = await res.json() as { draftLetterId: string };

    expect(res.status).toBe(200);
    expect(body.draftLetterId).toBe("draft-id");
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("returns 409 when the user is not opted into pen pal matching", async () => {
    (getAppUser as jest.Mock).mockResolvedValue({
      ...ME,
      availableForPenPalMatching: false,
    });

    const res = await penPalMatch(req());

    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Authorization — cross-user access and unauthenticated requests (SPEC §9)
// ─────────────────────────────────────────────────────────────────────────────

describe("Authorization", () => {
  const USER_B_LETTER_ID = "user-b-letter-id";
  const params = { params: { id: USER_B_LETTER_ID } };

  it("GET /api/letters/:id — returns 404 when authenticated user is neither sender nor recipient", async () => {
    // User A is authenticated; letter belongs to User B (different senderId and recipientUserId)
    // The handler fetches by ID (findUnique), then checks ownership in code — mismatched user → 404
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue({
      id: USER_B_LETTER_ID,
      senderId: "user-b-id",
      recipientUserId: "user-b-id",
      status: "DELIVERED",
      sender: { username: "userb" },
      images: [],
      folderEntry: null,
    });

    const req = makeReq(undefined, { authorization: "Bearer token" });
    const res = await getLetter(req, params);

    expect(res.status).toBe(404);
    // DB was queried by ID, but authorization check (senderId/recipientUserId = me) failed
    expect(prisma.letter.findUnique).toHaveBeenCalled();
  });

  it("DELETE /api/letters/:id — returns 404 when authenticated user is not the draft's sender", async () => {
    // User A is authenticated; draft belongs to User B
    (prisma.letter.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq(undefined, { authorization: "Bearer token" });
    const res = await deleteLetter(req, params);

    expect(res.status).toBe(404);
    expect(prisma.letter.findFirst).toHaveBeenCalled();
  });

  it("GET /api/me — returns 401 for requests with no Authorization header", async () => {
    (getUserFromHeader as jest.Mock).mockResolvedValue(null);

    const req = makeReq(undefined); // no authorization header
    const res = await getMe(req);

    expect(res.status).toBe(401);
    // No DB access should occur before returning 401
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("GET /api/letters/:id — returns 401 for requests with no Authorization header", async () => {
    (getUserFromHeader as jest.Mock).mockResolvedValue(null);

    const req = makeReq(undefined); // no authorization header
    const res = await getLetter(req, params);

    expect(res.status).toBe(401);
    // No DB access should occur before returning 401 (GET handler uses findUnique)
    expect(prisma.letter.findUnique).not.toHaveBeenCalled();
  });

  it("DELETE /api/letters/:id — returns 401 for unauthenticated requests", async () => {
    (getUserFromHeader as jest.Mock).mockResolvedValue(null);

    const req = makeReq(undefined); // no authorization header
    const res = await deleteLetter(req, params);

    expect(res.status).toBe(401);
    expect(prisma.letter.findFirst).not.toHaveBeenCalled();
  });
});
