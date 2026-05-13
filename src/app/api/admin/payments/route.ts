import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payments = await prisma.payment.findMany({
    where: { status: { in: ["pending", "awaiting_confirmation"] } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, companyName: true, email: true, balance: true } },
    },
  });
  return NextResponse.json({ payments });
}
