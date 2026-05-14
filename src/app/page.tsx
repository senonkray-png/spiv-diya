import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/market/ProductCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HomeHero } from "@/components/marketing/HomeHero";
import { HomeCapabilitiesBento } from "@/components/marketing/HomeCapabilitiesBento";
import { RevealSection } from "@/components/motion/RevealSection";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  const t = await getTranslations();
  if (session) {
    redirect("/marketplace");
  }

  const [products, stats] = await Promise.all([
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.product.count({ where: { status: "active" } }),
      prisma.serviceAd.count({ where: { status: "active" } }),
    ]),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthenticated={false} />

      <HomeHero companies={stats[0]} products={stats[1]} services={stats[2]} />

      {/* Features */}
      <RevealSection as="section" className="mx-auto max-w-7xl border-t border-border/60 px-4 py-14 md:px-6 md:py-20">
        <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {t("howItWorks.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground leading-relaxed">
          {t("howItWorks.subtitle")}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {[
            { step: "01", title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
            { step: "02", title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
            { step: "03", title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
          ].map((f) => (
            <div
              key={f.step}
              className="rounded-2xl border border-border bg-card p-6 shadow-card transition-[box-shadow,transform] motion-safe:hover:scale-[1.01] hover:shadow-card-hover motion-reduce:hover:scale-100"
            >
              <p className="font-mono text-sm font-bold tabular-nums text-primary">{f.step}</p>
              <h3 className="mt-3 text-lg font-semibold text-card-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      <HomeCapabilitiesBento />

      {/* Sample products */}
      {products.length > 0 && (
        <RevealSection
          as="section"
          className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20 border-t border-border/60"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("fresh.title")}
            </h2>
            <Link
              href="/marketplace/products"
              className="text-sm font-semibold text-primary transition-transform motion-safe:hover:scale-[1.03] motion-reduce:hover:scale-100 hover:underline"
            >
              {t("fresh.allProducts")}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </RevealSection>
      )}

      {/* CTA */}
      <RevealSection as="section" className="bg-primary py-16 md:py-20 mt-2">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="mb-8 text-base leading-relaxed text-primary-foreground/85 md:text-lg">
            {t("cta.subtitle")}
          </p>
          <Link
            href="/register"
            className="inline-flex items-center rounded-xl bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md transition-[transform,box-shadow,filter] motion-safe:hover:scale-[1.03] hover:brightness-95 active:scale-[0.98] motion-reduce:hover:scale-100 md:px-8 md:py-4 md:text-lg"
          >
            {t("cta.button")}
          </Link>
        </div>
      </RevealSection>

      <SiteFooter />
    </div>
  );
}
