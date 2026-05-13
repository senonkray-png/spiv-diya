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
    // Check if this payment is tied to a pending subscription
    const linkedSub = await prisma.subscription.findFirst({
      where: { paymentId: payment.id, status: "pending" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { id },
        data: { status: "confirmed", confirmedAt: new Date() },
      });

      if (linkedSub) {
        // Activate subscription instead of crediting wallet
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await tx.subscription.update({
          where: { id: linkedSub.id },
          data: {
            status: "active",
            startsAt: new Date(),
            expiresAt,
          },
        });
        const newRole = linkedSub.plan === "entrepreneur" ? "entrepreneur" : "provider";
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionPlan: linkedSub.plan,
            subscriptionStatus: "active",
            subscriptionExpiresAt: expiresAt,
            role: newRole,
          },
        });
        await tx.notification.create({
          data: {
            userId: payment.userId,
            type: "subscription_activated",
            title: "Підписку активовано",
            body: `План «${linkedSub.plan === "entrepreneur" ? "Підприємець" : "Продавець"}» активний до ${expiresAt.toLocaleDateString("uk-UA")}.`,
            link: "/dashboard",
          },
        });
      } else {
        // Regular wallet top-up
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
      }
    });
  } else if (action === "reject") {
    await prisma.payment.update({ where: { id }, data: { status: "rejected" } });
    // If this was a subscription payment, mark subscription cancelled too
    await prisma.subscription.updateMany({
      where: { paymentId: payment.id, status: "pending" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
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
