"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ResendVerifyOpenButton } from "@/components/auth/ResendVerifyOpenButton";

const GOOGLE_ERR: Record<string, string> = {
  google_config: "Google не налаштовано на сервері. Зверніться до адміністратора.",
  google_denied: "Вхід через Google скасовано.",
  google_state: "Помилка безпеки сесії. Спробуйте ще раз.",
  google_token: "Не вдалось отримати токен Google. Спробуйте пізніше.",
  google_profile: "Не вдалось прочитати профіль Google.",
  google_account_conflict: "Цей Google-акаунт уже прив’язаний до іншого користувача.",
};

const initialState: LoginState = {};

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const urlHint = urlError ? GOOGLE_ERR[urlError] ?? "Помилка входу. Спробуйте ще раз." : null;

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
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <GoogleG />
            Продовжити з Google
          </a>
          <p className="text-[11px] text-zinc-400 text-center mt-2">
            Швидка реєстрація та вхід. Пошта вважається підтвердженою через Google.
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">або email</span>
            </div>
          </div>

          {urlHint && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 mb-4">
              {urlHint}
            </p>
          )}

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
              Посилання на email
            </button>
          </div>

          {mode === "password" ? (
            <form action={formAction} className="space-y-4">
              <Input label="Email" name="email" type="email" required placeholder="you@company.ua" />
              <Input label="Пароль" name="password" type="password" required placeholder="Ваш пароль" />

              {state.error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 space-y-2">
                  <p>{state.error}</p>
                  {state.unverifiedEmail && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Не отримали лист?</span>
                      <ResendVerifyOpenButton email={state.unverifiedEmail} />
                    </div>
                  )}
                </div>
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
                hint="Надішлемо посилання для входу (підтверджує пошту)."
              />

              {magicError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  {magicError}
                </p>
              )}

              {magicState === "sent" ? (
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-4 py-3 text-sm">
                  <p className="font-semibold">Готово!</p>
                  <p className="mt-1">
                    Якщо акаунт існує, ми надіслали посилання на <b>{email}</b>. Воно дійсне 15 хвилин.
                  </p>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-zinc-500">Завантаження…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function GoogleG() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
