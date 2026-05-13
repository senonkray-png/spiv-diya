"use client";

import Link from "next/link";

export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">Маркетплейс</p>
      <h1 className="mt-2 text-xl font-bold text-foreground">Не вдалось завантажити сторінку</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Сталася помилка сервера. Якщо це повторюється, перевірте у Vercel змінну{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code>, що міграції
        виконано під час збірки, і журнал функції (Logs).
      </p>
      {process.env.NODE_ENV === "development" && error?.message && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-xs text-foreground">
          {error.message}
        </pre>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          Спробувати знову
        </button>
        <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          На головну
        </Link>
      </div>
    </div>
  );
}
