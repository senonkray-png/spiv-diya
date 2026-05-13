import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_PRICES } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as "provider" | "entrepreneur";
  const paidWith = body.paidWith === "uah" ? "uah" : "tokens";

  if (plan !== "provider" && plan !== "entrepreneur") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const price = PLAN_PRICES[plan];
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── Pay with tokens — atomic activation ─────────────────────────────────────
  if (paidWith === "tokens") {
    if (user.balance < price.tokens) {
      return NextResponse.json({ error: "Недостатньо монет" }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const newRole = plan === "entrepreneur" ? "entrepreneur" : "provider";

    const result = await prisma.$transaction(async (tx) => {
      const debited = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: price.tokens },
          subscriptionPlan: plan,
          subscriptionStatus: "active",
          subscriptionExpiresAt: expiresAt,
          role: newRole,
        },
      });

      const sub = await tx.subscription.create({
        data: {
          userId: user.id,
          plan,
          status: "active",
          priceUAH: price.uah,
          priceTokens: price.tokens,
          paidWith: "tokens",
          startsAt: new Date(),
          expiresAt,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: "purchase",
          amount: -price.tokens,
          balanceAfter: debited.balance,
          description: `Підписка «${plan === "entrepreneur" ? "Підприємець" : "Продавець"}»`,
          meta: { subscriptionId: sub.id, plan },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "subscription_activated",
          title: "Підписку активовано",
          body: `План «${plan === "entrepreneur" ? "Підприємець" : "Продавець"}» активний до ${expiresAt.toLocaleDateString("uk-UA")}.`,
          link: "/dashboard",
        },
      });

      return { sub, user: debited };
    });

    await createSession({
      userId: result.user.id,
      email: result.user.email,
      companyName: result.user.companyName,
      role: result.user.role,
    });

    return NextResponse.json({ ok: true, subscription: result.sub, role: result.user.role });
  }

  // ── Pay with UAH — pending until admin confirms ─────────────────────────────
  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan,
      status: "pending",
      priceUAH: price.uah,
      priceTokens: price.tokens,
      paidWith: "uah",
    },
  });

  // Create a pending Payment so admin can confirm via existing payments queue
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      method: "p2p_manual",
      amountUSD: price.uah / 40,
      amountTokens: price.tokens,
      status: "pending",
    },
  });

  await prisma.subscription.update({ where: { id: sub.id }, data: { paymentId: payment.id } });

  return NextResponse.json({ ok: true, subscription: sub, payment, awaitingConfirmation: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await prisma.subscription.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ subscriptions: subs });
}
