"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function VerifyEmailAgainOpenButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendAgain() {
    setState("sending");
    try {
      const res = await fetch("/api/auth/send-verification-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return <span className="text-sm font-medium text-green-700 dark:text-green-400">Надіслано ще раз</span>;
  }

  return (
    <Button onClick={sendAgain} loading={state === "sending"} variant="secondary" size="sm">
      Надіслати лист ще раз
    </Button>
  );
}
