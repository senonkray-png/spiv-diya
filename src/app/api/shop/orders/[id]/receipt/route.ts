import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildOrderReceiptPdfBuffer } from "@/lib/receipt-pdf";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      buyer: { select: { companyName: true, email: true, phone: true } },
      lines: {
        include: {
          seller: { select: { companyName: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.buyerId !== session.userId) {
    const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (me?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const buf = await buildOrderReceiptPdfBuffer({
    id: order.id,
    createdAt: order.createdAt,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryPhone: order.deliveryPhone,
    totalUAH: order.totalUAH,
    totalTokens: order.totalTokens,
    buyer: order.buyer,
    lines: order.lines.map((l) => ({
      title: l.title,
      quantity: l.quantity,
      lineTotalUAH: l.lineTotalUAH,
      lineTotalTokens: l.lineTotalTokens,
      discountPercentApplied: l.discountPercentApplied,
      sellerCompanyName: l.seller?.companyName,
    })),
  });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kvytantsia-${order.id}.pdf"`,
    },
  });
}
