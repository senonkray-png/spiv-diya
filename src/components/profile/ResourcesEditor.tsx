"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_OPTIONS = [
  { value: "equipment", label: "Обладнання" },
  { value: "space", label: "Виробничі площі" },
  { value: "logistics", label: "Логістика" },
  { value: "raw_materials", label: "Сировина" },
  { value: "sales_department", label: "Відділ продажів / клієнтська база" },
  { value: "marketing", label: "Маркетинг" },
  { value: "workforce", label: "Персонал" },
];

interface Resource {
  id: string;
  category: string;
  title: string;
  description: string;
  city: string;
  region: string;
}

interface Props {
  initialAssets: Resource[];
  initialDeficits: Resource[];
  defaultCity: string;
  defaultRegion: string;
}

export function ResourcesEditor({ initialAssets, initialDeficits, defaultCity, defaultRegion }: Props) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [deficits, setDeficits] = useState(initialDeficits);
  const [busy, setBusy] = useState(false);

  async function add(kind: "asset" | "deficit") {
    const title = prompt(
      kind === "asset"
        ? "Що у вас в надлишку? (наприклад: «Хлібопічна піч», «Вільний склад 200 м²»)"
        : "Чого вам не вистачає? (наприклад: «Промислові печі», «Менеджер з продажів»)"
    );
    if (!title?.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: title.trim(), category: "equipment", city: defaultCity, region: defaultRegion }),
      });
      if (res.ok) {
        const data = await res.json();
        if (kind === "asset") setAssets((prev) => [data.resource, ...prev]);
        else setDeficits((prev) => [data.resource, ...prev]);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: "asset" | "deficit", id: string) {
    if (!confirm("Видалити запис?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (kind === "asset") setAssets((prev) => prev.filter((r) => r.id !== id));
        else setDeficits((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, patchData: Partial<Resource>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (res.ok) {
        const data = await res.json();
        const updater = (prev: Resource[]) =>
          prev.map((r) => (r.id === id ? { ...r, ...data.resource } : r));
        setAssets(updater);
        setDeficits(updater);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Pane
        title="Активи (що в надлишку)"
        accent="green"
        items={assets}
        onAdd={() => add("asset")}
        onDelete={(id) => remove("asset", id)}
        onPatch={patch}
        busy={busy}
      />
      <Pane
        title="Дефіцити (що шукаєте)"
        accent="orange"
        items={deficits}
        onAdd={() => add("deficit")}
        onDelete={(id) => remove("deficit", id)}
        onPatch={patch}
        busy={busy}
      />
    </div>
  );
}

function Pane({
  title,
  accent,
  items,
  onAdd,
  onDelete,
  onPatch,
  busy,
}: {
  title: string;
  accent: "green" | "orange";
  items: Resource[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onPatch: (id: string, patch: Partial<Resource>) => void;
  busy: boolean;
}) {
  const accentBg = accent === "green" ? "bg-green-50 dark:bg-green-950/30" : "bg-orange-50 dark:bg-orange-950/30";
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">{title}</h2>
        <div className="flex items-center gap-2">
          <Badge variant={accent === "green" ? "green" : "orange"}>{items.length}</Badge>
          <Button size="sm" variant="secondary" onClick={onAdd} disabled={busy}>+</Button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-zinc-400">
          Натисніть «+» щоб додати. Вкажіть конкретно: чим краще опис, тим точніший підбір партнерів.
        </p>
      )}

      <div className="space-y-2">
        {items.map((r) => (
          <Editable key={r.id} resource={r} accentBg={accentBg} onDelete={() => onDelete(r.id)} onPatch={(p) => onPatch(r.id, p)} busy={busy} />
        ))}
      </div>
    </Card>
  );
}

function Editable({
  resource,
  accentBg,
  onDelete,
  onPatch,
  busy,
}: {
  resource: Resource;
  accentBg: string;
  onDelete: () => void;
  onPatch: (patch: Partial<Resource>) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: resource.title,
    description: resource.description,
    category: resource.category,
    city: resource.city,
    region: resource.region,
  });

  function save() {
    onPatch(draft);
    setOpen(false);
  }

  return (
    <div className={`rounded-xl p-3 ${accentBg}`}>
      {!open ? (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{resource.title}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {CATEGORY_OPTIONS.find((c) => c.value === resource.category)?.label} · {resource.city}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setOpen(true)} disabled={busy} className="text-xs text-blue-600 hover:underline">
              Змінити
            </button>
            <button onClick={onDelete} disabled={busy} className="text-xs text-red-500 hover:underline">
              Видалити
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Назва" />
          <Select
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            options={CATEGORY_OPTIONS}
          />
          <Textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Опис: характеристики, кількість, термін доступності"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="Місто" />
            <Input value={draft.region} onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))} placeholder="Регіон" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Скасувати</Button>
            <Button size="sm" onClick={save} disabled={busy} loading={busy}>Зберегти</Button>
          </div>
        </div>
      )}
    </div>
  );
}
