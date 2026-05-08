"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ResendVerifyButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    try {
      const res = await fetch("/api/auth/verify-resend", { method: "POST" });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return <span className="text-sm font-medium text-green-700 dark:text-green-400">Лист надіслано</span>;
  }

  return (
    <Button onClick={resend} loading={state === "sending"} variant="secondary" size="sm">
      Надіслати ще раз
    </Button>
  );
}
