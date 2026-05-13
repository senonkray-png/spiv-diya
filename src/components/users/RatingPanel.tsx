"use client";

import { useEffect, useState } from "react";

interface Props {
  targetUserId: string;
  isLogged: boolean;
  isMe: boolean;
}

export function RatingPanel({ targetUserId, isLogged, isMe }: Props) {
  const [score, setScore] = useState(0);
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [my, setMy] = useState<"up" | "down" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ratings?targetUserId=${targetUserId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScore(data.score ?? 0);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUp(data.upCount ?? 0);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDown(data.downCount ?? 0);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMy(data.myVote ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  async function vote(value: "up" | "down") {
    if (!isLogged || isMe || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, value }),
      });
      if (!res.ok) return;
      // Optimistic re-fetch
      const r = await fetch(`/api/ratings?targetUserId=${targetUserId}`);
      const data = await r.json();
      setScore(data.score ?? 0);
      setUp(data.upCount ?? 0);
      setDown(data.downCount ?? 0);
      setMy(data.myVote ?? null);
    } finally {
      setBusy(false);
    }
  }

  const colour = score > 0 ? "text-emerald-600" : score < 0 ? "text-red-600" : "text-zinc-500";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex items-center gap-3">
      <div className="flex flex-col items-center min-w-[60px]">
        <p className={`text-xl font-bold ${colour}`}>
          {score > 0 ? `+${score}` : score}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">рейтинг</p>
      </div>
      <div className="flex-1 text-xs text-zinc-500">
        <p>{up} позитивних · {down} негативних</p>
        {!isLogged && <p className="mt-1">Увійдіть, щоб голосувати</p>}
        {isMe && <p className="mt-1">Це ваш профіль — ви не можете голосувати за себе</p>}
      </div>
      {!isMe && isLogged && (
        <div className="flex gap-1">
          <button
            onClick={() => vote("up")}
            disabled={busy}
            className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
              my === "up"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-700 hover:bg-emerald-50 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
            aria-label="like"
          >
            👍
          </button>
          <button
            onClick={() => vote("down")}
            disabled={busy}
            className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
              my === "down"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-zinc-100 text-zinc-700 hover:bg-red-50 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
            aria-label="dislike"
          >
            👎
          </button>
        </div>
      )}
    </div>
  );
}
