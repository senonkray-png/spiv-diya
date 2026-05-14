"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { MarketplaceCartBody } from "@/components/market/MarketplaceCartBody";

export function MarketplaceCartDrawer({
  open,
  onClose,
  isAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const loginHref = `/login?next=${encodeURIComponent("/marketplace/cart")}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Кошик">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Закрити кошик"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/15 bg-background/55 shadow-2xl backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40 dark:bg-background/50 dark:supports-[backdrop-filter]:bg-background/35"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 backdrop-blur-md">
          <h2 className="text-lg font-bold text-foreground">Кошик</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/marketplace/cart"
              onClick={onClose}
              className="text-xs font-medium text-primary hover:underline"
            >
              Повна сторінка
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              aria-label="Закрити"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {!isAuthenticated ? (
            <div className="space-y-3 p-4 text-center">
              <p className="text-sm text-muted-foreground">Увійдіть, щоб бачити кошик.</p>
              <Link
                href={loginHref}
                onClick={onClose}
                className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Увійти
              </Link>
            </div>
          ) : (
            <MarketplaceCartBody variant="drawer" onBeforeCheckoutNavigate={onClose} />
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
