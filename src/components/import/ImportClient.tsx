"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

const BROWSE_CONFIG_DEFAULT = `{
  "maxPages": 10,
  "selectors": {
    "productCard": ".product-item",
    "title": ".product-title",
    "price": ".price-value",
    "image": "img.main-photo",
    "volume": ".attr-volume",
    "nextPage": "a.next-page-btn"
  }
}`;

const SHOW_HEADLESS_IMPORT = process.env.NEXT_PUBLIC_IMPORT_HEADLESS === "1";

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

type ImportMode = "site" | "page" | "browse" | "smart";

export function ImportClient({ defaultUrl }: { defaultUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultUrl);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [committed, setCommitted] = useState<number | null>(null);
  const [lastMode, setLastMode] = useState<ImportMode>("site");

  const [smartLogs, setSmartLogs] = useState<Array<{ text: string; error?: boolean }>>([]);
  const [smartBusy, setSmartBusy] = useState(false);

  const [browseConfigJson, setBrowseConfigJson] = useState(BROWSE_CONFIG_DEFAULT);

  async function preview(mode: ImportMode) {
    setBusy(true);
    setError("");
    setCommitted(null);
    setLastMode(mode);
    try {
      const trimmed = url.trim();
      if (!trimmed) {
        setError("Вставте посилання на магазин або каталог.");
        return;
      }

      let body: Record<string, unknown> = { url: trimmed, mode };

      if (mode === "browse") {
        let parsed: { maxPages?: number; selectors?: Record<string, string> };
        try {
          parsed = JSON.parse(browseConfigJson) as { maxPages?: number; selectors?: Record<string, string> };
        } catch {
          setError("Некоректний JSON у блоці селекторів.");
          return;
        }
        body = {
          url: trimmed,
          mode: "browse",
          maxPages: typeof parsed.maxPages === "number" ? parsed.maxPages : 10,
          selectors: parsed.selectors && typeof parsed.selectors === "object" ? parsed.selectors : {},
        };
      }

      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
            ? "Не знайшли товари за sitemap і посиланнями. Спробуйте URL каталогу, режим «лише ця сторінка» на картці товару або (на VPS) режим з браузером, якщо він увімкнений."
            : mode === "browse"
              ? "На сторінці не знайдено карток за вашими селекторами. Перевірте CSS і кількість сторінок пагінації."
              : "На цій сторінці не вдалось розпізнати товар. Перевірте наявність мікророзмітки або відкрийте картку товару.",
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function smartPreview() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Вставте посилання на каталог товарів.");
      return;
    }
    setSmartBusy(true);
    setSmartLogs([]);
    setError("");
    setCommitted(null);
    setItems([]);
    setLastMode("smart");

    try {
      const res = await fetch(`/api/import/smart?url=${encodeURIComponent(trimmed)}`);
      if (!res.ok || !res.body) {
        setError("Не вдалося запустити аналіз.");
        setSmartBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventMatch = part.match(/^event: (\w+)/m);
          const dataMatch = part.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          let payload: { text?: string; isError?: boolean; items?: PreviewItem[]; error?: string };
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (event === "log") {
            setSmartLogs((prev) => [...prev, { text: payload.text ?? "", error: !!payload.isError }]);
          } else if (event === "done") {
            const fetched = (payload.items as PreviewItem[]) ?? [];
            setItems(fetched);
            const sel: Record<number, boolean> = {};
            fetched.forEach((_, i) => (sel[i] = true));
            setSelected(sel);
            if (fetched.length === 0) {
              setError(payload.error ?? "Товари не знайдено. Перевірте URL каталогу.");
            }
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSmartBusy(false);
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!busy) void preview("site");
              }
            }}
            placeholder="https://ваш-магазин.ua"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button onClick={() => void preview("site")} loading={busy} className="sm:min-w-[14rem]" size="md">
              Знайти товари (пошук)
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => void smartPreview()}
              loading={smartBusy}
              disabled={busy || smartBusy}
              size="md"
            >
              Аналіз сайту (Puppeteer)
            </Button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Вставте URL і натисніть «Знайти товари» або клавішу Enter. Збираємо адреси з sitemap, rel=next та посилань
            на сторінках, потім зчитуємо картки (до ліміту на сервері). Підтримуються Schema.org Product та Open Graph.
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

      {(smartBusy || smartLogs.length > 0) && (
        <Card padding="md">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-2">
            {smartBusy ? "Збираємо товари..." : "Аналіз завершено"}
          </h3>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs space-y-0.5">
            {smartLogs.map((log, i) => (
              <div key={i} className={log.error ? "text-red-400" : "text-green-300"}>
                {log.text}
              </div>
            ))}
            {smartBusy && (
              <div className="text-zinc-400 animate-pulse">▌</div>
            )}
          </div>
          {!smartBusy && items.length > 0 && (
            <div className="mt-3">
              <Button
                onClick={() => void commit()}
                loading={busy}
                disabled={Object.values(selected).filter(Boolean).length === 0}
                className="w-full"
              >
                Імпортувати {Object.values(selected).filter(Boolean).length} товарів у каталог
              </Button>
            </div>
          )}
        </Card>
      )}

      {SHOW_HEADLESS_IMPORT && (
        <Card padding="md">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-1">
            Розширений режим: каталог у браузері (JavaScript)
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Потрібні змінні на сервері: <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1">IMPORT_ENABLE_HEADLESS=1</code>.
            URL каталогу — у полі зверху. Нижче — JSON з <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1">maxPages</code> та{" "}
            <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1">selectors</code> (як у scripts/import-selectors.example.json).
          </p>
          <textarea
            value={browseConfigJson}
            onChange={(e) => setBrowseConfigJson(e.target.value)}
            spellCheck={false}
            rows={12}
            className="w-full font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-zinc-800 dark:text-zinc-200"
          />
          <div className="mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void preview("browse")}
              loading={busy}
              disabled={busy}
              size="md"
            >
              Зібрати картки з каталогу (браузер)
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 && committed === null && !busy && (
        <EmptyState
          title="Два кліки до імпорту"
          description={
            lastMode === "site"
              ? "Вставте адресу сайту й натисніть «Знайти товари» або Enter. Якщо список порожній — спробуйте «Лише ця сторінка» на картці товару."
              : lastMode === "browse"
                ? "Перевірте селектори та maxPages у JSON, або увімкніть IMPORT_ENABLE_HEADLESS на сервері."
                : "Відкрийте в браузері сторінку одного товару, скопіюйте URL сюди й оберіть «Лише ця сторінка»."
          }
        />
      )}

      {items.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Знайдено {items.length}{" "}
              {lastMode === "site"
                ? "(обхід сайту)"
                : lastMode === "browse"
                  ? "(каталог у браузері)"
                  : "(одна сторінка)"}
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
                  {it.photos?.[0] && (
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
                        {(() => {
                          try {
                            return new URL(it.sourceUrl).hostname;
                          } catch {
                            return "посилання";
                          }
                        })()}
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
