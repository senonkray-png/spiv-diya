"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface HomeHeroProps {
  companies: number;
  products: number;
  services: number;
}

export function HomeHero({ companies, products, services }: HomeHeroProps) {
  const reduce = useReducedMotion();
  const t = useTranslations("hero");
  return (
    <motion.section
      className="relative overflow-hidden border-b border-border/60"
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.12 },
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
          })}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(26,75,132,0.14),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(249,212,35,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(61,127,196,0.2),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(249,212,35,0.06),transparent)]"
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/90 px-4 py-1.5 shadow-sm backdrop-blur-sm dark:border-primary/25">
            <Sparkles className="size-3.5 text-primary shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("badge")}
            </span>
          </div>

          <h1 className="text-[2.125rem] font-bold tracking-tight text-foreground leading-[1.1] sm:text-5xl lg:text-[3.25rem]">
            {t("title")}
            <span className="text-primary dark:text-[#79b8ed]">{t("titleAccent")}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground leading-relaxed">
            {t("hint")}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/marketplace"
              className="group inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-base font-semibold text-card-foreground shadow-card transition-[transform,box-shadow] hover:shadow-card-hover motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100 active:scale-[0.98] sm:flex-initial md:min-w-[200px]"
            >
              <Layers className="size-5 text-primary" aria-hidden />
              {t("ctaFind")}
              <ArrowRight className="size-4 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-[transform,box-shadow] hover:bg-primary-hover hover:shadow-lg motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100 active:scale-[0.98] sm:flex-initial md:min-w-[200px]"
            >
              {t("ctaOffer")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-3 border-t border-border/60 pt-10 sm:max-w-md">
            <StatChip label={t("statsCompanies")} value={companies} />
            <StatChip label={t("statsProducts")} value={products} />
            <StatChip label={t("statsServices")} value={services} />
          </div>
        </div>

        {/* Візуальний блок */}
        <div className="relative lg:justify-self-end w-full max-w-lg mx-auto lg:mx-0">
          <div className="rounded-3xl border border-border/80 bg-card/80 p-6 shadow-card backdrop-blur-md dark:bg-card/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">Екосистема СпівДія</p>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">
                  Каталог, партнерства й внутрішні розрахунки в одній стрічці.
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent/35 text-accent-foreground dark:bg-accent/25">
                <ShieldCheck className="size-6" aria-hidden />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { t: "Публічний маркетплейс", s: "Товари · послуги · пости про запити" },
                { t: "Партнерства без зайвого", s: "Запрошення, обране, повідомлення" },
              ].map((row) => (
                <div
                  key={row.t}
                  className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 dark:bg-muted/20"
                >
                  <p className="font-medium text-card-foreground text-sm">{row.t}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{row.s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Декоративні пластини */}
          <div className="absolute -right-4 top-12 hidden lg:block rounded-2xl border border-accent/35 bg-accent/25 px-4 py-3 text-accent-foreground shadow-md dark:border-accent/20 dark:bg-accent/15 dark:text-accent-foreground">
            <p className="text-xs font-bold uppercase tracking-wide">Співкооперація</p>
            <p className="text-[11px] opacity-90">B2B · Україна</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/50 px-2 py-3 text-center shadow-sm backdrop-blur-sm dark:bg-muted/25">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
