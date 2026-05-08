"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function register(_prev: { error: string }, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const companyName = formData.get("companyName") as string;
  const industry = formData.get("industry") as string;
  const city = formData.get("city") as string;
  const region = formData.get("region") as string;

  if (!email || !password || !companyName || !industry || !city || !region) {
    return { error: "Будь ласка, заповніть усі поля." };
  }

  if (password.length < 8) {
    return { error: "Пароль має бути мінімум 8 символів." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Акаунт з таким email вже існує." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // First user becomes admin automatically (bootstrap convenience)
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "member";

  const user = await prisma.user.create({
    data: { email, passwordHash, companyName, industry, city, region, role },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
  });
  redirect("/onboarding");
}
