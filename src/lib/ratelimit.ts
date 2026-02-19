/**
 * @file src/lib/ratelimit.ts
 * Rate limiting helpers using Upstash Redis + @upstash/ratelimit.
 *
 * Three rate limiters are exported:
 *   - `identifierLookupLimiter` — 10 req/hour per IP (email/phone/address lookup)
 *   - `sendLimiter`             — 5 req/hour per user (beyond daily quota, prevents rapid retries)
 *   - `authLimiter`             — 5 req/15 min per IP (login/signup)
 *
 * Usage pattern in API routes:
 *   const { success } = await identifierLookupLimiter.limit(ip);
 *   if (!success) return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
 *
 * IMPORTANT: Never expose the specific limit threshold in the error response.
 *
 * TODO (Session 5): Wire into relevant API routes.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ===== Redis client =====

/**
 * Lazily-created Redis client for Upstash.
 * Throws at runtime (not build time) if env vars are missing, so the app can
 * still build without Upstash configured (useful for local dev without Redis).
 */
function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Upstash env vars: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for rate limiting."
    );
  }

  return new Redis({ url, token });
}

// ===== Rate limiters =====

/**
 * Rate limiter for the identifier lookup endpoint (email/phone/address).
 * Limit: 10 requests per hour per IP address.
 *
 * Anti-enumeration: the endpoint always returns a generic "If an account
 * exists, we'll route it." response — rate limiting prevents bulk scanning.
 */
export const identifierLookupLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "rl:lookup",
});

/**
 * Rate limiter for the send letter endpoint.
 * Limit: 5 requests per hour per user ID (in addition to the 3/day daily quota).
 * Prevents rapid retry attacks that circumvent the quota check.
 */
export const sendLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "rl:send",
});

/**
 * Rate limiter for login and signup endpoints.
 * Limit: 5 requests per 15 minutes per IP address.
 */
export const authLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:auth",
});

// ===== Helpers =====

/**
 * Extracts the client IP from a Next.js request for use as a rate-limit key.
 * Falls back to a fixed string if no IP is detectable (e.g., local dev).
 *
 * @param req - The incoming Next.js Request object
 * @returns IP address string to use as the rate-limit identifier
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
