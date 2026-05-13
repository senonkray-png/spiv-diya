import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const sent = await sendVerificationEmail(user.id, user.email, user.companyName);
  if (!sent.ok) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
