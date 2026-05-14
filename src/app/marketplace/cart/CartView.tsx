"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { effectivePriceUah, uahToTokens } from "@/lib/pricing";

type CartRow = {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    photos: string[];
    priceUAH: number | null;
    discountPercent: number;
    stockQuantity: number | null;
    owner: { companyName: string };
  };
};

export function CartView() {
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/cart", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Помилка");
      setItems(d.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Помилка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setQty(productId: string, quantity: number) {
    const res = await fetch("/api/shop/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    if (res.ok) void load();
  }

  async function removeLine(productId: string) {
    await fetch(`/api/shop/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
    void load();
  }

  let totalTokens = 0;
  for (const row of items) {
    const p = row.product;
    if (p.priceUAH == null) continue;
    const unit = effectivePriceUah(p.priceUAH, p.discountPercent);
    totalTokens += uahToTokens(unit * row.quantity);
  }

  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">Завантаження кошика…</p>;
  }

  if (err) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-destructive">{err}</p>
        <button type="button" className="mt-3 text-sm underline" onClick={() => void load()}>
          Спробувати знову
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Кошик порожній</h1>
        <p className="mt-2 text-sm text-muted-foreground">Додайте товари з каталогу маркетплейсу.</p>
        <Link
          href="/marketplace/products"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          До каталогу
        </Link>
      </div>
    );
  }

  const blocked = items.some((r) => r.product.priceUAH == null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-foreground">Кошик</h1>
      <ul className="mt-6 space-y-4">
        {items.map((row) => {
          const p = row.product;
          const cap = p.stockQuantity != null ? Math.min(99, p.stockQuantity) : 99;
          const unitUah = p.priceUAH != null ? effectivePriceUah(p.priceUAH, p.discountPercent) : 0;
          const lineTok = p.priceUAH != null ? uahToTokens(unitUah * row.quantity) : 0;
          return (
            <li
              key={row.id}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {p.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0]} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/marketplace/products/${p.id}`} className="font-semibold text-foreground hover:underline">
                  {p.title}
                </Link>
                <p className="text-xs text-muted-foreground">{p.owner.companyName}</p>
                {p.priceUAH == null ? (
                  <p className="mt-1 text-xs text-destructive">Немає ціни в ₴ — приберіть позицію або оновіть товар.</p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {unitUah.toLocaleString("uk-UA")} ₴ × {row.quantity} ≈{" "}
                    <span className="font-medium text-foreground">{lineTok} монет</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground">
                    Кількість
                    <LineQtyInput
                      value={row.quantity}
                      max={cap}
                      onCommit={(n) => void setQty(p.id, n)}
                      className="ml-2 w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void removeLine(p.id)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Прибрати
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">До сплати (СпівМонети)</span>
          <span className="text-2xl font-bold text-foreground">{totalTokens}</span>
        </div>
        {blocked && (
          <p className="mt-2 text-xs text-destructive">
            У кошику є товар без ціни в ₴. Приберіть такі позиції або дочекайтесь оновлення ціни продавцем.
          </p>
        )}
        {blocked ? (
          <span className="mt-4 flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-muted py-3 text-sm font-semibold text-muted-foreground">
            Оформлення недоступне
          </span>
        ) : (
          <Link
            href="/marketplace/checkout"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Оформити замовлення
          </Link>
        )}
      </div>
    </div>
  );
}

function LineQtyInput({
  value,
  max,
  onCommit,
  className,
}: {
  value: number;
  max: number;
  onCommit: (n: number) => void;
  className?: string;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => {
    setLocal(String(value));
  }, [value]);
  return (
    <input
      type="number"
      min={1}
      max={max}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Math.max(1, Math.min(max, Number(local) || 1));
        setLocal(String(n));
        if (n !== value) onCommit(n);
      }}
      className={className}
    />
  );
}
