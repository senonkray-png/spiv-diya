"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [magicState, setMagicState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [magicError, setMagicError] = useState<string | null>(null);

  async function sendMagic() {
    if (!email.trim()) {
      setMagicError("Введіть email");
      return;
    }
    setMagicError(null);
    setMagicState("sending");
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMagicError(data.error ?? "Не вдалось надіслати лист");
        setMagicState("error");
        return;
      }
      setMagicState("sent");
    } catch {
      setMagicError("Не вдалось надіслати лист");
      setMagicState("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">СпівДія</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Вхід до платформи</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
          {/* Mode switch */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 text-xs md:text-sm font-medium py-2 rounded-lg transition-colors ${
                mode === "password"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              За паролем
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`flex-1 text-xs md:text-sm font-medium py-2 rounded-lg transition-colors ${
                mode === "magic"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              Швидкий вхід (на email)
            </button>
          </div>

          {mode === "password" ? (
            <form action={formAction} className="space-y-4">
              <Input label="Email" name="email" type="email" required placeholder="you@company.ua" />
              <Input label="Пароль" name="password" type="password" required placeholder="Ваш пароль" />

              {state.error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full mt-2" size="lg" loading={pending}>
                Увійти
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.ua"
                hint="Надішлемо посилання для входу. Без пароля."
              />

              {magicError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  {magicError}
                </p>
              )}

              {magicState === "sent" ? (
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-4 py-3 text-sm">
                  <p className="font-semibold">Готово!</p>
                  <p className="mt-1">Якщо акаунт існує, ми надіслали посилання для входу на <b>{email}</b>. Воно дійсне 15 хвилин.</p>
                </div>
              ) : (
                <Button onClick={sendMagic} loading={magicState === "sending"} className="w-full" size="lg">
                  Надіслати посилання
                </Button>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-zinc-500">
            Ще немає акаунту?{" "}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Зареєструватись
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
