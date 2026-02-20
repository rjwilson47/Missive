/**
 * @file src/lib/prisma.ts
 * Singleton Prisma client for use across API routes.
 *
 * In Next.js development, hot reloading creates new module instances, which
 * would create multiple PrismaClient connections without this singleton pattern.
 * We attach the instance to `globalThis` so it survives hot reloads in dev.
 */

import { PrismaClient } from "@prisma/client";

// Extend the global object to hold the Prisma singleton in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Returns the shared PrismaClient instance.
 * Creates a new one if not already initialised (only happens once per process
 * in production; survives hot reloads in development via globalThis).
 */
const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  // Persist across hot reloads in development
  globalThis.__prisma = prisma;
}

export default prisma;
