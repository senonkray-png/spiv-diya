import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  // The Prisma 7 adapter constructor accepts `{ adapter }` but the public types
  // for this combination are still limited; cast through unknown so callers
  // get a fully-typed PrismaClient.
  return new (PrismaClient as unknown as new (args: { adapter: unknown }) => PrismaClient)({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
