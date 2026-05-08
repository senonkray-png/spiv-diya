"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

type Tab = "deposit" | "transfer" | "withdraw" | "history";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

interface Props {
  balance: number;
  initialTransactions: Transaction[];
  withdrawals: { id: string; amountTokens: number; status: string; createdAt: string }[];
  payments: {
    id: string;
    method: string;
    amountUSD: number;
    amountTokens: number;
    status: string;
    createdAt: string;
  }[];
}

const TX_LABEL: Record<string, string> = {
  deposit: "Поповнення",
  withdrawal: "Виведення",
  transfer_in: "Отримано",
  transfer_out: "Переказ",
  purchase: "Купівля",
  refund: "Повернення",
  bonus: "Бонус",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Очікує",
  awaiting_confirmation: "Перевіряється",
  confirmed: "Підтверджено",
  rejected: "Відхилено",
  approved: "Схвалено",
  paid: "Виплачено",
};

export function WalletPanel({ balance, initialTransactions, withdrawals, payments }: Props) {
  const [tab, setTab] = useState<Tab>("deposit");
  const [transactions] = useState(initialTransactions);

  return (
    <div className="space-y-4">
      <Card padding="md" className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
        <p className="text-sm opacity-80">Поточний баланс</p>
        <p className="text-4xl font-bold mt-1">{balance.toLocaleString("uk-UA")}</p>
        <p className="text-sm opacity-80 mt-0.5">СпівМонет · 1 USD = 100 монет</p>
      </Card>

      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
        {[
          { id: "deposit" as const, label: "Поповнити" },
          { id: "transfer" as const, label: "Переказ" },
          { id: "withdraw" as const, label: "Вивести" },
          { id: "history" as const, label: "Історія" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "deposit" && <DepositPanel />}
      {tab === "transfer" && <TransferPanel maxAmount={balance} />}
      {tab === "withdraw" && <WithdrawPanel maxAmount={balance} />}
      {tab === "history" && (
        <HistoryPanel transactions={transactions} withdrawals={withdrawals} payments={payments} />
      )}
    </div>
  );
}

// ─── Deposit ─────────────────────────────────────────────────────────────────

function DepositPanel() {
  const [method, setMethod] = useState("crypto_binance");
  const [amount, setAmount] = useState("10");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const tokens = Math.round(parseFloat(amount || "0") * 100);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("method", method);
      fd.set("amountUSD", amount);
      if (screenshot) fd.set("screenshot", screenshot);
      const res = await fetch("/api/payments", { method: "POST", body: fd });
      const data = await res.json();
      if (data.address || data.checkoutUrl) {
        setResult(`Адреса/посилання для оплати: ${data.address ?? data.checkoutUrl}`);
      } else if (data.message) {
        setResult(data.message);
      } else if (data.error) {
        setResult("Помилка: " + data.error);
      }
    } finally {
      setBusy(false);
    }
  }

  const methods = [
    { id: "crypto_binance", label: "Binance Pay", desc: "Автоматичне зарахування USDT" },
    { id: "crypto_whitebit", label: "WhiteBit", desc: "Альтернативна крипто-платіжна система" },
    { id: "p2p_screenshot", label: "Monobank / Privat24", desc: "Скриншот підтвердження" },
    { id: "p2p_manual", label: "Переказ на картку", desc: "Ручне нарахування" },
  ];

  return (
    <Card padding="md">
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Поповнити баланс</h3>

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
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{m.label}</p>
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
          Отримаєте: <span className="font-semibold text-zinc-900 dark:text-white">{tokens} монет</span>
        </p>
      )}

      {method === "p2p_screenshot" && (
        <div className="mt-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Скриншот оплати</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700"
          />
        </div>
      )}

      <Button className="w-full mt-4" size="lg" onClick={submit} loading={busy} disabled={!amount}>
        {method.startsWith("crypto") ? "Отримати адресу" : "Подати заявку"}
      </Button>

      {result && (
        <p className="mt-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 break-all">{result}</p>
      )}
    </Card>
  );
}

// ─── Transfer ────────────────────────────────────────────────────────────────

function TransferPanel({ maxAmount }: { maxAmount: number }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: recipient.trim(), amount: Number(amount), note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: data?.error ?? "Помилка" });
      } else {
        setResult({ ok: true, msg: "Переказ виконано" });
        setAmount("");
        setNote("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md">
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Переказати партнеру</h3>
      <div className="space-y-3">
        <Input
          label="Email або ID отримувача"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="user@example.com"
        />
        <Input
          label="Сума (монет)"
          type="number"
          min="1"
          max={maxAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint={`Доступно: ${maxAmount} монет`}
        />
        <Textarea
          label="Призначення (необов'язково)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button onClick={submit} loading={busy} disabled={!recipient || !amount} className="w-full">
          Перевести
        </Button>
        {result && (
          <p
            className={`text-sm rounded-xl px-3 py-2 ${
              result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {result.msg}
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── Withdraw ────────────────────────────────────────────────────────────────

function WithdrawPanel({ maxAmount }: { maxAmount: number }) {
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountTokens: Number(amount),
          details,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: data?.error ?? "Помилка" });
      } else {
        setResult({ ok: true, msg: "Заявку прийнято. Адмін опрацює протягом 24 годин." });
        setAmount("");
        setDetails("");
        setReason("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md">
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Вивести кошти</h3>
      <div className="space-y-3">
        <Input
          label="Сума (монет)"
          type="number"
          min="1"
          max={maxAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint={`Доступно: ${maxAmount} монет`}
        />
        <Input
          label="Реквізити (картка / IBAN / гаманець)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="4441 1144 ..."
        />
        <Textarea
          label="Коментар (необов'язково)"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button onClick={submit} loading={busy} disabled={!amount || !details} className="w-full">
          Подати заявку
        </Button>
        {result && (
          <p
            className={`text-sm rounded-xl px-3 py-2 ${
              result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {result.msg}
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────

function HistoryPanel({
  transactions,
  withdrawals,
  payments,
}: {
  transactions: Transaction[];
  withdrawals: Props["withdrawals"];
  payments: Props["payments"];
}) {
  return (
    <div className="space-y-4">
      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Останні операції</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-400">Поки немає операцій.</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-900 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {TX_LABEL[t.type] ?? t.type}
                  </p>
                  {t.description && (
                    <p className="text-xs text-zinc-500 truncate">{t.description}</p>
                  )}
                  <p className="text-[10px] text-zinc-400">
                    {new Date(t.createdAt).toLocaleString("uk-UA", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${
                    t.amount > 0 ? "text-green-600" : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Заявки на вивід</h3>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-zinc-400">Заявок немає.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-900 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {w.amountTokens} монет
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(w.createdAt).toLocaleString("uk-UA")}
                  </p>
                </div>
                <Badge
                  variant={
                    w.status === "approved" || w.status === "paid"
                      ? "green"
                      : w.status === "rejected"
                      ? "red"
                      : "amber"
                  }
                >
                  {STATUS_LABEL[w.status] ?? w.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Платежі</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-400">Платежів немає.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-900 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {p.amountUSD} USD ≈ {p.amountTokens} монет
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {p.method} · {new Date(p.createdAt).toLocaleString("uk-UA")}
                  </p>
                </div>
                <Badge
                  variant={
                    p.status === "confirmed" ? "green" : p.status === "rejected" ? "red" : "amber"
                  }
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
