"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export type LoginState = { error?: string; unverifiedEmail?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Введіть email та пароль." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Невірний email або пароль." };
  }

  if (!user.passwordHash) {
    return { error: "Цей акаунт прив’язаний до Google. Увійдіть кнопкою «Продовжити з Google»." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Невірний email або пароль." };
  }

  if (!user.emailVerified) {
    return {
      error: "Спочатку підтвердіть пошту — відкрийте посилання з листа або натисніть «Надіслати лист ще раз».",
      unverifiedEmail: user.email,
    };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
  });

  if (user.role === "member" && user.subscriptionPlan === "free") {
    redirect("/welcome");
  }

  redirect("/dashboard");
}
