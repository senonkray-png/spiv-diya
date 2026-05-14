"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HeaderMarketplaceSearch } from "@/components/layout/HeaderMarketplaceSearch";
import { MarketplaceHeaderIconRail } from "@/components/layout/MarketplaceHeaderQuickNav";

export interface SiteHeaderNavItem {
  href: string;
  label: string;
}

export interface SiteHeaderProps {
  /** Якщо є — таби маркетплейсу (огляд, товари…). На головній зазвичай порожньо */
  tabs?: SiteHeaderNavItem[];
  /** Чи залогінений користувач (з server layout/page) */
  isAuthenticated?: boolean;
  /** Рядок пошуку в шапці (за замовчуванням — увімкнено, коли є таби маркетплейсу) */
  showMarketplaceSearch?: boolean;
}

export function SiteHeader({
  tabs = [],
  isAuthenticated = false,
  showMarketplaceSearch: showSearchProp,
}: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const [overlayTopPx, setOverlayTopPx] = useState(120);

  const showSearch = showSearchProp ?? tabs.length > 0;

  const measureHeader = useCallback(() => {
    const el = headerRef.current;
    if (el) setOverlayTopPx(Math.ceil(el.getBoundingClientRect().height));
  }, []);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    measureHeader();
  }, [measureHeader, open, showSearch, tabs.length]);

  useEffect(() => {
    if (!mounted) return;
    measureHeader();
    window.addEventListener("resize", measureHeader);
    return () => window.removeEventListener("resize", measureHeader);
  }, [mounted, measureHeader]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cabinetHref = isAuthenticated ? "/dashboard" : "/login";

  const linkClass =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap";
  const linkClassActiveAccent =
    "text-sm font-semibold text-foreground underline-offset-4 hover:underline whitespace-nowrap";

  const hasSubRow = showSearch || tabs.length > 0;

  const mobileMenu =
    mounted &&
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id="mobile-menu"
        className="fixed inset-x-0 bottom-0 z-[45] md:hidden"
        style={{ top: overlayTopPx }}
        role="dialog"
        aria-modal="true"
        aria-label="Меню"
      >
        <button
          type="button"
          className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
          aria-label="Закрити меню"
          onClick={() => setOpen(false)}
        />
        <aside className="absolute right-0 top-0 bottom-0 flex w-[min(20rem,calc(100vw-1rem))] flex-col gap-4 overflow-y-auto border-l border-border bg-background p-5 shadow-2xl">
          {tabs.length > 0 && (
            <nav className="flex flex-col gap-0.5 border-b border-border/60 pb-4" aria-label="Розділи маркетплейсу">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Маркетплейс</p>
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`${linkClass} rounded-lg px-3 py-2.5 hover:bg-muted`}
                  onClick={() => setOpen(false)}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          )}
          <nav className="flex flex-col gap-1" aria-label="Мобільна навігація">
            {!tabs.length && (
              <>
                <Link
                  href="/marketplace"
                  className={`${linkClass} rounded-xl px-3 py-3 hover:bg-muted`}
                  onClick={() => setOpen(false)}
                >
                  Маркетплейс
                </Link>
                <Link
                  href="/marketplace/products"
                  className={`${linkClass} rounded-xl px-3 py-3 hover:bg-muted`}
                  onClick={() => setOpen(false)}
                >
                  Каталог товарів
                </Link>
              </>
            )}
            <Link
              href={cabinetHref}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/70"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="size-5 shrink-0 text-primary" aria-hidden />
              Особистий кабінет
            </Link>
            {!isAuthenticated && (
              <>
                <Link
                  href="/login"
                  className={`${linkClass} rounded-xl px-3 py-3 hover:bg-muted`}
                  onClick={() => setOpen(false)}
                >
                  Увійти
                </Link>
                <Link
                  href="/register"
                  className={`${linkClassActiveAccent} mt-1 rounded-xl bg-primary px-4 py-3 text-center text-primary-foreground hover:no-underline`}
                  onClick={() => setOpen(false)}
                >
                  Зареєструватись
                </Link>
              </>
            )}
          </nav>
        </aside>
      </div>,
      document.body,
    );

  return (
    <>
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:border-border/40 dark:bg-background/65 dark:supports-[backdrop-filter]:bg-background/50 shadow-[inset_0_-1px_0_0_rgba(148,163,184,0.08)] dark:shadow-[inset_0_-1px_0_0_rgba(148,163,184,0.06)]"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Ряд 1: лого | пошук (md+) | дії */}
        <div className="flex h-[3.75rem] items-center gap-2 md:gap-3">
          <Link
            href="/marketplace"
            className="shrink-0 text-lg font-semibold tracking-tight text-foreground"
            onClick={() => setOpen(false)}
          >
            СпівДія
          </Link>

          {showSearch && (
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-1 md:flex">
              <HeaderMarketplaceSearch />
              <MarketplaceHeaderIconRail
                isAuthenticated={isAuthenticated}
                className="hidden shrink-0 lg:flex"
              />
            </div>
          )}

          {/* Desktop: дії */}
          <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
            {!tabs.length && (
              <Link href="/marketplace" className={linkClass}>
                Маркетплейс
              </Link>
            )}
            <ThemeToggle />
            {tabs.length === 0 && (
              <Link
                href={cabinetHref}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-[transform,box-shadow,background-color] hover:bg-muted/80 hover:shadow-md active:scale-[0.98]"
              >
                <LayoutDashboard className="size-[1.125rem] shrink-0 text-primary" aria-hidden />
                Особистий кабінет
              </Link>
            )}
            {!isAuthenticated && (
              <Link
                href="/register"
                className={
                  linkClassActiveAccent +
                  " rounded-xl bg-primary px-4 py-2 text-primary-foreground shadow-sm hover:no-underline hover:opacity-90 hover:shadow-md"
                }
              >
                Зареєструватись
              </Link>
            )}
          </div>

          {/* Mobile: тема + реєстрація + бургер */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {!isAuthenticated && (
              <Link
                href="/register"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                onClick={() => setOpen(false)}
              >
                Реєстрація
              </Link>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Закрити меню" : "Відкрити меню"}
              className="inline-flex rounded-lg border border-border p-2 text-foreground transition-colors hover:bg-muted/80"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Ряд 2: мобільний пошук + таби маркетплейсу */}
        {hasSubRow && (
          <div className="border-t border-border/40 bg-background/50 backdrop-blur-sm">
            {showSearch && (
              <div className="border-b border-border/30 px-0 py-2 md:hidden">
                <HeaderMarketplaceSearch />
              </div>
            )}
            {tabs.length > 0 && (
              <nav
                className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-1 overflow-x-auto px-1 py-2 md:gap-2 md:px-2"
                aria-label="Маркетплейс"
              >
                {tabs.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:text-sm"
                  >
                    {t.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        )}
      </div>
    </header>
    {mobileMenu}
    </>
  );
}
