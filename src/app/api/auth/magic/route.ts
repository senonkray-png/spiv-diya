import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Введіть коректний email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always pretend success to avoid leaking which emails are registered
  if (!user) {
    return NextResponse.json({ ok: true, hint: "if_registered_check_inbox" });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: "Акаунт деактивовано" }, { status: 403 });
  }

  await sendMagicLinkEmail(user.id, user.email);
  return NextResponse.json({ ok: true });
}
