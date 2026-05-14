"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

export type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; companyName: string; avatarUrl: string | null };
};

export function ProductCommentsSection({
  productId,
  initial,
  isLogged,
}: {
  productId: string;
  initial: CommentRow[];
  isLogged: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const t = text.trim();
    if (t.length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t }),
      });
      if (res.ok) {
        const d = await res.json();
        setItems((prev) => [...prev, { ...d.comment, createdAt: d.comment.createdAt }]);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Коментарі</h2>
      <div className="mt-4 space-y-4">
        {items.length === 0 && <p className="text-sm text-zinc-500">Ще немає коментарів.</p>}
        {items.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <Avatar src={c.user.avatarUrl} name={c.user.companyName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{c.user.companyName}</p>
              <p className="text-xs text-zinc-400">
                {new Date(c.createdAt).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
      {isLogged ? (
        <div className="mt-6 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Ваш коментар…"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            disabled={busy || text.trim().length < 2}
            onClick={send}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Надіслати
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Увійдіть, щоб залишити коментар.</p>
      )}
    </section>
  );
}
