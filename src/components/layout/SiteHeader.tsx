"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export interface SiteHeaderNavItem {
  href: string;
  label: string;
}

export interface SiteHeaderProps {
  /** Якщо є — таби маркетплейсу (огляд, товари…). На головній зазвичай порожньо */
  tabs?: SiteHeaderNavItem[];
  /** Чи залогінений користувач (з server layout/page) */
  isAuthenticated?: boolean;
}

export function SiteHeader({ tabs = [], isAuthenticated = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const cabinetHref = isAuthenticated ? "/dashboard" : "/login";

  /** Хедер sticky + нижній ряд табів (marketplace mobile) — нижній край для overlay */
  const overlayTopPx = tabs.length ? 118 : 60;

  const linkClass =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap";
  const linkClassActiveAccent =
    "text-sm font-semibold text-foreground underline-offset-4 hover:underline whitespace-nowrap";

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:border-border/40 dark:bg-background/65 dark:supports-[backdrop-filter]:bg-background/50 shadow-[inset_0_-1px_0_0_rgba(148,163,184,0.08)] dark:shadow-[inset_0_-1px_0_0_rgba(148,163,184,0.06)]">
      <div className="mx-auto flex h-[3.75rem] max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Link
          href="/marketplace"
          className="font-semibold tracking-tight text-foreground shrink-0 text-lg"
          onClick={() => setOpen(false)}
        >
          СпівДія
        </Link>

        {/* Desktop: таби маркетплейсу */}
        {tabs.length > 0 && (
          <nav aria-label="Маркетплейс" className="hidden sm:flex flex-1 items-center justify-center gap-0.5 min-w-0">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg px-3 py-1.5 transition-colors hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop: дії */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {!tabs.length && (
            <Link href="/marketplace" className={linkClass}>
              Маркетплейс
            </Link>
          )}
          <ThemeToggle />
          <Link
            href={cabinetHref}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-[transform,box-shadow,background-color] hover:bg-muted/80 hover:shadow-md active:scale-[0.98]"
          >
            <LayoutDashboard className="size-[1.125rem] shrink-0 text-primary" aria-hidden />
            Особистий кабінет
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              className={linkClassActiveAccent + " rounded-xl px-4 py-2 bg-primary text-primary-foreground hover:no-underline hover:opacity-90 shadow-sm hover:shadow-md"}
            >
              Зареєструватись
            </Link>
          )}
        </div>

        {/* Burger */}
        <div className="flex md:hidden items-center gap-2">
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
            className="inline-flex rounded-lg border border-border p-2 text-foreground hover:bg-muted/80 transition-colors"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Мобільна друга смуга табів маркетплейсу (як було) */}
      {tabs.length > 0 && (
        <div className="md:hidden border-t border-border/40 bg-background/50 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-2" aria-label="Маркетплейс">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Overlay + панель мобільного меню */}
      {open && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col"
          id="mobile-menu"
          style={{ top: overlayTopPx }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            aria-label="Закрити overlay"
            onClick={() => setOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-[min(20rem,calc(100%-2rem))] flex-col gap-6 border-l border-border bg-background/95 backdrop-blur-xl p-6 shadow-xl">
            <nav className="flex flex-col gap-1" aria-label="Мобільна навігація">
              {!tabs.length && (
                <>
                  <Link href="/marketplace" className={`${linkClass} py-3 px-3 rounded-xl hover:bg-muted`} onClick={() => setOpen(false)}>
                    Маркетплейс
                  </Link>
                  <Link href="/marketplace/products" className={`${linkClass} py-3 px-3 rounded-xl hover:bg-muted`} onClick={() => setOpen(false)}>
                    Каталог товарів
                  </Link>
                </>
              )}
              <Link
                href={cabinetHref}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/70"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard className="size-5 text-primary shrink-0" aria-hidden />
                Особистий кабінет
              </Link>
              {!isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className={`${linkClass} py-3 px-3 rounded-xl hover:bg-muted`}
                    onClick={() => setOpen(false)}
                  >
                    Увійти
                  </Link>
                  <Link
                    href="/register"
                    className={`${linkClassActiveAccent} rounded-xl px-4 py-3 mt-2 text-center bg-primary text-primary-foreground hover:no-underline`}
                    onClick={() => setOpen(false)}
                  >
                    Зареєструватись
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
