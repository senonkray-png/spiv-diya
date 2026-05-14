"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

type Vote = "up" | "down" | null;

export function ProductVoteBlock({
  productId,
  initialUp,
  initialDown,
  initialMy,
  isLogged,
}: {
  productId: string;
  initialUp: number;
  initialDown: number;
  initialMy: Vote;
  isLogged: boolean;
}) {
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [mine, setMine] = useState<Vote>(initialMy);
  const [busy, setBusy] = useState(false);

  async function send(value: Vote) {
    if (!isLogged) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: value === mine ? null : value }),
      });
      if (res.ok) {
        const d = await res.json();
        setUp(d.likeCount);
        setDown(d.dislikeCount);
        setMine(d.myVote ?? null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className="text-sm text-zinc-500">Оцінка товару</span>
      <button
        type="button"
        disabled={!isLogged || busy}
        onClick={() => send("up")}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
          mine === "up"
            ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200"
            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        }`}
      >
        <ThumbsUp className="size-4" aria-hidden />
        {up}
      </button>
      <button
        type="button"
        disabled={!isLogged || busy}
        onClick={() => send("down")}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
          mine === "down"
            ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        }`}
      >
        <ThumbsDown className="size-4" aria-hidden />
        {down}
      </button>
      {!isLogged && <span className="text-xs text-zinc-400">Увійдіть, щоб голосувати</span>}
    </div>
  );
}
