"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createSession } from "@/lib/session";

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
    if (existing.googleId && !existing.passwordHash) {
      return { error: "Цей email зареєстровано через Google. Увійдіть кнопкою «Google»." };
    }
    return { error: "Акаунт з таким email вже існує." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "member";

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      companyName,
      industry,
      city,
      region,
      role,
      emailVerified: role === "admin",
      emailVerifiedAt: role === "admin" ? new Date() : null,
    },
  });

  if (role === "admin") {
    await createSession({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
    });
    redirect("/dashboard");
  }

  try {
    await sendVerificationEmail(user.id, user.email, user.companyName);
  } catch (err) {
    console.error("Email verification send failed:", err);
  }

  redirect(`/register/pending?email=${encodeURIComponent(email)}`);
}
