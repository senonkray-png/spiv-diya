"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: LoginState = {};

const URL_ERRORS: Record<string, string> = {
  oauth_disabled: "Швидкий вхід (Google) тимчасово вимкнено. Увійдіть email та паролем.",
  google_config: "Вхід через Google наразі не налаштований на сервері.",
  google_denied: "Вхід через Google скасовано.",
  google_state: "Помилка безпеки OAuth. Спробуйте ще раз.",
  google_token: "Не вдалося отримати токен Google.",
  google_profile: "Не вдалося прочитати профіль Google.",
  google_account_conflict: "Цей Google-акаунт уже прив’язаний до іншого запису.",
};

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const errKey = searchParams.get("error");
  const nextParam = searchParams.get("next") ?? "";
  const urlMessage = errKey ? (URL_ERRORS[errKey] ?? "Сталася помилка входу. Спробуйте ще раз.") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/marketplace" className="text-3xl font-bold text-zinc-900 dark:text-white hover:underline">
            СпівДія
          </Link>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Вхід до платформи (email та пароль)</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
          {urlMessage && (
            <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 mb-4">
              {urlMessage}
            </p>
          )}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={nextParam} />
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900">
          <p className="text-zinc-500">Завантаження…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
