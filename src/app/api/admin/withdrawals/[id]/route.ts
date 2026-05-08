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
  const note = body?.note ? String(body.note).slice(0, 500) : null;

  const wr = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!wr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve" || action === "paid") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).$transaction(async (tx: any) => {
      const me = await tx.user.findUnique({ where: { id: wr.userId } });
      if (!me) throw new Error("User missing");
      if (me.balance < wr.amountTokens) {
        throw new Error("Insufficient balance");
      }
      const updated = await tx.user.update({
        where: { id: wr.userId },
        data: { balance: { decrement: wr.amountTokens } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: wr.userId,
          type: "withdrawal",
          amount: -wr.amountTokens,
          balanceAfter: updated.balance,
          description: "Виведення коштів",
          meta: { withdrawalId: wr.id },
        },
      });
      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: action === "paid" ? "paid" : "approved",
          adminNote: note,
          resolvedAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          userId: wr.userId,
          type: "withdrawal_approved",
          title: "Заявку на вивід підтверджено",
          body: note ?? `Виплачено ${wr.amountTokens} монет`,
          link: "/dashboard/wallet",
        },
      });
    });
  } else if (action === "reject") {
    await prisma.withdrawalRequest.update({
      where: { id },
      data: { status: "rejected", adminNote: note, resolvedAt: new Date() },
    });
    await prisma.notification.create({
      data: {
        userId: wr.userId,
        type: "withdrawal_rejected",
        title: "Заявку відхилено",
        body: note ?? "Зверніться до підтримки",
        link: "/dashboard/wallet",
      },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
