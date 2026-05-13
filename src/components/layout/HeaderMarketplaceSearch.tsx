"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Scope = "all" | "products" | "services";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "Усе" },
  { value: "products", label: "Товари" },
  { value: "services", label: "Послуги" },
];

function buildHref(scope: Scope, q: string): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  const qs = query.toString();
  if (scope === "products") return `/marketplace/products${qs ? `?${qs}` : ""}`;
  if (scope === "services") return `/marketplace/services${qs ? `?${qs}` : ""}`;
  return `/marketplace/search${qs ? `?${qs}` : ""}`;
}

export function HeaderMarketplaceSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("all");
  const [q, setQ] = useState("");

  const submit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = q.trim();
      router.push(buildHref(scope, trimmed));
    },
    [q, scope, router],
  );

  return (
    <form
      onSubmit={submit}
      className={`flex w-full max-w-xl md:max-w-2xl items-stretch rounded-xl border border-border bg-card/90 shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-primary/30 ${className}`}
      role="search"
      aria-label="Пошук маркетплейсу"
    >
      <label className="sr-only" htmlFor="header-search-scope">
        Область пошуку
      </label>
      <select
        id="header-search-scope"
        value={scope}
        onChange={(e) => setScope(e.target.value as Scope)}
        className="shrink-0 max-w-[5.5rem] sm:max-w-[6.5rem] cursor-pointer rounded-l-xl border-0 border-r border-border bg-muted/40 py-2 pl-2 pr-1 text-xs font-medium text-foreground outline-none focus:z-10"
      >
        {SCOPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="header-search-q">
        Запит
      </label>
      <input
        id="header-search-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Я шукаю…"
        className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
        autoComplete="off"
      />
      <button
        type="submit"
        className="flex shrink-0 items-center justify-center rounded-r-xl border-0 border-l border-border bg-primary/10 px-3 text-primary transition-colors hover:bg-primary/20"
        aria-label="Шукати"
      >
        <Search className="size-4" aria-hidden />
      </button>
    </form>
  );
}
