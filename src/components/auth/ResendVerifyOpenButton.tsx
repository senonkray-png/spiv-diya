"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ResendVerifyOpenButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    try {
      const res = await fetch("/api/auth/verify-resend-open", {
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
    <Button onClick={resend} loading={state === "sending"} variant="secondary" size="sm">
      Надіслати лист ще раз
    </Button>
  );
}
