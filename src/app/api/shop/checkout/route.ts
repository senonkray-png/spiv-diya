import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { effectivePriceUah, uahToTokens } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fulfillment = body?.fulfillment === "delivery" ? "delivery" : "pickup";
  const deliveryAddress = String(body?.deliveryAddress ?? "").trim() || null;
  const deliveryCity = String(body?.deliveryCity ?? "").trim() || null;
  const deliveryPhone = String(body?.deliveryPhone ?? "").trim() || null;

  if (fulfillment === "delivery") {
    if (!deliveryAddress || !deliveryCity || !deliveryPhone) {
      return NextResponse.json(
        { error: "Для доставки вкажіть місто, телефон і адресу" },
        { status: 400 },
      );
    }
  }

  try {
    const orderId = await prisma.$transaction(async (tx) => {
      const items = await tx.cartItem.findMany({
        where: { userId: session.userId },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              ownerId: true,
              status: true,
              priceUAH: true,
              discountPercent: true,
              stockQuantity: true,
            },
          },
        },
      });

      if (items.length === 0) {
        throw new Error("EMPTY_CART");
      }

      type LineDraft = {
        productId: string;
        sellerId: string;
        title: string;
        unitPriceUAH: number;
        quantity: number;
        discountPercentApplied: number;
        lineTotalUAH: number;
        lineTotalTokens: number;
        stockTracked: boolean;
      };

      const lines: LineDraft[] = [];
      let totalUAH = 0;
      let totalTokens = 0;

      for (const row of items) {
        const p = row.product;
        if (!p || p.status !== "active" || p.ownerId === session.userId) {
          throw new Error("BAD_ITEM");
        }
        if (p.priceUAH == null) {
          throw new Error("NO_UAH_PRICE");
        }
        const qty = row.quantity;
        if (p.stockQuantity != null && p.stockQuantity < qty) {
          throw new Error("STOCK");
        }
        const unitEff = effectivePriceUah(p.priceUAH, p.discountPercent);
        const lineUAH = unitEff * qty;
        const lineTok = uahToTokens(lineUAH);
        lines.push({
          productId: p.id,
          sellerId: p.ownerId,
          title: p.title,
          unitPriceUAH: p.priceUAH,
          quantity: qty,
          discountPercentApplied: p.discountPercent,
          lineTotalUAH: lineUAH,
          lineTotalTokens: lineTok,
          stockTracked: p.stockQuantity != null,
        });
        totalUAH += lineUAH;
        totalTokens += lineTok;
      }

      const buyer = await tx.user.findUnique({ where: { id: session.userId } });
      if (!buyer) throw new Error("NO_BUYER");
      if (buyer.balance < totalTokens) {
        throw new Error("FUNDS");
      }

      const order = await tx.shopOrder.create({
        data: {
          buyerId: buyer.id,
          fulfillment,
          deliveryAddress,
          deliveryCity,
          deliveryPhone,
          totalUAH,
          totalTokens,
          status: "paid",
        },
      });

      const sellerTotals = new Map<string, number>();
      for (const L of lines) {
        await tx.shopOrderLine.create({
          data: {
            orderId: order.id,
            productId: L.productId,
            sellerId: L.sellerId,
            title: L.title,
            unitPriceUAH: L.unitPriceUAH,
            quantity: L.quantity,
            discountPercentApplied: L.discountPercentApplied,
            lineTotalUAH: L.lineTotalUAH,
            lineTotalTokens: L.lineTotalTokens,
          },
        });
        if (L.stockTracked) {
          await tx.product.update({
            where: { id: L.productId },
            data: { stockQuantity: { decrement: L.quantity } },
          });
        }
        sellerTotals.set(L.sellerId, (sellerTotals.get(L.sellerId) ?? 0) + L.lineTotalTokens);
      }

      const updatedBuyer = await tx.user.update({
        where: { id: buyer.id },
        data: { balance: { decrement: totalTokens } },
      });

      await tx.walletTransaction.create({
        data: {
          userId: buyer.id,
          type: "purchase",
          amount: -totalTokens,
          balanceAfter: updatedBuyer.balance,
          description: `Замовлення ${order.id}`,
          meta: { shopOrderId: order.id },
        },
      });

      for (const [sellerId, amt] of sellerTotals) {
        const updatedSeller = await tx.user.update({
          where: { id: sellerId },
          data: { balance: { increment: amt } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: sellerId,
            type: "transfer_in",
            amount: amt,
            balanceAfter: updatedSeller.balance,
            description: `Продаж (замовлення ${order.id})`,
            meta: { shopOrderId: order.id, buyerId: buyer.id },
          },
        });
        await tx.notification.create({
          data: {
            userId: sellerId,
            type: "system",
            title: "Нове замовлення",
            body: `${buyer.companyName} оформив покупку на ${amt} монет`,
            entityType: "shop_order",
            entityId: order.id,
            link: `/dashboard/wallet`,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: session.userId } });

      return order.id;
    });

    return NextResponse.json({ ok: true, orderId });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "EMPTY_CART") return NextResponse.json({ error: "Кошик порожній" }, { status: 400 });
    if (code === "FUNDS") return NextResponse.json({ error: "Недостатньо СпівМонет" }, { status: 402 });
    if (code === "NO_UAH_PRICE") {
      return NextResponse.json({ error: "У кошику є товар без ціни в ₴ — оформлення неможливе" }, { status: 400 });
    }
    if (code === "STOCK") return NextResponse.json({ error: "Недостатня кількість на складі" }, { status: 400 });
    if (code === "BAD_ITEM") return NextResponse.json({ error: "Один з товарів більше не доступний" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Не вдалось оформити замовлення" }, { status: 500 });
  }
}
