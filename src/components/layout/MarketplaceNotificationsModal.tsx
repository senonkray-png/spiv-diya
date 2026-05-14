"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function MarketplaceNotificationsModal({
  open,
  onClose,
  isAuthenticated,
  onMarkedRead,
}: {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onMarkedRead?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const d = await res.json();
      if (res.ok) setItems(d.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    void load();
  }, [open, isAuthenticated, load]);

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

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    onMarkedRead?.();
    void load();
  }

  if (!mounted || !open) return null;

  const loginHref = `/login?next=${encodeURIComponent("/marketplace")}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-10 sm:py-16"
      role="dialog"
      aria-modal="true"
      aria-label="Сповіщення"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        aria-label="Закрити"
        onClick={onClose}
      />
      <div
        className="relative z-10 mt-0 w-full max-w-lg rounded-2xl border border-white/20 bg-background/45 p-5 shadow-2xl backdrop-blur-2xl supports-[backdrop-filter]:bg-background/35 dark:border-white/10 dark:bg-background/40 dark:supports-[backdrop-filter]:bg-background/25"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Сповіщення</h2>
            <p className="text-xs text-muted-foreground">Останні події в акаунті</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAuthenticated && items.some((n) => !n.read) && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                Прочитати всі
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted/80"
              aria-label="Закрити"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain pt-3">
          {!isAuthenticated ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">Увійдіть, щоб бачити сповіщення.</p>
              <Link
                href={loginHref}
                onClick={onClose}
                className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Увійти
              </Link>
            </div>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Завантаження…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Поки немає сповіщень.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                const inner = (
                  <div
                    className={`rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm transition-colors dark:bg-white/[0.03] ${
                      n.read ? "opacity-75" : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("uk-UA", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={onClose} className="block">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-white/10 pt-3 text-center">
          <Link href="/dashboard" onClick={onClose} className="text-sm font-medium text-primary hover:underline">
            Відкрити кабінет
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
