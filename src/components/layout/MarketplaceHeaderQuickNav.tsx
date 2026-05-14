"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Heart, LayoutDashboard, ShoppingCart, Wallet } from "lucide-react";

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

type UnreadCtx = {
  total: number;
  refresh: () => Promise<void>;
};

const MarketplaceUnreadContext = createContext<UnreadCtx | null>(null);

export function MarketplaceUnreadProvider({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setTotal(0);
      return;
    }
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as {
        unreadMessages?: number;
        unreadNotifications?: number;
        unreadOpportunities?: number;
      };
      const sum =
        (d.unreadMessages ?? 0) + (d.unreadNotifications ?? 0) + (d.unreadOpportunities ?? 0);
      setTotal(sum);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const value = useMemo(() => ({ total, refresh }), [total, refresh]);

  return (
    <MarketplaceUnreadContext.Provider value={value}>{children}</MarketplaceUnreadContext.Provider>
  );
}

function useMarketplaceUnreadOptional() {
  return useContext(MarketplaceUnreadContext);
}

function IconButton({
  href,
  label,
  children,
  badge,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/80 hover:text-foreground"
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

/** Іконки біля пошуку — лише великі екрани (lg+), див. нижню панель для менших */
export function MarketplaceHeaderIconRail({
  isAuthenticated,
  className = "",
}: {
  isAuthenticated: boolean;
  className?: string;
}) {
  const ctx = useMarketplaceUnreadOptional();
  const total = ctx?.total ?? 0;

  const cart = isAuthenticated ? "/marketplace/cart" : loginNext("/marketplace/cart");
  const wallet = isAuthenticated ? "/dashboard/wallet" : loginNext("/dashboard/wallet");
  const fav = isAuthenticated ? "/dashboard/favorites" : loginNext("/dashboard/favorites");
  const notify = isAuthenticated ? "/dashboard" : loginNext("/dashboard");
  const cabinet = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <IconButton href={cart} label="Кошик">
        <ShoppingCart className="size-[1.35rem]" aria-hidden />
      </IconButton>
      <IconButton href={wallet} label="Гаманець">
        <Wallet className="size-[1.35rem]" aria-hidden />
      </IconButton>
      <IconButton href={fav} label="Обране">
        <Heart className="size-[1.35rem]" aria-hidden />
      </IconButton>
      <IconButton href={notify} label="Сповіщення" badge={total}>
        <Bell className="size-[1.35rem]" aria-hidden />
      </IconButton>
      <IconButton href={cabinet} label="Особистий кабінет">
        <LayoutDashboard className="size-[1.35rem]" aria-hidden />
      </IconButton>
    </div>
  );
}

/** Нижня панель: телефони та планшети (< lg) */
export function MarketplaceMobileBottomNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const ctx = useMarketplaceUnreadOptional();
  const total = ctx?.total ?? 0;

  const cart = isAuthenticated ? "/marketplace/cart" : loginNext("/marketplace/cart");
  const wallet = isAuthenticated ? "/dashboard/wallet" : loginNext("/dashboard/wallet");
  const fav = isAuthenticated ? "/dashboard/favorites" : loginNext("/dashboard/favorites");
  const notify = isAuthenticated ? "/dashboard" : loginNext("/dashboard");
  const cabinet = isAuthenticated ? "/dashboard" : "/login";

  const items = [
    { href: cart, label: "Кошик", Icon: ShoppingCart, badge: 0 },
    { href: fav, label: "Обране", Icon: Heart, badge: 0 },
    { href: notify, label: "Події", Icon: Bell, badge: total },
    { href: cabinet, label: "Кабінет", Icon: LayoutDashboard, badge: 0 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      aria-label="Швидкий доступ"
    >
      {items.map(({ href, label, Icon, badge }) => (
        <Link
          key={label}
          href={href}
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="relative flex size-9 items-center justify-center">
            <Icon className="size-5 shrink-0" aria-hidden />
            {badge > 0 && (
              <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </span>
          <span className="truncate px-0.5">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
