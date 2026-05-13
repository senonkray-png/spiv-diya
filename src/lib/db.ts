import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Set it in Vercel → Project → Settings → Environment Variables (Production & Preview).",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  // The Prisma 7 adapter constructor accepts `{ adapter }` but the public types
  // for this combination are still limited; cast through unknown so callers
  // get a fully-typed PrismaClient.
  return new (PrismaClient as unknown as new (args: { adapter: unknown }) => PrismaClient)({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Один клієнт на інстанс serverless (Vercel) — зменшує ризик вичерпання з’єднань. */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());
