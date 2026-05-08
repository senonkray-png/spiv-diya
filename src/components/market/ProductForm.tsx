"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

type Listing = "product" | "service-offer" | "service-request";

interface ProductFormValues {
  title: string;
  description: string;
  priceUAH: string;
  priceTokens: string;
  category: string;
  city: string;
  region: string;
  photos: string[];
  status?: "active" | "paused" | "removed";
}

interface Props {
  kind: Listing;
  initial?: Partial<ProductFormValues> & { id?: string };
  onSaved?: () => void;
  onCancel?: () => void;
  onDeleted?: () => void;
}

const PRODUCT_CATEGORIES = [
  { value: "", label: "Без категорії" },
  { value: "goods", label: "Товари" },
  { value: "raw_materials", label: "Сировина" },
  { value: "equipment", label: "Обладнання" },
  { value: "tech", label: "Електроніка / IT" },
  { value: "food", label: "Продукти харчування" },
  { value: "services", label: "Послуги" },
  { value: "other", label: "Інше" },
];

export function ProductForm({ kind, initial, onSaved, onCancel, onDeleted }: Props) {
  const [form, setForm] = useState<ProductFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    priceUAH: initial?.priceUAH ?? "",
    priceTokens: initial?.priceTokens ?? "0",
    category: initial?.category ?? "",
    city: initial?.city ?? "",
    region: initial?.region ?? "",
    photos: initial?.photos ?? [],
    status: initial?.status ?? "active",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function addPhoto() {
    const u = photoUrl.trim();
    if (!u) return;
    if (form.photos.includes(u)) return;
    update("photos", [...form.photos, u].slice(0, 10));
    setPhotoUrl("");
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const endpoint = kind === "product"
        ? initial?.id
          ? `/api/products/${initial.id}`
          : "/api/products"
        : initial?.id
          ? `/api/services/${initial.id}`
          : "/api/services";

      const method = initial?.id ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        priceUAH: form.priceUAH === "" ? null : Number(form.priceUAH),
        priceTokens: Number(form.priceTokens || 0),
        category: form.category || null,
        city: form.city,
        region: form.region,
        photos: form.photos,
        status: form.status,
      };

      if (kind !== "product") {
        body.type = kind === "service-offer" ? "offer" : "request";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Не вдалось зберегти");
      }
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm("Видалити це оголошення?")) return;
    const endpoint = kind === "product" ? `/api/products/${initial.id}` : `/api/services/${initial.id}`;
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) onDeleted?.();
    } finally {
      setBusy(false);
    }
  }

  const titleLabel =
    kind === "product"
      ? "Назва товару"
      : kind === "service-offer"
      ? "Назва послуги (що пропонуєте)"
      : "Що шукаєте";

  return (
    <div className="space-y-3">
      <Input
        label={titleLabel + " *"}
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        placeholder={kind === "service-request" ? "Шукаю бухгалтера" : "Дерев'яні піддони"}
      />
      <Textarea
        label="Опис *"
        rows={4}
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        placeholder="Детально опишіть умови, характеристики, об'єм..."
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Ціна (₴)"
          type="number"
          min="0"
          value={form.priceUAH}
          onChange={(e) => update("priceUAH", e.target.value)}
          placeholder="100"
        />
        <Input
          label="Ціна в монетах"
          type="number"
          min="0"
          value={form.priceTokens}
          onChange={(e) => update("priceTokens", e.target.value)}
          placeholder="0"
        />
      </div>
      <p className="text-xs text-zinc-500 -mt-1">
        Залиште 0 / порожнє — буде позначено як «Договірна».
      </p>

      <Select
        label="Категорія"
        value={form.category}
        onChange={(e) => update("category", e.target.value)}
        options={PRODUCT_CATEGORIES}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Місто"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
        />
        <Input
          label="Регіон"
          value={form.region}
          onChange={(e) => update("region", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Фото (URL)</label>
        <div className="flex gap-2 mt-1">
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://...image.jpg"
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          <Button type="button" variant="secondary" onClick={addPhoto}>
            +
          </Button>
        </div>
        {form.photos.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {form.photos.map((u) => (
              <div key={u} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => update("photos", form.photos.filter((p) => p !== u))}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {initial?.id && (
        <Select
          label="Статус"
          value={form.status}
          onChange={(e) => update("status", e.target.value as ProductFormValues["status"])}
          options={[
            { value: "active", label: "Активне" },
            { value: "paused", label: "На паузі" },
          ]}
        />
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={submit} loading={busy} className="flex-1">
          {initial?.id ? "Зберегти зміни" : "Опублікувати"}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Скасувати
          </Button>
        )}
        {initial?.id && onDeleted && (
          <Button variant="danger" onClick={remove}>
            Видалити
          </Button>
        )}
      </div>
    </div>
  );
}
