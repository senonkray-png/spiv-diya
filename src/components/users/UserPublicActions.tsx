"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  userId: string;
  isMe: boolean;
  isLogged: boolean;
  acceptsPartners: boolean;
  partnership: { id: string; status: string } | null;
  isFav: boolean;
}

export function UserPublicActions({
  userId,
  isMe,
  isLogged,
  acceptsPartners,
  partnership,
  isFav,
}: Props) {
  const [fav, setFav] = useState(isFav);
  const [busy, setBusy] = useState(false);

  if (isMe) {
    return (
      <Link
        href="/dashboard/profile"
        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium text-sm px-4 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 self-start"
      >
        Редагувати профіль
      </Link>
    );
  }

  if (!isLogged) {
    return (
      <Link
        href={`/register?next=/u/${userId}`}
        className="bg-blue-600 text-white font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 self-start"
      >
        Зареєструватись та зв&apos;язатись
      </Link>
    );
  }

  async function toggleFav() {
    setBusy(true);
    try {
      const next = !fav;
      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) setFav(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 self-start">
      <Link
        href={`/dashboard/messages?user=${userId}`}
        className="bg-blue-600 text-white font-medium text-sm px-4 py-2 rounded-xl hover:bg-blue-700"
      >
        Написати
      </Link>

      {acceptsPartners && !partnership && (
        <Link
          href={`/dashboard/partners/new?to=${userId}`}
          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium text-sm px-4 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          + Партнер
        </Link>
      )}
      {partnership?.status === "pending" && (
        <span className="bg-amber-100 text-amber-700 font-medium text-sm px-4 py-2 rounded-xl">
          Запит надіслано
        </span>
      )}
      {partnership?.status === "accepted" && (
        <span className="bg-green-100 text-green-700 font-medium text-sm px-4 py-2 rounded-xl">
          Партнер ✓
        </span>
      )}

      <button
        onClick={toggleFav}
        disabled={busy}
        className={`font-medium text-sm px-4 py-2 rounded-xl transition-colors ${
          fav
            ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        {fav ? "♥ В обраному" : "♡ Зберегти"}
      </button>
    </div>
  );
}
