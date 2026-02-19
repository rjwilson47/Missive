/**
 * @file src/lib/auth.ts
 * Authentication utilities for Missive.
 *
 * Supabase Auth flow summary:
 *   - Users log in with USERNAME + PASSWORD (no email shown in UI).
 *   - Internally, Supabase Auth uses a synthetic email:
 *       {supabase_user_id}@users.mailbox.invalid
 *   - On signup: create Supabase auth user (temp email) → update email to
 *     synthetic → insert app User row. Rollback auth user on any failure.
 *   - On login: resolve username → supabase_user_id via app DB →
 *     compute synthetic email → Supabase signInWithPassword.
 *   - Recovery email: stored in app DB only; optionally synced to Supabase
 *     auth email to enable password reset flow.
 *
 * TODO (Session 1): Implement — this is a Session 1 target.
 * See SPEC.md §2-A for full signup/login/recovery requirements.
 */

import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidIanaTimezone } from "@/lib/delivery";
import type { AppUser } from "@/types";

// ===== Constants =====

/** Domain used for synthetic Supabase auth emails. Never shown to users. */
const SYNTHETIC_EMAIL_DOMAIN = "users.mailbox.invalid";

// ===== Helpers =====

/**
 * Constructs the synthetic Supabase email for a given Supabase user ID.
 * Format: {supabase_user_id}@users.mailbox.invalid
 *
 * This email is an internal implementation detail — it is never displayed to
 * users and is not used for any outbound communication.
 *
 * @param supabaseUserId - The UUID from Supabase auth.users
 * @returns Synthetic email string
 */
export function buildSyntheticEmail(supabaseUserId: string): string {
  return `${supabaseUserId}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Normalises a username: lowercases and trims whitespace.
 * Does NOT validate length or character set — use validateUsername for that.
 *
 * @param username - Raw username input from the user
 * @returns Normalised username string
 */
export function normaliseUsername(username: string): string {
  return username.toLowerCase().trim();
}

/**
 * Validates a username against the rules in SPEC.md §5.
 *
 * Rules:
 *   - 3–20 characters
 *   - Lowercase letters, digits, underscores, hyphens only
 *   - Must start with a letter
 *
 * @param username - Already-normalised username
 * @returns null if valid, or a user-facing error string
 */
export function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }
  if (!/^[a-z][a-z0-9_-]*$/.test(username)) {
    return "Username may only contain lowercase letters, digits, underscores, and hyphens, and must start with a letter.";
  }
  return null;
}

// ===== Signup =====

export interface SignupInput {
  username: string;
  password: string;
  region: string;
  timezone: string;
}

export interface SignupResult {
  user: AppUser;
  /** Supabase session access token — client stores in Authorization header */
  accessToken: string;
}

/**
 * Creates a new Missive account.
 *
 * Steps (all-or-nothing — rolls back auth user if any step fails):
 *   1. Validate inputs (username, timezone).
 *   2. Check username uniqueness in app DB.
 *   3. Create Supabase auth user with temporary placeholder email.
 *   4. Update Supabase auth email to synthetic UUID-based email.
 *   5. Insert app User row in Postgres via Prisma.
 *   6. Sign in immediately to obtain a session token.
 *
 * @param input - Validated signup fields
 * @returns SignupResult with the new AppUser and an access token
 *
 * @throws Error with a user-safe message on validation or conflict failures
 */
export async function signupUser(input: SignupInput): Promise<SignupResult> {
  const { password, region, timezone } = input;
  const username = normaliseUsername(input.username);

  // --- Input validation ---
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);

  if (!isValidIanaTimezone(timezone)) {
    throw new Error("Invalid timezone. Please select from the list.");
  }

  if (!region || region.trim().length === 0) {
    throw new Error("Region is required.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  // --- Check username uniqueness before touching Supabase ---
  const existingUser = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error("Username already taken. Please try another.");
  }

  // --- Step 3: Create Supabase auth user with temp email ---
  const tempEmail = `temp-${crypto.randomUUID()}@${SYNTHETIC_EMAIL_DOMAIN}`;
  const { data: authData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      password,
      email_confirm: true, // skip email confirmation (we control the address)
    });

  if (createError || !authData.user) {
    throw new Error(`Failed to create account: ${createError?.message ?? "unknown error"}`);
  }

  const supabaseUserId = authData.user.id;

  // --- Rollback helper: delete the Supabase auth user on any downstream failure ---
  async function rollbackAuthUser() {
    try {
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    } catch {
      // Best-effort rollback; log but don't re-throw
      console.error(`[auth] Failed to rollback auth user ${supabaseUserId}`);
    }
  }

  // --- Step 4: Update email to synthetic UUID-based email ---
  const syntheticEmail = buildSyntheticEmail(supabaseUserId);
  const { error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(
    supabaseUserId,
    { email: syntheticEmail }
  );

  if (updateEmailError) {
    await rollbackAuthUser();
    throw new Error("Failed to configure account. Please try again.");
  }

  // --- Step 5: Insert app User row ---
  let appUser: AppUser;
  try {
    const dbUser = await prisma.user.create({
      data: {
        supabase_user_id: supabaseUserId,
        username,
        region: region.trim(),
        timezone,
      },
    });

    appUser = prismaUserToAppUser(dbUser);
  } catch (dbError: unknown) {
    await rollbackAuthUser();
    // Handle Prisma unique constraint violation (race condition on username)
    if (isPrismaUniqueError(dbError)) {
      throw new Error("Username already taken. Please try another.");
    }
    throw new Error("Failed to create account. Please try again.");
  }

  // --- Step 6: Sign in to get session token ---
  const { data: signInData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

  if (signInError || !signInData.session) {
    // Account created but sign-in failed — not ideal but not catastrophic.
    // User can log in manually. Don't rollback the account.
    console.error(`[auth] Signup succeeded but auto-login failed: ${signInError?.message}`);
    throw new Error("Account created. Please log in.");
  }

  return {
    user: appUser,
    accessToken: signInData.session.access_token,
  };
}

// ===== Login =====

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  user: AppUser;
  accessToken: string;
}

/**
 * Authenticates an existing user by username + password.
 *
 * Steps:
 *   1. Normalise username.
 *   2. Look up supabase_user_id in the app DB (username → UUID).
 *   3. Compute synthetic email from UUID.
 *   4. Call Supabase signInWithPassword with synthetic email + password.
 *
 * SECURITY: Always return the same generic error for any failure to prevent
 * username enumeration (don't reveal whether the username exists).
 *
 * @param input - Username and password
 * @returns LoginResult with the AppUser and access token
 *
 * @throws Error("Invalid username or password.") for any auth failure
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const username = normaliseUsername(input.username);

  // Generic error used for ALL failures (prevents enumeration)
  const authError = new Error("Invalid username or password.");

  // --- Resolve username → supabase_user_id ---
  const dbUser = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });

  // Don't reveal whether the username exists
  if (!dbUser) throw authError;

  // --- Compute synthetic email and authenticate with Supabase ---
  const syntheticEmail = buildSyntheticEmail(dbUser.supabase_user_id);
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: syntheticEmail,
    password: input.password,
  });

  if (error || !data.session) throw authError;

  return {
    user: prismaUserToAppUser(dbUser),
    accessToken: data.session.access_token,
  };
}

// ===== Session =====

/**
 * Looks up the app User record for an authenticated Supabase user.
 * Used in API routes after validating the JWT with getUserFromHeader().
 *
 * @param supabaseUserId - The `sub` claim from the Supabase JWT
 * @returns AppUser or null if no app record found (shouldn't happen in practice)
 */
export async function getAppUser(supabaseUserId: string): Promise<AppUser | null> {
  const dbUser = await prisma.user.findUnique({
    where: { supabase_user_id: supabaseUserId },
  });
  return dbUser ? prismaUserToAppUser(dbUser) : null;
}

// ===== Helpers =====

/**
 * Maps a Prisma User record to the public AppUser shape.
 * Excludes internal fields (supabase_user_id, recovery_email).
 *
 * @param dbUser - Raw Prisma User record
 * @returns AppUser safe to return in API responses
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prismaUserToAppUser(dbUser: any): AppUser {
  return {
    id: dbUser.id,
    username: dbUser.username,
    region: dbUser.region,
    timezone: dbUser.timezone,
    discoverableByEmail: dbUser.discoverableByEmail,
    discoverableByPhone: dbUser.discoverableByPhone,
    discoverableByAddress: dbUser.discoverableByAddress,
    availableForPenPalMatching: dbUser.availableForPenPalMatching,
    penPalMatchPreference: dbUser.penPalMatchPreference,
    markedForDeletionAt: dbUser.markedForDeletionAt?.toISOString() ?? null,
    createdAt: dbUser.created_at?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Returns true if the given error is a Prisma unique constraint violation (P2002).
 *
 * @param error - Any thrown value
 */
function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
