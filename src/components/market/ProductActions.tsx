"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  productId?: string;
  serviceId?: string;
  ownerId: string;
  ownerName: string;
  isLogged: boolean;
  isOwner: boolean;
  isFav: boolean;
}

export function ProductActions({
  productId,
  serviceId,
  ownerId,
  ownerName,
  isLogged,
  isOwner,
  isFav,
}: Props) {
  const [fav, setFav] = useState(isFav);
  const [busy, setBusy] = useState(false);

  if (isOwner) {
    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link
          href={productId ? "/dashboard/products" : "/dashboard/services"}
          className="text-center bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium px-4 py-3 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Редагувати
        </Link>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link
          href="/register"
          className="text-center bg-blue-600 text-white font-medium px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Реєстрація для контакту
        </Link>
        <Link
          href="/login"
          className="text-center bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Увійти
        </Link>
      </div>
    );
  }

  async function toggleFav() {
    setBusy(true);
    try {
      const next = !fav;
      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, serviceId }),
      });
      if (res.ok) setFav(next);
    } finally {
      setBusy(false);
    }
  }

  const ctxParam = productId
    ? `?to=${ownerId}&context=product&id=${productId}`
    : `?to=${ownerId}&context=service&id=${serviceId}`;

  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link
          href={`/dashboard/messages${ctxParam}`}
          className="text-center bg-blue-600 text-white font-medium px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Написати {ownerName}
        </Link>
        <button
          onClick={toggleFav}
          disabled={busy}
          className={`font-medium px-4 py-3 rounded-xl transition-colors ${
            fav
              ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {fav ? "♥ В обраному" : "♡ В обране"}
        </button>
      </div>

      {productId && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/dashboard/partners/new?to=${ownerId}`}
            className="text-center bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Запросити в партнери
          </Link>
          <Link
            href="/marketplace/cart"
            className="text-center bg-violet-600 text-white font-medium px-4 py-3 rounded-xl hover:bg-violet-700"
          >
            Кошик
          </Link>
        </div>
      )}
    </div>
  );
}
