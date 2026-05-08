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
  const action = String(body?.action ?? "");

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "confirm") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { id },
        data: { status: "confirmed", confirmedAt: new Date() },
      });
      const user = await tx.user.update({
        where: { id: payment.userId },
        data: { balance: { increment: payment.amountTokens } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: payment.userId,
          type: "deposit",
          amount: payment.amountTokens,
          balanceAfter: user.balance,
          description: `Поповнення підтверджено (${payment.method})`,
          meta: { paymentId: payment.id },
        },
      });
      await tx.notification.create({
        data: {
          userId: payment.userId,
          type: "payment_confirmed",
          title: "Поповнення зараховано",
          body: `На баланс додано ${payment.amountTokens} монет`,
          link: "/dashboard/wallet",
        },
      });
    });
  } else if (action === "reject") {
    await prisma.payment.update({ where: { id }, data: { status: "rejected" } });
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: "payment_rejected",
        title: "Поповнення відхилено",
        body: "Зверніться до підтримки",
        link: "/dashboard/wallet",
      },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
