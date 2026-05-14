"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

interface PreviewItem {
  title: string;
  description: string;
  priceUAH: number | null;
  priceTokens: number;
  photos: string[];
  sourceUrl: string;
  externalId?: string;
  dimensionsText?: string | null;
}

type ImportMode = "site" | "page";

export function ImportClient({ defaultUrl }: { defaultUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultUrl);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [committed, setCommitted] = useState<number | null>(null);
  const [lastMode, setLastMode] = useState<ImportMode>("site");

  async function preview(mode: ImportMode) {
    setBusy(true);
    setError("");
    setCommitted(null);
    setLastMode(mode);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Помилка");
      const fetched = (data.items as PreviewItem[]) ?? [];
      setItems(fetched);
      const sel: Record<number, boolean> = {};
      fetched.forEach((_, i) => (sel[i] = true));
      setSelected(sel);
      if (fetched.length === 0) {
        setError(
          mode === "site"
            ? "Не знайшли товари за sitemap і посиланнями. Спробуйте головну сторінку магазину або режим «лише ця сторінка»."
            : "На цій сторінці не вдалось розпізнати товар. Перевірте наявність мікророзмітки або відкрийте картку товару.",
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError("");
    try {
      const payload = items.filter((_, i) => selected[i]);
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Помилка");
      setCommitted(data.created ?? 0);
      setItems([]);
      setSelected({});
      setTimeout(() => router.push("/dashboard/products"), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  function updateItem(i: number, patch: Partial<PreviewItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-4">
      <Card padding="md">
        <div className="flex flex-col gap-3">
          <Input
            label="Посилання на сайт або сторінку магазину"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ваш-магазин.ua"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button onClick={() => void preview("site")} loading={busy} className="sm:min-w-[14rem]" size="md">
              Отримати товари з сайту
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void preview("page")}
              loading={busy}
              disabled={busy}
              size="md"
            >
              Лише ця сторінка
            </Button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Перший крок: вставте URL магазину (головна, каталог або товар). Другий крок: натисніть «Отримати товари з
            сайту» — ми зберемо адреси з sitemap і посилань і підтягнемо фото, назву, опис, ціну та характеристики з
            мікророзмітки, якщо вони є.
          </p>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>
        )}
        {committed !== null && (
          <p className="mt-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
            Імпортовано {committed} товарів. Перенаправляю до каталогу...
          </p>
        )}
      </Card>

      {items.length === 0 && committed === null && !busy && (
        <EmptyState
          title="Два кліки до імпорту"
          description={
            lastMode === "site"
              ? "Вставте адресу сайту і натисніть «Отримати товари з сайту». Якщо товарів мало — натисніть «Лише ця сторінка» на відкритій картці товару."
              : "Відкрийте в браузері сторінку одного товару, скопіюйте URL сюди й оберіть «Лише ця сторінка»."
          }
        />
      )}

      {items.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Знайдено {items.length}{" "}
              {lastMode === "site" ? "(обхід сайту)" : "(одна сторінка)"}
            </h3>
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => {
                  const allOn = items.every((_, i) => prev[i]);
                  const next: Record<number, boolean> = {};
                  items.forEach((_, i) => (next[i] = !allOn));
                  return next;
                })
              }
              className="text-xs text-blue-600 hover:underline"
            >
              {items.every((_, i) => selected[i]) ? "Зняти всі" : "Вибрати всі"}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, i) => (
              <div
                key={`${it.sourceUrl}-${i}`}
                className={`border rounded-2xl p-3 transition-colors ${
                  selected[i]
                    ? "border-blue-300 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-700"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[i]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [i]: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded text-blue-600"
                  />
                  {it.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.photos[0]}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover bg-zinc-100 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      value={it.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                      className="w-full font-semibold text-sm text-zinc-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none"
                    />
                    <textarea
                      value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      rows={2}
                      className="w-full text-xs text-zinc-600 dark:text-zinc-400 bg-transparent rounded p-1 resize-none border border-transparent hover:border-zinc-300 focus:border-blue-300 focus:outline-none"
                    />
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        Фасовка / розміри (з сайту, можна змінити)
                      </label>
                      <input
                        value={it.dimensionsText ?? ""}
                        onChange={(e) => updateItem(i, { dimensionsText: e.target.value || null })}
                        placeholder="напр. Вага: 1 кг; Об'єм: 500 мл"
                        className="mt-0.5 w-full rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-zinc-500">₴</span>
                      <input
                        type="number"
                        value={it.priceUAH ?? ""}
                        onChange={(e) =>
                          updateItem(i, { priceUAH: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        placeholder="Ціна ₴"
                        className="w-24 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                      <span className="text-zinc-400">монети (необов’язково)</span>
                      <input
                        type="number"
                        value={it.priceTokens || 0}
                        onChange={(e) => updateItem(i, { priceTokens: Number(e.target.value) || 0 })}
                        placeholder="0 = авто з ₴"
                        className="w-24 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                      />
                      <a
                        href={it.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-blue-600 truncate max-w-[10rem]"
                      >
                        {new URL(it.sourceUrl).hostname}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-zinc-500">
              Вибрано: <span className="font-semibold">{Object.values(selected).filter(Boolean).length}</span>
            </p>
            <Button
              onClick={() => void commit()}
              loading={busy}
              disabled={Object.values(selected).filter(Boolean).length === 0}
            >
              Імпортувати у каталог
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
