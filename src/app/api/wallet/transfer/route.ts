import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const recipient = String(body?.recipient ?? "").trim();
  const amount = Math.round(Number(body?.amount ?? 0));
  const note = typeof body?.note === "string" ? body.note.slice(0, 200) : null;

  if (!recipient) return NextResponse.json({ error: "Вкажіть отримувача" }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "Невірна сума" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.balance < amount) return NextResponse.json({ error: "Недостатньо коштів" }, { status: 402 });

  let target = await prisma.user.findUnique({ where: { id: recipient } });
  if (!target) target = await prisma.user.findUnique({ where: { email: recipient } });
  if (!target) return NextResponse.json({ error: "Отримувача не знайдено" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "Не можна перевести самому собі" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma as any).$transaction(async (tx: any) => {
    const updatedMe = await tx.user.update({
      where: { id: me.id },
      data: { balance: { decrement: amount } },
    });
    const updatedTarget = await tx.user.update({
      where: { id: target!.id },
      data: { balance: { increment: amount } },
    });

    await tx.walletTransaction.create({
      data: {
        userId: me.id,
        type: "transfer_out",
        amount: -amount,
        balanceAfter: updatedMe.balance,
        description: note ?? `Переказ ${target!.companyName}`,
        meta: { peerId: target!.id },
      },
    });
    await tx.walletTransaction.create({
      data: {
        userId: target!.id,
        type: "transfer_in",
        amount,
        balanceAfter: updatedTarget.balance,
        description: note ?? `Переказ від ${me.companyName}`,
        meta: { peerId: me.id },
      },
    });

    await tx.notification.create({
      data: {
        userId: target!.id,
        type: "system",
        title: "Отримано переказ",
        body: `${me.companyName} переслав вам ${amount} монет${note ? ` (${note})` : ""}`,
        link: "/dashboard/wallet",
      },
    });

    return { newBalance: updatedMe.balance };
  });

  return NextResponse.json({ ok: true, balance: result.newBalance });
}
