"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bell, Heart, LayoutDashboard, ShoppingCart, Wallet, WalletCards } from "lucide-react";
import { MarketplaceCartDrawer } from "@/components/layout/MarketplaceCartDrawer";
import { MarketplaceNotificationsModal } from "@/components/layout/MarketplaceNotificationsModal";

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

type ChromeCtx = {
  total: number;
  refresh: () => Promise<void>;
  openCart: () => void;
  openNotifications: () => void;
};

const MarketplaceChromeContext = createContext<ChromeCtx | null>(null);

export function MarketplaceUnreadProvider({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const [total, setTotal] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

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

  const value = useMemo(
    () => ({
      total,
      refresh,
      openCart: () => setCartOpen(true),
      openNotifications: () => setNotifyOpen(true),
    }),
    [total, refresh],
  );

  return (
    <MarketplaceChromeContext.Provider value={value}>
      {children}
      <MarketplaceCartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        isAuthenticated={isAuthenticated}
      />
      <MarketplaceNotificationsModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        isAuthenticated={isAuthenticated}
        onMarkedRead={() => void refresh()}
      />
    </MarketplaceChromeContext.Provider>
  );
}

function useMarketplaceChrome() {
  return useContext(MarketplaceChromeContext);
}

function RailIconButton({
  label,
  children,
  badge,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/80 hover:text-foreground"
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function WalletPeekControl({
  isAuthenticated,
  variant = "rail",
}: {
  isAuthenticated: boolean;
  variant?: "rail" | "dock";
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "peek">("idle");
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/me", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setBalance(typeof d.user?.balance === "number" ? d.user.balance : 0);
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    if (phase !== "peek") return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPhase("idle");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [phase]);

  function onWalletClick() {
    if (!isAuthenticated) {
      router.push(loginNext("/dashboard/wallet"));
      return;
    }
    if (phase === "idle") {
      setPhase("peek");
      void loadBalance();
      return;
    }
    router.push("/dashboard/wallet");
  }

  const iconClosed = <Wallet className={variant === "dock" ? "size-5" : "size-[1.35rem]"} aria-hidden />;
  const iconOpen = <WalletCards className={variant === "dock" ? "size-5" : "size-[1.35rem]"} aria-hidden />;

  const glassPop = phase === "peek" && isAuthenticated && (
    <div
      className={`pointer-events-none absolute left-1/2 z-[80] w-max min-w-[7.5rem] -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/25 bg-gradient-to-b from-white/40 to-white/15 px-3 py-2 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:from-white/15 dark:to-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${
        variant === "dock"
          ? "bottom-[calc(100%+0.35rem)]"
          : "top-[calc(100%+0.35rem)]"
      }`}
      aria-hidden
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">СпівМонети</p>
      <p className="text-lg font-bold tabular-nums text-foreground drop-shadow-sm">
        {balance != null ? balance.toLocaleString("uk-UA") : "…"}
      </p>
      <p className="text-[9px] text-muted-foreground">Торкніться ще раз — поповнення</p>
    </div>
  );

  if (variant === "dock") {
    return (
      <div ref={wrapRef} className="relative flex min-w-0 flex-1 flex-col items-center justify-center py-2">
        <button
          type="button"
          title="Гаманець"
          aria-label="Гаманець"
          onClick={onWalletClick}
          className="relative flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {phase === "peek" && isAuthenticated ? iconOpen : iconClosed}
        </button>
        <span className="mt-0.5 truncate px-0.5 text-[10px] font-medium text-muted-foreground">Гаманець</span>
        {glassPop}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <RailIconButton label="Гаманець" onClick={onWalletClick}>
        {phase === "peek" && isAuthenticated ? iconOpen : iconClosed}
      </RailIconButton>
      {glassPop}
    </div>
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
  const ctx = useMarketplaceChrome();
  const total = ctx?.total ?? 0;
  const openCart = ctx?.openCart ?? (() => {});
  const openNotifications = ctx?.openNotifications ?? (() => {});

  const fav = isAuthenticated ? "/dashboard/favorites" : loginNext("/dashboard/favorites");
  const cabinet = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <RailIconButton label="Кошик" onClick={openCart}>
        <ShoppingCart className="size-[1.35rem]" aria-hidden />
      </RailIconButton>
      <WalletPeekControl isAuthenticated={isAuthenticated} />
      <Link
        href={fav}
        title="Обране"
        aria-label="Обране"
        className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/80 hover:text-foreground"
      >
        <Heart className="size-[1.35rem]" aria-hidden />
      </Link>
      <RailIconButton label="Сповіщення" badge={total} onClick={openNotifications}>
        <Bell className="size-[1.35rem]" aria-hidden />
      </RailIconButton>
      <Link
        href={cabinet}
        title="Особистий кабінет"
        aria-label="Особистий кабінет"
        className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/80 hover:text-foreground"
      >
        <LayoutDashboard className="size-[1.35rem]" aria-hidden />
      </Link>
    </div>
  );
}

/** Нижня панель: телефони та планшети (< lg) */
export function MarketplaceMobileBottomNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const ctx = useMarketplaceChrome();
  const total = ctx?.total ?? 0;
  const openCart = ctx?.openCart ?? (() => {});
  const openNotifications = ctx?.openNotifications ?? (() => {});

  const fav = isAuthenticated ? "/dashboard/favorites" : loginNext("/dashboard/favorites");
  const cabinet = isAuthenticated ? "/dashboard" : "/login";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex overflow-visible border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      aria-label="Швидкий доступ"
    >
      <button
        type="button"
        onClick={openCart}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative flex size-9 items-center justify-center">
          <ShoppingCart className="size-5 shrink-0" aria-hidden />
        </span>
        <span className="truncate px-0.5">Кошик</span>
      </button>

      <WalletPeekControl isAuthenticated={isAuthenticated} variant="dock" />

      <Link
        href={fav}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative flex size-9 items-center justify-center">
          <Heart className="size-5 shrink-0" aria-hidden />
        </span>
        <span className="truncate px-0.5">Обране</span>
      </Link>

      <button
        type="button"
        onClick={openNotifications}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative flex size-9 items-center justify-center">
          <Bell className="size-5 shrink-0" aria-hidden />
          {total > 0 && (
            <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </span>
        <span className="truncate px-0.5">Події</span>
      </button>

      <Link
        href={cabinet}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative flex size-9 items-center justify-center">
          <LayoutDashboard className="size-5 shrink-0" aria-hidden />
        </span>
        <span className="truncate px-0.5">Кабінет</span>
      </Link>
    </nav>
  );
}
