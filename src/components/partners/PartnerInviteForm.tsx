"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export function PartnerInviteForm({ targetId }: { targetId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не вдалось надіслати");
      router.push("/dashboard/partners");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        label="Ваше повідомлення"
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Розкажіть, чому ви хочете співпрацювати — про спільні інтереси, обмін ресурсами, проекти..."
      />
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
      <Button onClick={submit} loading={busy} className="w-full">
        Надіслати запит
      </Button>
    </div>
  );
}
