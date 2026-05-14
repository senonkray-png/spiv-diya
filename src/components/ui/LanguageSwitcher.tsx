"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const LOCALES = [
  { code: "uk", label: "UA" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(code: string) {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 px-1 py-0.5">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => switchLocale(code)}
          className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
            locale === code
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
