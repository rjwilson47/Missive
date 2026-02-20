/**
 * @file src/lib/prisma.ts
 * Singleton Prisma client for use across API routes.
 *
 * In Next.js development, hot reloading creates new module instances, which
 * would create multiple PrismaClient connections without this singleton pattern.
 * We attach the instance to `globalThis` so it survives hot reloads in dev.
 *
 * The client is initialised lazily (on first property access) so that importing
 * this module during Next.js build-time static analysis never triggers a
 * PrismaClientInitializationError when DATABASE_URL is absent from the build env.
 */

import { PrismaClient } from "@prisma/client";

// Extend the global object to hold the Prisma singleton in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function getPrismaClient(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma;
  const client = new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = client;
  }
  return client;
}

/**
 * Lazy Prisma client proxy.
 * `new PrismaClient()` is deferred until the first property access, so module
 * import at build time never triggers a PrismaClientInitializationError.
 */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaClient() as unknown as Record<PropertyKey, unknown>)[prop];
  },
});

export default prisma;
