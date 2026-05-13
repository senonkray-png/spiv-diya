"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { isOutboundEmailConfigured, sendVerificationEmail } from "@/lib/email";

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

  if (process.env.NODE_ENV === "production" && !isOutboundEmailConfigured()) {
    return {
      error:
        "Реєстрація недоступна: не налаштовано відправку пошти. У Vercel задайте EMAIL_WEBHOOK_URL або пару SUPABASE_URL (або NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY і задеплойте Edge Function send-auth-email з SMTP-секретами в Supabase.",
    };
  }

  /** Локально без пошти — одразу «підтверджуємо» для зручності розробки. */
  const skipEmailVerify = process.env.NODE_ENV !== "production" && !isOutboundEmailConfigured();

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
        "Не вдалось надіслати лист. Перевірте SMTP-секрети функції send-auth-email у Supabase, змінні SUPABASE_* у Vercel, або EMAIL_WEBHOOK_URL. Деталі — у логах (Vercel → Logs, Supabase → Edge Functions → Logs).",
    };
  }

  redirect(`/register/pending?email=${encodeURIComponent(email)}`);
}
