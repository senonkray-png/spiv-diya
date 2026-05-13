import { prisma } from "@/lib/db";
import { MARKETPLACE_CATALOG, getCategoryLabelUa } from "@/lib/marketplace-taxonomy";

export type InterestChip = {
  slug: string;
  labelUa: string;
  imageUrl: string | null;
  href: string;
};

const DEFAULT_SLUGS = ["electronics", "home_garden", "food_drinks", "beauty_health", "clothing_shoes"];

function bump(map: Map<string, number>, slug: string, delta: number) {
  if (!slug || slug === "other") return;
  map.set(slug, (map.get(slug) ?? 0) + delta);
}

/** Рядок «Тебе зацікавить»: змішує перегляди, обране, профіль і популярність каталогу. */
export async function getPersonalizedInterestChips(
  userId: string | null,
  take = 10,
): Promise<InterestChip[]> {
  const weights = new Map<string, number>();

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        marketplaceBrowseCategories: true,
        interests: true,
        businessNiche: true,
        industry: true,
      },
    });
    if (user) {
      for (const slug of user.marketplaceBrowseCategories) {
        bump(weights, slug, 6);
      }
      const blob = [user.businessNiche, user.industry, ...user.interests].filter(Boolean).join(" ").toLowerCase();
      for (const c of MARKETPLACE_CATALOG) {
        if (c.slug === "other") continue;
        for (const kw of c.keywords) {
          if (kw && blob.includes(kw.toLowerCase())) {
            bump(weights, c.slug, 2);
            break;
          }
        }
      }
      const favs = await prisma.favorite.findMany({
        where: { ownerId: userId, productId: { not: null } },
        take: 40,
        include: { product: { select: { catalogCategory: true } } },
      });
      for (const f of favs) {
        const slug = f.product?.catalogCategory;
        if (slug) bump(weights, slug, 5);
      }
    }
  }

  const grouped = await prisma.product.groupBy({
    by: ["catalogCategory"],
    where: { status: "active", catalogCategory: { not: null } },
    _count: { _all: true },
  });
  for (const g of grouped) {
    const slug = g.catalogCategory;
    if (!slug) continue;
    bump(weights, slug, Math.min(8, g._count._all));
  }

  let ordered = [...weights.entries()]
    .filter(([slug]) => MARKETPLACE_CATALOG.some((c) => c.slug === slug))
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);

  if (ordered.length === 0) {
    ordered = [...DEFAULT_SLUGS];
  }

  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const s of ordered) {
    if (seen.has(s) || s === "other") continue;
    seen.add(s);
    slugs.push(s);
    if (slugs.length >= take) break;
  }
  for (const s of MARKETPLACE_CATALOG.map((c) => c.slug)) {
    if (slugs.length >= take) break;
    if (s === "other" || seen.has(s)) continue;
    seen.add(s);
    slugs.push(s);
  }

  const chips: InterestChip[] = [];
  for (const slug of slugs.slice(0, take)) {
    const rep = await prisma.product.findFirst({
      where: { status: "active", catalogCategory: slug, photos: { isEmpty: false } },
      orderBy: { views: "desc" },
      select: { photos: true },
    });
    chips.push({
      slug,
      labelUa: getCategoryLabelUa(slug),
      imageUrl: rep?.photos[0] ?? null,
      href: `/marketplace?cat=${encodeURIComponent(slug)}`,
    });
  }
  return chips;
}

export async function appendUserBrowseCategory(userId: string, catalogSlug: string | null) {
  if (!catalogSlug || catalogSlug === "other") return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { marketplaceBrowseCategories: true },
  });
  if (!user) return;
  const prev = user.marketplaceBrowseCategories ?? [];
  const next = [...prev.filter((s) => s !== catalogSlug), catalogSlug].slice(-24);
  await prisma.user.update({
    where: { id: userId },
    data: { marketplaceBrowseCategories: next },
  });
}
