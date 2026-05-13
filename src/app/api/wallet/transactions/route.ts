import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txs = await prisma.walletTransaction.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { balance: true },
  });

  return NextResponse.json({ balance: me?.balance ?? 0, transactions: txs });
}
