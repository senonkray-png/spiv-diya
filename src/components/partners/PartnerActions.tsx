"use client";

import { useState, useTransition } from "react";

export function PartnerActions({ id, kind }: { id: string; kind: "incoming" | "outgoing" }) {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function act(action: "accept" | "reject") {
    setBusy(true);
    try {
      await fetch(`/api/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      startTransition(() => {
        if (typeof window !== "undefined") window.location.reload();
      });
    } finally {
      setBusy(false);
    }
  }

  if (kind === "incoming") {
    return (
      <div className="flex gap-2 shrink-0">
        <button
          disabled={busy}
          onClick={() => act("accept")}
          className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Прийняти
        </button>
        <button
          disabled={busy}
          onClick={() => act("reject")}
          className="text-xs font-semibold bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200"
        >
          Відмовити
        </button>
      </div>
    );
  }
  return null;
}
