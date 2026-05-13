"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Props {
  plan: "provider" | "entrepreneur";
  priceUAH: number;
  priceTokens: number;
  balance: number;
}

export function CheckoutForm({ plan, priceUAH, priceTokens, balance }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payWithTokens() {
    if (balance < priceTokens) {
      setError("Недостатньо монет. Поповніть гаманець або оплатіть карткою.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, paidWith: "tokens" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не вдалось оплатити");
        return;
      }
      const next = plan === "entrepreneur" ? "/onboarding" : "/marketplace";
      router.push(next);
    } finally {
      setBusy(false);
    }
  }

  async function payWithUAH() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, paidWith: "uah" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не вдалось створити заявку");
        return;
      }
      router.push("/dashboard/wallet?tab=pending");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md" className="mt-4">
      <h2 className="font-semibold text-zinc-900 dark:text-white">Як оплатити</h2>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <p className="font-semibold text-zinc-900 dark:text-white">СпівМонети</p>
          </div>
          <p className="text-xs text-zinc-500">Списується миттєво — підписка активується одразу.</p>
          <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
            Списати: <b>{priceTokens}</b> монет
          </div>
          <Button
            className="mt-3"
            onClick={payWithTokens}
            loading={busy}
            disabled={balance < priceTokens}
          >
            {balance >= priceTokens ? "Оплатити монетами" : "Недостатньо монет"}
          </Button>
          {balance < priceTokens && (
            <Link href="/dashboard/wallet" className="text-xs text-blue-600 hover:underline mt-2 text-center">
              Поповнити гаманець →
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💳</span>
            <p className="font-semibold text-zinc-900 dark:text-white">Картка / гривні</p>
          </div>
          <p className="text-xs text-zinc-500">
            Створимо заявку. Підписка активується після підтвердження адміністратором.
          </p>
          <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
            До оплати: <b>{priceUAH}</b> грн
          </div>
          <Button className="mt-3" variant="secondary" onClick={payWithUAH} loading={busy}>
            Створити заявку
          </Button>
        </div>
      </div>
    </Card>
  );
}
