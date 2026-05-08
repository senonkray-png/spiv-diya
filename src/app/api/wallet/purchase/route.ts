import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const productId = String(body?.productId ?? "");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, ownerId: true, title: true, priceTokens: true, status: true },
  });

  if (!product || product.status !== "active") {
    return NextResponse.json({ error: "Товар недоступний" }, { status: 404 });
  }
  if (product.ownerId === session.userId) {
    return NextResponse.json({ error: "Не можна купити власний товар" }, { status: 400 });
  }
  if (product.priceTokens <= 0) {
    return NextResponse.json({ error: "Товар не продається за монети" }, { status: 400 });
  }

  const buyer = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!buyer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (buyer.balance < product.priceTokens) {
    return NextResponse.json({ error: "Недостатньо монет на балансі" }, { status: 402 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma as any).$transaction(async (tx: any) => {
    const updatedBuyer = await tx.user.update({
      where: { id: buyer.id },
      data: { balance: { decrement: product.priceTokens } },
    });

    const updatedSeller = await tx.user.update({
      where: { id: product.ownerId },
      data: { balance: { increment: product.priceTokens } },
    });

    await tx.walletTransaction.create({
      data: {
        userId: buyer.id,
        type: "purchase",
        amount: -product.priceTokens,
        balanceAfter: updatedBuyer.balance,
        description: `Купівля: ${product.title}`,
        meta: { productId: product.id, sellerId: product.ownerId },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: product.ownerId,
        type: "transfer_in",
        amount: product.priceTokens,
        balanceAfter: updatedSeller.balance,
        description: `Продаж: ${product.title}`,
        meta: { productId: product.id, buyerId: buyer.id },
      },
    });

    await tx.directMessage.create({
      data: {
        senderId: buyer.id,
        receiverId: product.ownerId,
        content: `Здрастуйте! Я придбав ваш товар "${product.title}". Будь ласка, зв'яжіться зі мною щодо доставки.`,
        contextType: "product",
        contextId: product.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: product.ownerId,
        type: "system",
        title: "Новий продаж",
        body: `${buyer.companyName} придбав ${product.title}`,
        entityType: "product",
        entityId: product.id,
        link: `/dashboard/messages?user=${buyer.id}`,
      },
    });

    return { newBalance: updatedBuyer.balance };
  });

  return NextResponse.json({ ok: true, balance: result.newBalance });
}
