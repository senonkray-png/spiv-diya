"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function AddToCartButton({
  productId,
  maxQty,
  isLogged,
}: {
  productId: string;
  maxQty: number | null;
  isLogged: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const cap = maxQty != null ? Math.min(99, Math.max(0, maxQty)) : 99;
  const soldOut = maxQty != null && maxQty <= 0;

  async function add() {
    if (!isLogged || soldOut) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data?.error ?? "Не вдалось додати");
      else setMsg("Додано до кошика");
    } finally {
      setBusy(false);
    }
  }

  if (!isLogged) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/marketplace/products/${productId}`)}`}
        className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
      >
        Увійти, щоб додати в кошик
      </Link>
    );
  }

  if (soldOut) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Немає в наявності
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="text-xs font-medium text-zinc-500">Кількість</label>
        <input
          type="number"
          min={1}
          max={cap}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(Math.max(1, cap), Number(e.target.value) || 1)))}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <Button type="button" className="sm:min-w-[10rem]" loading={busy} onClick={add}>
        У кошик
      </Button>
      {msg && <p className="text-xs text-zinc-500 sm:ml-2">{msg}</p>}
    </div>
  );
}
