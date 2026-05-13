"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { isEmailVerificationSkipped } from "@/lib/email";

export type LoginState = { error?: string };

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
    return {
      error: "Для цього акаунта не задано пароль. Зверніться до підтримки або зареєструйтесь знову.",
    };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Невірний email або пароль." };
  }

  if (!user.emailVerified && !isEmailVerificationSkipped()) {
    return {
      error:
        "Спочатку підтвердіть пошту: відкрийте посилання з листа або на сторінці реєстрації натисніть «Надіслати лист знову».",
    };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
  });

  redirect("/marketplace");
}
