"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProductForm } from "@/components/market/ProductForm";
import { ServiceCard } from "@/components/market/ServiceCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface Service {
  id: string;
  type: "offer" | "request";
  title: string;
  description: string;
  priceTokens: number | null;
  priceUAH: number | null;
  photos: string[];
  city: string | null;
  region: string | null;
  category: string | null;
  status: string;
  owner: { id: string; companyName: string; avatarUrl: string | null; verified: boolean };
}

export function ServicesBoard({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<Service[]>([]);
  const [tab, setTab] = useState<"offer" | "request">("offer");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services?ownerId=${ownerId}&includeMine=1`);
      const data = await res.json();
      setItems(data.services ?? []);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (creating) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">
          Нове оголошення — {tab === "offer" ? "пропозиція" : "запит"}
        </h3>
        <ProductForm
          kind={tab === "offer" ? "service-offer" : "service-request"}
          onSaved={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Редагування</h3>
        <ProductForm
          kind={editing.type === "offer" ? "service-offer" : "service-request"}
          initial={{
            id: editing.id,
            title: editing.title,
            description: editing.description,
            priceUAH: editing.priceUAH != null ? String(editing.priceUAH) : "",
            priceTokens: editing.priceTokens != null ? String(editing.priceTokens) : "",
            category: editing.category ?? "",
            city: editing.city ?? "",
            region: editing.region ?? "",
            photos: editing.photos,
            status: editing.status as "active" | "paused" | "removed",
          }}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
          onDeleted={() => {
            setEditing(null);
            load();
          }}
        />
      </Card>
    );
  }

  const filtered = items.filter((i) => i.type === tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
          {(["offer", "request"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                tab === t
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {t === "offer" ? "Пропоную" : "Шукаю"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          + {tab === "offer" ? "Запропонувати послугу" : "Створити запит"}
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === "offer" ? "Ще немає пропозицій" : "Ще немає запитів"}
          description={
            tab === "offer"
              ? "Розкажіть, які послуги ви надаєте — це залучить клієнтів і партнерів."
              : "Розкажіть, які послуги вам потрібні — підрядники самі вийдуть на зв'язок."
          }
          action={<Button onClick={() => setCreating(true)}>Створити</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="relative group">
              <ServiceCard service={s} href={`/marketplace/services/${s.id}`} />
              <button
                onClick={() => setEditing(s)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white dark:bg-zinc-900 text-xs font-medium px-2.5 py-1 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 transition-opacity"
              >
                Редагувати
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
