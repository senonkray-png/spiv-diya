"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { effectivePriceUah, uahToTokens } from "@/lib/pricing";

type CartRow = {
  quantity: number;
  product: {
    id: string;
    title: string;
    photos: string[];
    priceUAH: number | null;
    discountPercent: number;
    stockQuantity: number | null;
  };
};

export function CheckoutView() {
  const router = useRouter();
  const [items, setItems] = useState<CartRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cRes, uRes] = await Promise.all([
      fetch("/api/shop/cart", { cache: "no-store" }),
      fetch("/api/profile/me", { cache: "no-store" }),
    ]);
    const c = await cRes.json();
    const u = await uRes.json();
    if (cRes.ok) setItems(c.items ?? []);
    if (uRes.ok && u.user) setBalance(u.user.balance ?? 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  let totalTokens = 0;
  for (const row of items) {
    const p = row.product;
    if (p.priceUAH == null) continue;
    const unit = effectivePriceUah(p.priceUAH, p.discountPercent);
    totalTokens += uahToTokens(unit * row.quantity);
  }

  async function pay() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          deliveryCity: fulfillment === "delivery" ? deliveryCity : null,
          deliveryPhone: fulfillment === "delivery" ? deliveryPhone : null,
          deliveryAddress: fulfillment === "delivery" ? deliveryAddress : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Не вдалось оформити");
        return;
      }
      router.push(`/dashboard/orders?paid=${encodeURIComponent(data.orderId ?? "")}`);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">Кошик порожній.</p>
        <Link href="/marketplace/cart" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          До кошика
        </Link>
      </div>
    );
  }

  const blocked = items.some((r) => r.product.priceUAH == null);
  const enough = balance >= totalTokens;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-foreground">Оформлення</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Оплата з балансу СпівМонет: <span className="font-semibold text-foreground">{totalTokens}</span> (на рахунку{" "}
        {balance})
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Отримання</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="fulfillment"
            checked={fulfillment === "pickup"}
            onChange={() => setFulfillment("pickup")}
          />
          Самовивіз / зустріч з продавцем
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="fulfillment"
            checked={fulfillment === "delivery"}
            onChange={() => setFulfillment("delivery")}
          />
          Доставка
        </label>
        {fulfillment === "delivery" && (
          <div className="space-y-2 pt-2">
            <input
              value={deliveryCity}
              onChange={(e) => setDeliveryCity(e.target.value)}
              placeholder="Місто"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)}
              placeholder="Телефон"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Адреса доставки"
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {blocked && (
        <p className="mt-4 text-sm text-destructive">У кошику є товар без ціни в ₴ — оформлення неможливе.</p>
      )}
      {!blocked && !enough && (
        <p className="mt-4 text-sm text-destructive">
          Недостатньо СпівМонет. <Link href="/dashboard/wallet" className="underline">Поповнити баланс</Link>
        </p>
      )}
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

      <button
        type="button"
        disabled={busy || blocked || !enough}
        onClick={() => void pay()}
        className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Обробка…" : "Сплатити та отримати квитанцію"}
      </button>

      <Link href="/marketplace/cart" className="mt-4 block text-center text-sm text-muted-foreground hover:underline">
        Назад до кошика
      </Link>
    </div>
  );
}
