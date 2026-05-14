import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.shopOrder.findMany({
    where: { buyerId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      lines: {
        select: {
          id: true,
          title: true,
          quantity: true,
          lineTotalUAH: true,
          lineTotalTokens: true,
        },
      },
    },
  });

  return NextResponse.json({ orders });
}
