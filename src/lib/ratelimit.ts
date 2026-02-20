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
 * Creates a Redis client for Upstash.
 * Throws at call time if env vars are missing — called only from inside
 * makeLazy() factories, which run on first `.limit()` call (inside a request
 * handler), never at module load / build time.
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

// ===== Lazy factory =====

/**
 * Wraps a Ratelimit factory in a Proxy so the real instance is only created
 * on first property access (i.e. the first `.limit()` call inside a request
 * handler). This prevents getRedis() — and thus env-var validation — from
 * running at module load / Next.js build time.
 */
function makeLazy(factory: () => Ratelimit): Ratelimit {
  let instance: Ratelimit | undefined;
  return new Proxy({} as Ratelimit, {
    get(_target, prop) {
      if (!instance) instance = factory();
      return (instance as unknown as Record<PropertyKey, unknown>)[prop];
    },
  });
}

// ===== Rate limiters =====

/**
 * Rate limiter for the identifier lookup endpoint (email/phone/address).
 * Limit: 10 requests per hour per IP address.
 *
 * Anti-enumeration: the endpoint always returns a generic "If an account
 * exists, we'll route it." response — rate limiting prevents bulk scanning.
 */
export const identifierLookupLimiter = makeLazy(() =>
  new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:lookup",
  })
);

/**
 * Rate limiter for the send letter endpoint.
 * Limit: 5 requests per hour per user ID (in addition to the 3/day daily quota).
 * Prevents rapid retry attacks that circumvent the quota check.
 */
export const sendLimiter = makeLazy(() =>
  new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "rl:send",
  })
);

/**
 * Rate limiter for login and signup endpoints.
 * Limit: 20 requests per 15 minutes per IP address.
 * Generous enough for real users (typos, multiple devices) while
 * still blocking brute-force attacks.
 */
export const authLimiter = makeLazy(() =>
  new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "15 m"),
    prefix: "rl:auth",
  })
);

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
