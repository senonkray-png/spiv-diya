"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/email";

export async function register(_prev: { error: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();

  if (!email || !password || !companyName || !industry || !city || !region) {
    return { error: "Будь ласка, заповніть усі поля." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Некоректний email." };
  }
  if (password.length < 8) {
    return { error: "Пароль має бути мінімум 8 символів." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Акаунт з таким email вже існує." };
  }

  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  if (process.env.NODE_ENV === "production" && !hasResend) {
    return {
      error:
        "Реєстрація недоступна: у production не задано RESEND_API_KEY. Додайте ключ у Vercel → Environment Variables.",
    };
  }

  /** Локально без Resend — одразу «підтверджуємо», щоб можна було розробляти без пошти. */
  const skipEmailVerify = process.env.NODE_ENV !== "production" && !hasResend;

  const passwordHash = await bcrypt.hash(password, 12);

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "buyer";

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      companyName,
      industry,
      city,
      region,
      role,
      emailVerified: skipEmailVerify,
      emailVerifiedAt: skipEmailVerify ? new Date() : null,
    },
  });

  if (skipEmailVerify) {
    await createSession({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
    });
    redirect("/marketplace");
  }

  const sent = await sendVerificationEmail(user.id, user.email, user.companyName);
  if (!sent.ok) {
    await prisma.user.delete({ where: { id: user.id } });
    return {
      error:
        "Не вдалось надіслати лист підтвердження. Перевірте RESEND_API_KEY, домен відправника в Resend та змінну EMAIL_FROM (наприклад «СпівДія <noreply@ваш-домен>»).",
    };
  }

  redirect(`/register/pending?email=${encodeURIComponent(email)}`);
}
