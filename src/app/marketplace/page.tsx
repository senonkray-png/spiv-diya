import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ProductCard } from "@/components/market/ProductCard";
import { MarketplaceHeroBanner } from "@/components/marketplace/MarketplaceHeroBanner";
import { MarketplaceInterestRow } from "@/components/marketplace/MarketplaceInterestRow";
import { MarketplaceSortFilters } from "@/components/marketplace/MarketplaceSortFilters";
import {
  fetchMarketplaceProductFeed,
  type MarketplaceSort,
} from "@/lib/marketplace-home-products";
import { getPersonalizedInterestChips } from "@/lib/marketplace-personalization";
import { isCatalogCategorySlug } from "@/lib/marketplace-taxonomy";

export const dynamic = "force-dynamic";

const SORT_IDS: MarketplaceSort[] = ["new", "expensive", "cheap", "popular", "sale"];

interface PageProps {
  searchParams: Promise<{ sort?: string; cat?: string }>;
}

export default async function MarketplaceHome({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawSort = sp.sort ?? "new";
  const sort: MarketplaceSort = SORT_IDS.includes(rawSort as MarketplaceSort)
    ? (rawSort as MarketplaceSort)
    : "new";
  const catRaw = sp.cat?.trim() ?? "";
  const catalogCategory = catRaw && isCatalogCategorySlug(catRaw) ? catRaw : null;

  const session = await getSession();
  const viewer = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { companyName: true },
      })
    : null;

  const [chips, products] = await Promise.all([
    getPersonalizedInterestChips(session?.userId ?? null, 10),
    fetchMarketplaceProductFeed({ catalogCategory, sort, limit: 48 }),
  ]);

  const firstName = viewer?.companyName?.split(/\s+/)[0]?.trim();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {firstName && (
        <p className="text-center text-sm md:text-base text-zinc-600 dark:text-zinc-400 mb-4">
          Привіт, <span className="font-semibold text-zinc-900 dark:text-white">{firstName}</span>!
          <span className="hidden sm:inline"> Чудовий день для покупок.</span>
        </p>
      )}

      <MarketplaceHeroBanner />

      <MarketplaceInterestRow chips={chips} />

      <section className="mt-10 md:mt-12">
        <div className="text-center">
          <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-white">
            {catalogCategory ? `Товари: каталог` : "Усі товари від продавців"}
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">
            Сортування за ціною враховує гривню або СпівМонети, якщо ціни в ₴ немає
          </p>
          <MarketplaceSortFilters activeSort={sort} catalogCategory={catalogCategory} />
        </div>

        {products.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm mt-8">Поки немає товарів у цій вибірці.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <nav className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-violet-700 dark:text-violet-300">
        <Link href="/marketplace/services" className="hover:underline">
          Послуги
        </Link>
        <Link href="/marketplace/partners" className="hover:underline">
          Партнери
        </Link>
        <Link href="/marketplace/posts" className="hover:underline">
          Пости
        </Link>
        <Link href="/marketplace/products" className="hover:underline">
          Повний каталог
        </Link>
      </nav>
    </div>
  );
}
