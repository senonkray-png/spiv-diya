"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { effectivePriceUah, syncPriceTokensFromUah } from "@/lib/pricing";

type Listing = "product" | "service-offer" | "service-request";

interface ProductFormValues {
  title: string;
  description: string;
  priceUAH: string;
  priceTokens: string;
  discountPercent: string;
  stockQuantity: string;
  dimensionsText: string;
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

const STEPS = [
  { id: 1, title: "Опис" },
  { id: 2, title: "Ціна й локація" },
  { id: 3, title: "Медіа" },
] as const;

function ProductPricePreview({ priceUAH, discountPercent }: { priceUAH: string; discountPercent: string }) {
  const u = priceUAH === "" ? null : Number(priceUAH);
  const d = Math.min(100, Math.max(0, Math.round(Number(discountPercent || 0))));
  if (u == null || Number.isNaN(u) || u <= 0) {
    return (
      <p className="text-xs text-muted-foreground -mt-1">
        Вкажіть ціну в ₴, щоб побачити суму в СпівМонетах.
      </p>
    );
  }
  const eff = effectivePriceUah(u, d);
  const tok = syncPriceTokensFromUah(u, d);
  return (
    <p className="text-xs text-muted-foreground -mt-1 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
      <span className="font-medium text-foreground">{eff.toLocaleString("uk-UA")} ₴</span>
      {d > 0 && <span> після знижки {d}%</span>}
      <span className="text-muted-foreground"> ≈ </span>
      <span className="font-medium text-foreground">{tok} СпівМонет</span>
    </p>
  );
}

export function ProductForm({ kind, initial, onSaved, onCancel, onDeleted }: Props) {
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState<ProductFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    priceUAH: initial?.priceUAH ?? "",
    priceTokens: initial?.priceTokens ?? "0",
    discountPercent: initial?.discountPercent ?? "0",
    stockQuantity: initial?.stockQuantity ?? "",
    dimensionsText: initial?.dimensionsText ?? "",
    category: initial?.category ?? "",
    city: initial?.city ?? "",
    region: initial?.region ?? "",
    photos: initial?.photos ?? [],
    status: initial?.status ?? "active",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  function update<K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setFieldErrors((e) => {
      const key = String(k);
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function addPhoto() {
    const u = photoUrl.trim();
    if (!u) return;
    try {
      // eslint-disable-next-line no-new -- validate URL shape
      new URL(u);
    } catch {
      setFieldErrors((e) => ({ ...e, photoUrl: "Вкажіть коректну адресу (https://...)" }));
      return;
    }
    if (form.photos.includes(u)) return;
    setFieldErrors((e) => {
      const next = { ...e };
      delete next.photoUrl;
      return next;
    });
    update("photos", [...form.photos, u].slice(0, 10));
    setPhotoUrl("");
  }

  function validateStep(s: number): boolean {
    const nextErr: Partial<Record<string, string>> = {};

    if (s === 1) {
      if (!form.title.trim()) nextErr.title = "Вкажіть назву";
      else if (form.title.trim().length < 2) nextErr.title = "Хоча б 2 символи";
      if (!form.description.trim()) nextErr.description = "Додайте опис";
      else if (form.description.trim().length < 10)
        nextErr.description = "Опишіть докладніше (мін. 10 символів)";
    }

    if (s === 2) {
      if (form.priceUAH !== "" && Number.isNaN(Number(form.priceUAH)))
        nextErr.priceUAH = "Лише число";
      if (Number(form.priceUAH) < 0) nextErr.priceUAH = "Не може бути від'ємною";
      if (kind !== "product") {
        if (form.priceTokens !== "" && Number.isNaN(Number(form.priceTokens)))
          nextErr.priceTokens = "Лише число";
        const pt = Number(form.priceTokens || 0);
        if (pt < 0) nextErr.priceTokens = "Не може бути від'ємною";
      } else {
        const d = Number(form.discountPercent);
        if (form.discountPercent !== "" && Number.isNaN(d)) nextErr.discountPercent = "Лише число";
        else if (d < 0 || d > 100) nextErr.discountPercent = "0–100%";
        if (form.stockQuantity !== "" && Number.isNaN(Number(form.stockQuantity)))
          nextErr.stockQuantity = "Лише число";
        else if (form.stockQuantity !== "" && Number(form.stockQuantity) < 0)
          nextErr.stockQuantity = "Не від'ємне";
      }
    }

    if (s === 3 && photoUrl.trim()) {
      try {
        new URL(photoUrl.trim());
      } catch {
        nextErr.photoUrl = "Некоректний URL перед додаванням";
      }
    }

    setFieldErrors(nextErr);
    setError("");
    return Object.keys(nextErr).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length));
  }

  function goPrev() {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function submit() {
    if (!validateStep(1) || !validateStep(2)) {
      const firstBroken = !form.title.trim() || form.description.trim().length < 10 ? 1 : 2;
      setStep(firstBroken);
      return;
    }
    if (!validateStep(3)) return;

    setError("");
    setBusy(true);
    try {
      const endpoint =
        kind === "product"
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

      if (kind === "product") {
        const uah = form.priceUAH === "" ? null : Number(form.priceUAH);
        const disc = Math.min(100, Math.max(0, Math.round(Number(form.discountPercent || 0))));
        body.discountPercent = disc;
        body.stockQuantity =
          form.stockQuantity.trim() === "" ? null : Math.max(0, Math.round(Number(form.stockQuantity)));
        body.dimensionsText = form.dimensionsText.trim() || null;
        if (uah != null && !Number.isNaN(uah)) {
          body.priceTokens = syncPriceTokensFromUah(uah, disc);
        }
      }

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

      setSavedFlash(true);
      await new Promise((r) => setTimeout(r, reduceMotion ? 200 : 650));
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
      setSavedFlash(false);
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

  const stepMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };

  return (
    <div className="relative space-y-4">
      {busy && (
        <div
          aria-busy="true"
          aria-label="Збереження"
          className="absolute inset-0 z-10 flex flex-col gap-3 rounded-xl bg-background/65 p-4 backdrop-blur-[2px]"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <p className="text-center text-xs text-muted-foreground">Зберігаємо…</p>
        </div>
      )}

      <AnimatePresence>
        {savedFlash && (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/85 backdrop-blur-sm"
          >
            <motion.div
              initial={reduceMotion ? undefined : { scale: 0 }}
              animate={reduceMotion ? undefined : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <CheckCircle2 className="size-14 text-green-600 dark:text-green-400" aria-hidden />
            </motion.div>
            <p className="font-semibold text-foreground">Збережено</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Прогрес */}
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map(({ id, title }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id < step) setStep(id);
            }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              step === id
                ? "border-primary bg-primary/10 text-primary dark:bg-primary/15"
                : id < step
                  ? "border-border bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer"
                  : "cursor-default border-border/70 bg-muted/20 text-muted-foreground opacity-70"
            }`}
            disabled={id > step}
          >
            <span className="tabular-nums">{id}</span>
            {title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          {...stepMotion}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          className="space-y-3"
        >
          {step === 1 && (
            <>
              <Input
                label={titleLabel + " *"}
                value={form.title}
                error={fieldErrors.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder={
                  kind === "service-request" ? "Шукаю бухгалтера" : "Дерев'яні піддони"
                }
              />
              <Textarea
                label="Опис *"
                rows={4}
                value={form.description}
                error={fieldErrors.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Детально опишіть умови, характеристики, об'єм..."
              />
              <Select
                label="Категорія"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                options={PRODUCT_CATEGORIES}
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ціна (₴)"
                  type="number"
                  min="0"
                  value={form.priceUAH}
                  error={fieldErrors.priceUAH}
                  onChange={(e) => update("priceUAH", e.target.value)}
                  placeholder="100"
                />
                {kind === "product" ? (
                  <Input
                    label="Знижка, %"
                    type="number"
                    min="0"
                    max="100"
                    value={form.discountPercent}
                    error={fieldErrors.discountPercent}
                    onChange={(e) => update("discountPercent", e.target.value)}
                    placeholder="0"
                  />
                ) : (
                  <Input
                    label="Ціна в монетах"
                    type="number"
                    min="0"
                    value={form.priceTokens}
                    error={fieldErrors.priceTokens}
                    onChange={(e) => update("priceTokens", e.target.value)}
                    placeholder="0"
                  />
                )}
              </div>
              {kind === "product" && (
                <ProductPricePreview priceUAH={form.priceUAH} discountPercent={form.discountPercent} />
              )}
              {kind !== "product" && (
                <p className="text-xs text-muted-foreground -mt-1">
                  Залиште 0 або порожнє — позначимо як «Договірна».
                </p>
              )}
              {kind === "product" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Кількість на складі"
                      type="number"
                      min="0"
                      value={form.stockQuantity}
                      error={fieldErrors.stockQuantity}
                      onChange={(e) => update("stockQuantity", e.target.value)}
                      placeholder="Порожньо — без обліку"
                    />
                    <Input
                      label="Розміри / габарити"
                      value={form.dimensionsText}
                      onChange={(e) => update("dimensionsText", e.target.value)}
                      placeholder="напр. 40×30×12 см"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Оплата в СпівМонетах підраховується автоматично з ціни в ₴ та знижки.
                  </p>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Місто"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Київ"
                />
                <Input
                  label="Регіон"
                  value={form.region}
                  onChange={(e) => update("region", e.target.value)}
                  placeholder="Київська обл."
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label
                  htmlFor="product-photo-url"
                  className="text-sm font-medium text-foreground"
                >
                  Фото (URL)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="product-photo-url"
                    value={photoUrl}
                    onChange={(e) => {
                      setPhotoUrl(e.target.value);
                      if (fieldErrors.photoUrl)
                        setFieldErrors((e0) => {
                          const next = { ...e0 };
                          delete next.photoUrl;
                          return next;
                        });
                    }}
                    placeholder="https://...image.jpg"
                    className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-card-foreground shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  />
                  <Button type="button" variant="secondary" onClick={addPhoto}>
                    +
                  </Button>
                </div>
                {fieldErrors.photoUrl && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.photoUrl}</p>
                )}
                {form.photos.length > 0 && (
                  <motion.div layout className="mt-3 grid grid-cols-4 gap-2">
                    {form.photos.map((u) => (
                      <motion.div
                        layout
                        key={u}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => update(
                            "photos",
                            form.photos.filter((p) => p !== u),
                          )}
                          className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
                          aria-label="Прибрати фото"
                        >
                          ×
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {initial?.id && (
                <Select
                  label="Статус"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value as ProductFormValues["status"])}
                  options={[
                    { value: "active", label: "Активне (на вітрині)" },
                    { value: "paused", label: "Приховано (пауза)" },
                  ]}
                />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="text-sm text-destructive bg-muted rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {step > 1 && (
          <Button type="button" variant="ghost" onClick={goPrev} disabled={busy}>
            <ChevronLeft className="size-4" aria-hidden />
            Назад
          </Button>
        )}
        <div className="flex-1" />
        {step < STEPS.length ? (
          <Button type="button" onClick={goNext} className="min-w-[8rem]" disabled={busy}>
            Далі
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={() => submit()} loading={busy} className="min-w-[10rem]" disabled={savedFlash}>
            {initial?.id ? "Зберегти зміни" : "Опублікувати"}
          </Button>
        )}
      </div>

      {(onCancel || (initial?.id && onDeleted)) && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {onCancel && (
            <Button variant="secondary" type="button" onClick={onCancel} disabled={busy}>
              Скасувати
            </Button>
          )}
          {initial?.id && onDeleted && (
            <Button variant="danger" type="button" onClick={remove} disabled={busy}>
              Видалити
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
