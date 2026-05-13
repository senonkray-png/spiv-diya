"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

const MIN_MESSAGE = 12;

export function PartnerInviteForm({ targetId }: { targetId: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touch, setTouch] = useState(false);

  const tooShort =
    touch && message.trim().length > 0 && message.trim().length < MIN_MESSAGE;

  async function submit() {
    setTouch(true);
    if (message.trim().length === 0) {
      setError("");
      return;
    }
    if (message.trim().length < MIN_MESSAGE) {
      setError("");
      return;
    }
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
        label="Ваше повідомлення *"
        rows={5}
        value={message}
        error={tooShort ? `Мінімум ${MIN_MESSAGE} символів` : undefined}
        onBlur={() => setTouch(true)}
        onChange={(e) => {
          setMessage(e.target.value);
          if (error) setError("");
        }}
        placeholder="Розкажіть, чому ви хочете співпрацювати — про спільні інтереси, обмін ресурсами, проекти..."
      />
      <AnimatePresence>
        {error && (
          <motion.p
            key={error}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-sm text-destructive bg-muted rounded-lg px-3 py-2 border border-destructive/20"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <Button onClick={submit} loading={busy} className="w-full">
        Надіслати запит
      </Button>
    </div>
  );
}
