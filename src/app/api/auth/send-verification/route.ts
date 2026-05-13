import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const sent = await sendVerificationEmail(user.id, user.email, user.companyName);
  if (!sent.ok) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
