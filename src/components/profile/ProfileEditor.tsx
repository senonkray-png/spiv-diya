"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { roleLabelUk } from "@/lib/role-labels";
import type { UserRole } from "@/types";

type ProfileForm = {
  companyName: string;
  fullName: string;
  industry: string;
  businessNiche: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  workPhone: string;
  websiteUrl: string;
  avatarUrl: string;
  bannerUrl: string;
  aboutMe: string;
  telegram: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  acceptsPartners: boolean;
  role: "member" | "provider" | "buyer";
  interests: string[];
};

const ROLE_OPTIONS = [
  { value: "member", label: "Новий учасник (оберіть тариф у кабінеті)" },
  { value: "provider", label: "Продавець" },
  { value: "buyer", label: "Покупець" },
];

interface Props {
  initial: ProfileForm & { email: string; balance: number; verified: boolean; accountRole: UserRole };
}

export function ProfileEditor({ initial }: Props) {
  const canEditRole = (["member", "provider", "buyer"] as const).includes(
    initial.accountRole as "member" | "provider" | "buyer",
  );

  const [form, setForm] = useState<ProfileForm>({
    companyName: initial.companyName ?? "",
    fullName: initial.fullName ?? "",
    industry: initial.industry ?? "",
    businessNiche: initial.businessNiche ?? "",
    city: initial.city ?? "",
    region: initial.region ?? "",
    country: initial.country ?? "Україна",
    phone: initial.phone ?? "",
    workPhone: initial.workPhone ?? "",
    websiteUrl: initial.websiteUrl ?? "",
    avatarUrl: initial.avatarUrl ?? "",
    bannerUrl: initial.bannerUrl ?? "",
    aboutMe: initial.aboutMe ?? "",
    telegram: initial.telegram ?? "",
    instagram: initial.instagram ?? "",
    facebook: initial.facebook ?? "",
    whatsapp: initial.whatsapp ?? "",
    acceptsPartners: initial.acceptsPartners ?? true,
    role: canEditRole
      ? (initial.accountRole as ProfileForm["role"])
      : ("member" as ProfileForm["role"]),
    interests: initial.interests ?? [],
  });

  const [interestDraft, setInterestDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addInterest(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (form.interests.includes(t)) return;
    update("interests", [...form.interests, t].slice(0, 30));
    setInterestDraft("");
  }

  function removeInterest(value: string) {
    update("interests", form.interests.filter((i) => i !== value));
  }

  async function save() {
    setStatus("saving");
    try {
      const { role, ...rest } = form;
      const profile = canEditRole ? { ...form } : { ...rest };

      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
      startTransition(() => {
        // Refresh server components so the new role/data is visible everywhere.
        if (typeof window !== "undefined") window.location.reload();
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <Avatar src={form.avatarUrl} name={form.companyName || form.fullName} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white truncate">
                {form.companyName || form.fullName || "Без назви"}
              </h2>
              {initial.verified && <Badge variant="green">Перевірено</Badge>}
              <Badge variant="blue">
                {canEditRole
                  ? ROLE_OPTIONS.find((r) => r.value === form.role)?.label
                  : roleLabelUk(initial.accountRole)}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-1 truncate">{initial.email}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Баланс: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{initial.balance}</span> СпівМонет
            </p>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Тип акаунту</h3>
        {canEditRole ? (
          <>
            <Select
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(e) => update("role", e.target.value as ProfileForm["role"])}
            />
            <p className="text-xs text-zinc-500 mt-2">
              Продавець — розміщення товарів і послуг (потрібен тариф). Покупець — пошук і закупівлі.
              Підприємець оформлюється окремим тарифом на сторінці «Вітаємо».
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-900/50">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Поточна роль: <span className="font-semibold">{roleLabelUk(initial.accountRole)}</span>.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Щоб змінити тариф (продавець / підприємець), перейдіть до вибору плану в кабінеті.
            </p>
          </div>
        )}
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Основна інформація</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Назва компанії *"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
          <Input
            label="Контактна особа"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="Ім'я Прізвище"
          />
          <Input
            label="Галузь"
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            placeholder="Виробництво, послуги..."
          />
          <Input
            label="Спеціалізація / ніша"
            value={form.businessNiche}
            onChange={(e) => update("businessNiche", e.target.value)}
            placeholder="Дитячі іграшки, IT-консалтинг..."
          />
          <Input
            label="Країна"
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
          />
          <Input
            label="Регіон"
            value={form.region}
            onChange={(e) => update("region", e.target.value)}
          />
          <Input
            label="Місто"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Контакти</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Телефон"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+380 XX XXX XX XX"
          />
          <Input
            label="Робочий телефон"
            value={form.workPhone}
            onChange={(e) => update("workPhone", e.target.value)}
          />
          <Input
            label="Сайт компанії"
            value={form.websiteUrl}
            onChange={(e) => update("websiteUrl", e.target.value)}
            placeholder="https://example.com"
          />
          <Input
            label="Telegram"
            value={form.telegram}
            onChange={(e) => update("telegram", e.target.value)}
            placeholder="@username"
          />
          <Input
            label="Instagram"
            value={form.instagram}
            onChange={(e) => update("instagram", e.target.value)}
          />
          <Input
            label="Facebook"
            value={form.facebook}
            onChange={(e) => update("facebook", e.target.value)}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
          />
        </div>
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Зовнішній вигляд</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="URL аватара"
            value={form.avatarUrl}
            onChange={(e) => update("avatarUrl", e.target.value)}
            placeholder="https://...image.png"
          />
          <Input
            label="URL банера"
            value={form.bannerUrl}
            onChange={(e) => update("bannerUrl", e.target.value)}
            placeholder="https://...cover.png"
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Можна вставити пряме посилання на зображення (наприклад, з Imgur, S3 або вашого сайту).
        </p>
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Про вашу компанію</h3>
        <Textarea
          rows={5}
          value={form.aboutMe}
          onChange={(e) => update("aboutMe", e.target.value)}
          placeholder="Розкажіть, чим ви займаєтесь, з ким співпрацюєте та що шукаєте..."
        />
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Інтереси / теги</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.interests.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => removeInterest(tag)}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-3 py-1 hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Видалити"
            >
              {tag}
              <span className="text-[10px]">×</span>
            </button>
          ))}
          {form.interests.length === 0 && (
            <span className="text-xs text-zinc-400">Додайте кілька тегів — це допоможе знайти партнерів.</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={interestDraft}
            onChange={(e) => setInterestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest(interestDraft);
              }
            }}
            placeholder="Наприклад: експорт, дерево, виробництво"
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          <Button type="button" variant="secondary" onClick={() => addInterest(interestDraft)}>
            Додати
          </Button>
        </div>
      </Card>

      <Card padding="md">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptsPartners}
            onChange={(e) => update("acceptsPartners", e.target.checked)}
            className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900 dark:text-white">
              Приймаю запрошення стати партнером
            </span>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Інші користувачі зможуть надсилати вам запити на співпрацю.
            </span>
          </span>
        </label>
      </Card>

      <div className="sticky bottom-16 md:bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-3">
        <div className="text-xs text-zinc-500 min-w-0">
          {status === "saving" && "Зберігаємо..."}
          {status === "saved" && <span className="text-green-600">Збережено</span>}
          {status === "error" && <span className="text-red-600">Помилка</span>}
          {status === "idle" && "Зміни автоматично з'являться у вашому публічному профілі."}
        </div>
        <Button onClick={save} loading={status === "saving"} size="md">
          Зберегти
        </Button>
      </div>
    </div>
  );
}
