import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/market/ProductCard";
import { ServiceCard } from "@/components/market/ServiceCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function MarketplaceSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  if (!term) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <EmptyState
          title="Введіть запит"
          description="Оберіть «Усе» в шапці, введіть слова й натисніть пошук — тут з’являться товари та послуги."
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/marketplace" className="text-primary hover:underline">
            На головну маркетплейсу
          </Link>
        </p>
      </div>
    );
  }

  const whereText = {
    OR: [
      { title: { contains: term, mode: "insensitive" as const } },
      { description: { contains: term, mode: "insensitive" as const } },
    ],
  };

  const [products, services] = await Promise.all([
    prisma.product.findMany({
      where: { status: "active", ...whereText },
      orderBy: { createdAt: "desc" },
      take: 48,
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.serviceAd.findMany({
      where: { status: "active", ...whereText },
      orderBy: { createdAt: "desc" },
      take: 48,
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true, city: true } },
      },
    }),
  ]);

  const hasAny = products.length > 0 || services.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <h1 className="text-center text-xl font-bold text-foreground md:text-2xl">
        Пошук: «{term}»
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Товари та послуги одночасно
      </p>

      {!hasAny ? (
        <div className="mt-10">
          <EmptyState
            title="Нічого не знайдено"
            description="Спробуйте інші слова або перегляньте каталоги окремо."
          />
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <Link href={`/marketplace/products?q=${encodeURIComponent(term)}`} className="text-primary hover:underline">
              Лише товари
            </Link>
            <Link href={`/marketplace/services?q=${encodeURIComponent(term)}`} className="text-primary hover:underline">
              Лише послуги
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {products.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Товари ({products.length})</h2>
                <Link
                  href={`/marketplace/products?q=${encodeURIComponent(term)}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Усі результати товарів →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {services.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Послуги ({services.length})</h2>
                <Link
                  href={`/marketplace/services?q=${encodeURIComponent(term)}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Усі результати послуг →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
