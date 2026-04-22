"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { register } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState = { error: "" };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">СпівДія</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Реєстрація нового підприємства</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">
          <form action={formAction} className="space-y-4">
            <Input label="Назва компанії" name="companyName" required placeholder="ТОВ Приклад" />
            <Input label="Галузь" name="industry" required placeholder="Виробництво, торгівля..." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Місто" name="city" required placeholder="Київ" />
              <Input label="Регіон" name="region" required placeholder="Київська обл." />
            </div>
            <Input label="Email" name="email" type="email" required placeholder="you@company.ua" />
            <Input label="Пароль" name="password" type="password" required placeholder="Мін. 8 символів" />

            {state.error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full mt-2" size="lg" loading={pending}>
              Зареєструватись
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Вже маєте акаунт?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Увійти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
