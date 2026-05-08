import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/market/ProductCard";
import { ServiceCard } from "@/components/market/ServiceCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function MarketplaceHome() {
  const [products, services, partners, stats] = await Promise.all([
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.serviceAd.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.user.findMany({
      where: { acceptsPartners: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        companyName: true,
        city: true,
        industry: true,
        avatarUrl: true,
        businessNiche: true,
        interests: true,
        verified: true,
      },
    }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.product.count({ where: { status: "active" } }),
      prisma.serviceAd.count({ where: { status: "active" } }),
    ]),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white">
        <p className="text-sm font-medium opacity-90 mb-2">Маркетплейс кооперації</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          Знайдіть товари, послуги
          <br />
          і партнерів для бізнесу
        </h1>
        <p className="mt-4 text-blue-100 text-base md:text-lg max-w-2xl">
          Розмістіть свої товари за пару хвилин або імпортуйте їх із власного сайту. Знайдіть тих, хто
          доповнить вас і допоможе вирости.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Безкоштовна реєстрація
          </Link>
          <Link
            href="/marketplace/products"
            className="bg-blue-500/40 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-blue-500/60 transition-colors backdrop-blur"
          >
            Дивитись каталог →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-md text-sm">
          <Stat label="Підприємств" value={stats[0]} />
          <Stat label="Товарів" value={stats[1]} />
          <Stat label="Послуг" value={stats[2]} />
        </div>
      </section>

      <Section title="Свіжі товари" href="/marketplace/products">
        {products.length === 0 ? (
          <p className="text-zinc-500 text-sm">Поки немає товарів. Будьте першими — додайте свій!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Послуги та запити" href="/marketplace/services">
        {services.length === 0 ? (
          <p className="text-zinc-500 text-sm">Будьте першими — опублікуйте послугу.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Партнери для кооперації" href="/marketplace/partners">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {partners.map((p) => (
            <Link
              key={p.id}
              href={`/u/${p.id}`}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-blue-400 hover:shadow-md transition-all flex items-start gap-3"
            >
              <Avatar src={p.avatarUrl} name={p.companyName} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-zinc-900 dark:text-white truncate">
                    {p.companyName}
                  </p>
                  {p.verified && <Badge variant="green" size="xs">✓</Badge>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {p.businessNiche || p.industry} · {p.city}
                </p>
                {p.interests && p.interests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.interests.slice(0, 3).map((i) => (
                      <Badge key={i} variant="blue" size="xs">
                        {i}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">{title}</h2>
        <Link href={href} className="text-sm font-medium text-blue-600 hover:underline">
          Усі →
        </Link>
      </div>
      {children}
    </section>
  );
}
