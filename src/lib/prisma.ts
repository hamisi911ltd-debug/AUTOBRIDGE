import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaClient } from "@/generated/prisma/client";

type CloudflareEnv = { DB?: unknown };

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Deployed (Cloudflare Workers via OpenNext) uses the D1 binding; local
 * `next dev` (plain Node, no Workers runtime) falls back to the SQLite file
 * via better-sqlite3. getCloudflareContext() only resolves real bindings
 * once called from inside a request's execution scope, so this must stay
 * lazy — never called at module top-level — which is why `prisma` below is
 * a Proxy instead of a plain client instance.
 */
function createPrismaClient(): PrismaClient {
  try {
    const { env } = getCloudflareContext() as { env: CloudflareEnv };
    if (env?.DB) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- D1Database type comes from @cloudflare/workers-types, not worth pulling in just for this cast
      const adapter = new PrismaD1(env.DB as any);
      return new PrismaClient({ adapter });
    }
  } catch {
    // Not running on Cloudflare (e.g. local `next dev`) — fall through to SQLite.
  }

  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

function resolveClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveClient() as object, prop, receiver);
  },
});
