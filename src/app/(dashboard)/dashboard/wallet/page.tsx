"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Method = "crypto_binance" | "crypto_whitebit" | "p2p_screenshot" | "p2p_manual";

const TOKEN_RATE = 100;

export default function WalletPage() {
  const [method, setMethod] = useState<Method>("crypto_binance");
  const [amount, setAmount] = useState("10");
  const [step, setStep] = useState<"select" | "pay">("select");
  const [invoice, setInvoice] = useState<{ address?: string; amountUSDT?: number } | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const tokens = Math.round(parseFloat(amount || "0") * TOKEN_RATE);

  async function handleSubmit() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("method", method);
      formData.set("amountUSD", amount);
      if (screenshot) formData.set("screenshot", screenshot);
      const res = await fetch("/api/payments", { method: "POST", body: formData });
      const data = await res.json();
      if (data.address || data.checkoutUrl) {
        setInvoice({ address: data.address ?? data.checkoutUrl, amountUSDT: parseFloat(amount) });
      }
      setStep("pay");
    } finally {
      setLoading(false);
    }
  }

  const methods: { id: Method; label: string; desc: string }[] = [
    { id: "crypto_binance", label: "Binance Pay", desc: "Автоматичне зарахування USDT" },
    { id: "crypto_whitebit", label: "WhiteBit", desc: "Альтернативна крипто-платіжна система" },
    { id: "p2p_screenshot", label: "Monobank / Privat24", desc: "Оплата + скриншот підтвердження" },
    { id: "p2p_manual", label: "Переказ на картку", desc: "Ручне нарахування адміністратором" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Гаманець</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">Поповнення балансу СпівМонет</p>
      </div>

      <Card className="mb-4" padding="sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Поточний баланс</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-0.5">—</p>
            <p className="text-xs text-zinc-400 mt-0.5">СпівМонет</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Курс</p>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">1 USD = 100 монет</p>
          </div>
        </div>
      </Card>

      {step === "select" && (
        <Card padding="sm">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">Спосіб поповнення</h2>

          <div className="space-y-2 mb-4">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
                  method === m.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                }`}
              >
                <p className={`text-sm font-medium ${method === m.id ? "text-blue-700 dark:text-blue-300" : "text-zinc-900 dark:text-zinc-100"}`}>
                  {m.label}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>

          <Input
            label="Сума (USD)"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {parseFloat(amount) > 0 && (
            <p className="text-sm text-zinc-500 mt-2">
              Отримаєте: <span className="font-semibold text-zinc-900 dark:text-white">{tokens} СпівМонет</span>
            </p>
          )}

          {method === "p2p_screenshot" && (
            <div className="mt-3">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Скриншот оплати</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}

          {method === "p2p_manual" && (
            <div className="mt-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Реквізити для переказу</p>
              <p className="text-sm text-zinc-500 mt-1 font-mono">{process.env.NEXT_PUBLIC_P2P_CARD ?? "4441 1144 XXXX XXXX"}</p>
              <p className="text-xs text-zinc-400 mt-1">Після переказу зверніться до підтримки.</p>
            </div>
          )}

          <Button
            className="w-full mt-4"
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            {method.startsWith("crypto") ? "Отримати адресу оплати" : "Подати заявку"}
          </Button>
        </Card>
      )}

      {step === "pay" && invoice && (
        <Card padding="sm">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">Виконайте оплату</h2>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 mb-3">
            <p className="text-xs text-zinc-500 mb-1">Адреса / Посилання:</p>
            <p className="font-mono text-xs break-all text-zinc-900 dark:text-white">{invoice.address}</p>
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            Сума: <span className="font-semibold">{invoice.amountUSDT} USDT</span>
          </p>
          <Button variant="secondary" className="w-full" onClick={() => setStep("select")}>
            ← Назад
          </Button>
        </Card>
      )}

      {step === "pay" && !invoice && (
        <Card padding="sm">
          <p className="text-zinc-600 dark:text-zinc-400 text-sm text-center py-3">
            Заявку прийнято. Адміністратор підтвердить протягом 24 годин.
          </p>
          <Button variant="secondary" className="w-full mt-3" onClick={() => setStep("select")}>
            ← Назад
          </Button>
        </Card>
      )}
    </div>
  );
}
