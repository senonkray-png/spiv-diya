import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  if (role !== "buyer") {
    return NextResponse.redirect(new URL("/welcome", req.url));
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { role: "buyer" },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
  });

  return NextResponse.redirect(new URL("/marketplace", req.url));
}
