import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.cartItem.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        include: {
          owner: { select: { id: true, companyName: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const productId = String(body?.productId ?? "").trim();
  const quantity = Math.max(1, Math.min(99, Math.round(Number(body?.quantity ?? 1))));

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, ownerId: true, stockQuantity: true },
  });
  if (!product || product.status !== "active") {
    return NextResponse.json({ error: "Товар недоступний" }, { status: 404 });
  }
  if (product.ownerId === session.userId) {
    return NextResponse.json({ error: "Не можна додати власний товар" }, { status: 400 });
  }
  if (product.stockQuantity != null && quantity > product.stockQuantity) {
    return NextResponse.json({ error: "Недостатньо на складі" }, { status: 400 });
  }

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    create: { userId: session.userId, productId, quantity },
    update: { quantity },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  if (productId) {
    await prisma.cartItem.deleteMany({
      where: { userId: session.userId, productId },
    });
  } else {
    await prisma.cartItem.deleteMany({ where: { userId: session.userId } });
  }

  return NextResponse.json({ ok: true });
}
