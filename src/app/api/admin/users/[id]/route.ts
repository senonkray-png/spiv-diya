import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (typeof body?.role === "string" && ["member", "provider", "buyer", "admin"].includes(body.role)) {
    data.role = body.role;
  }
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.verified === "boolean") data.verified = body.verified;
  if (typeof body?.balanceDelta === "number" && Number.isFinite(body.balanceDelta)) {
    data.balance = { increment: Math.round(body.balanceDelta) };
  }

  const user = await prisma.user.update({ where: { id }, data });

  if (typeof body?.balanceDelta === "number") {
    await prisma.walletTransaction.create({
      data: {
        userId: id,
        type: body.balanceDelta > 0 ? "bonus" : "withdrawal",
        amount: Math.round(body.balanceDelta),
        balanceAfter: user.balance,
        description: "Зміна балансу адміністратором",
        meta: { byAdmin: admin.id },
      },
    });
  }

  return NextResponse.json({ user });
}
