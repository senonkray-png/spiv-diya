"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Tab = "users" | "payments" | "withdrawals" | "listings";

interface User {
  id: string; email: string; companyName: string; role: string;
  isActive: boolean; verified: boolean; balance: number;
  city: string; createdAt: string;
}
interface Payment {
  id: string; method: string; amountUSD: number; amountTokens: number;
  status: string; createdAt: string; screenshot: string | null;
  user: { id: string; companyName: string; email: string };
}
interface Withdrawal {
  id: string; amountTokens: number; amountUAH: number | null;
  details: string; reason: string | null; status: string; createdAt: string;
  user: { id: string; companyName: string; email: string; balance: number };
}
interface Product {
  id: string; title: string; status: string; priceUAH: number | null;
  priceTokens: number; createdAt: string;
  owner: { id: string; companyName: string };
}
interface Service {
  id: string; title: string; type: string; status: string; createdAt: string;
  owner: { id: string; companyName: string };
}

interface Props {
  initialUsers: User[];
  initialPayments: Payment[];
  initialWithdrawals: Withdrawal[];
  initialProducts: Product[];
  initialServices: Service[];
}

export function AdminShell(props: Props) {
  const [tab, setTab] = useState<Tab>("payments");

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
        {[
          { id: "payments" as const, label: `Платежі (${props.initialPayments.length})` },
          { id: "withdrawals" as const, label: `Виводи (${props.initialWithdrawals.length})` },
          { id: "users" as const, label: "Користувачі" },
          { id: "listings" as const, label: "Модерація" },
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

      {tab === "payments" && <PaymentsTab payments={props.initialPayments} />}
      {tab === "withdrawals" && <WithdrawalsTab requests={props.initialWithdrawals} />}
      {tab === "users" && <UsersTab users={props.initialUsers} />}
      {tab === "listings" && (
        <ListingsTab products={props.initialProducts} services={props.initialServices} />
      )}
    </div>
  );
}

function PaymentsTab({ payments }: { payments: Payment[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "confirm" | "reject") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  if (payments.length === 0) {
    return <Card padding="md"><p className="text-sm text-zinc-500">Немає платежів, що очікують перевірки.</p></Card>;
  }
  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <Card key={p.id} padding="sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {p.user.companyName} · ${p.amountUSD} → {p.amountTokens} монет
              </p>
              <p className="text-xs text-zinc-500">
                {p.method} · {p.user.email} · {new Date(p.createdAt).toLocaleString("uk-UA")}
              </p>
              {p.screenshot && <p className="text-xs text-zinc-400 mt-1 truncate">Чек: {p.screenshot}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => act(p.id, "confirm")}
                loading={busyId === p.id}
              >
                Підтвердити
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => act(p.id, "reject")}
                disabled={busyId === p.id}
              >
                Відхилити
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function WithdrawalsTab({ requests }: { requests: Withdrawal[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "paid" | "reject") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return <Card padding="md"><p className="text-sm text-zinc-500">Немає заявок на вивід.</p></Card>;
  }

  return (
    <div className="space-y-2">
      {requests.map((w) => (
        <Card key={w.id} padding="sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {w.user.companyName} · {w.amountTokens} монет ≈ {w.amountUAH ?? "?"} ₴
              </p>
              <p className="text-xs text-zinc-500">
                Реквізити: {w.details} · Баланс: {w.user.balance}
              </p>
              {w.reason && <p className="text-xs text-zinc-500 mt-1">«{w.reason}»</p>}
              <p className="text-[10px] text-zinc-400 mt-1">
                {new Date(w.createdAt).toLocaleString("uk-UA")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => act(w.id, "paid")} loading={busyId === w.id}>
                Виплачено
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => act(w.id, "reject")}
                disabled={busyId === w.id}
              >
                Відхилити
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const ROLE_OPTS = [
  { value: "member", label: "Учасник" },
  { value: "provider", label: "Постачальник" },
  { value: "buyer", label: "Покупець" },
  { value: "admin", label: "Адмін" },
];

function UsersTab({ users }: { users: User[] }) {
  const [filter, setFilter] = useState("");

  async function changeRole(id: string, role: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    window.location.reload();
  }

  async function toggle(id: string, key: "isActive" | "verified", value: boolean) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    window.location.reload();
  }

  async function adjustBalance(id: string) {
    const value = prompt("На скільки змінити баланс? (можна від'ємне)");
    if (!value) return;
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balanceDelta: n }),
    });
    window.location.reload();
  }

  const filtered = users.filter((u) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return u.companyName.toLowerCase().includes(f) || u.email.toLowerCase().includes(f);
  });

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Пошук за компанією або email..."
        className="w-full mb-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm"
      />
      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id} padding="sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${u.id}`}
                  className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-blue-600"
                >
                  {u.companyName}
                </Link>
                <p className="text-xs text-zinc-500 truncate">
                  {u.email} · {u.city} · Баланс: {u.balance}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                >
                  {ROLE_OPTS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => toggle(u.id, "isActive", !u.isActive)}
                  className="text-xs"
                >
                  <Badge variant={u.isActive ? "green" : "red"}>
                    {u.isActive ? "Активний" : "Заблокований"}
                  </Badge>
                </button>
                <button
                  onClick={() => toggle(u.id, "verified", !u.verified)}
                  className="text-xs"
                >
                  <Badge variant={u.verified ? "blue" : "neutral"}>
                    {u.verified ? "✓ Перев." : "Не перев."}
                  </Badge>
                </button>
                <Button size="sm" variant="ghost" onClick={() => adjustBalance(u.id)}>
                  ± Баланс
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ListingsTab({ products, services }: { products: Product[]; services: Service[] }) {
  async function act(type: "product" | "service", id: string, action: "remove" | "restore") {
    let reason: string | null = null;
    if (action === "remove") {
      reason = prompt("Причина зняття (необов'язково)") || null;
    }
    await fetch(`/api/admin/listings/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Товари ({products.length})</h3>
        <div className="space-y-2">
          {products.map((p) => (
            <Card key={p.id} padding="sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/marketplace/products/${p.id}`}
                    className="text-sm font-medium text-zinc-900 dark:text-white truncate hover:text-blue-600"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {p.owner.companyName} · {p.priceUAH ?? p.priceTokens} ·{" "}
                    {new Date(p.createdAt).toLocaleDateString("uk-UA")}
                  </p>
                </div>
                <Badge variant={p.status === "active" ? "green" : "red"}>{p.status}</Badge>
                {p.status !== "removed" ? (
                  <Button size="sm" variant="danger" onClick={() => act("product", p.id, "remove")}>
                    Зняти
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => act("product", p.id, "restore")}>
                    Відновити
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Послуги ({services.length})</h3>
        <div className="space-y-2">
          {services.map((s) => (
            <Card key={s.id} padding="sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/marketplace/services/${s.id}`}
                    className="text-sm font-medium text-zinc-900 dark:text-white truncate hover:text-blue-600"
                  >
                    {s.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {s.owner.companyName} · {s.type} ·{" "}
                    {new Date(s.createdAt).toLocaleDateString("uk-UA")}
                  </p>
                </div>
                <Badge variant={s.status === "active" ? "green" : "red"}>{s.status}</Badge>
                {s.status !== "removed" ? (
                  <Button size="sm" variant="danger" onClick={() => act("service", s.id, "remove")}>
                    Зняти
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => act("service", s.id, "restore")}>
                    Відновити
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
