import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type MarketplaceSort = "new" | "expensive" | "cheap" | "popular" | "sale";

const ownerSelect = {
  id: true,
  companyName: true,
  avatarUrl: true,
  verified: true,
} as const;

function primaryPrice(p: { priceUAH: number | null; priceTokens: number }): number {
  return p.priceUAH ?? p.priceTokens;
}

export async function fetchMarketplaceProductFeed(options: {
  catalogCategory?: string | null;
  sort?: MarketplaceSort | null;
  limit?: number;
}) {
  const limit = Math.min(120, Math.max(12, options.limit ?? 48));
  const sort = options.sort ?? "new";
  const cat = options.catalogCategory?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: "active" };
  if (cat) where.catalogCategory = cat;
  if (sort === "sale") where.isPromotional = true;

  if (sort === "new" || sort === "sale") {
    return prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { owner: { select: ownerSelect } },
    });
  }

  if (sort === "popular") {
    return prisma.product.findMany({
      where,
      orderBy: { views: "desc" },
      take: limit,
      include: { owner: { select: ownerSelect } },
    });
  }

  const rows = await prisma.product.findMany({
    where,
    take: 200,
    include: { owner: { select: ownerSelect } },
  });

  const copy = [...rows];
  if (sort === "expensive") {
    copy.sort((a, b) => primaryPrice(b) - primaryPrice(a));
  } else {
    copy.sort((a, b) => primaryPrice(a) - primaryPrice(b));
  }
  return copy.slice(0, limit);
}

export type MarketplaceProductRow = Prisma.ProductGetPayload<{
  include: { owner: { select: typeof ownerSelect } };
}>;
