import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const body = await req.json().catch(() => ({}));
  const raw = body?.value;
  const value = raw === "up" ? "up" : raw === "down" ? "down" : raw === null ? null : undefined;
  if (value === undefined) {
    return NextResponse.json({ error: "value must be up, down, or null" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, ownerId: true },
  });
  if (!product || product.status === "removed") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (product.ownerId === session.userId) {
    return NextResponse.json({ error: "Не можна голосувати за власний товар" }, { status: 400 });
  }

  const existing = await prisma.productVote.findUnique({
    where: { productId_userId: { productId, userId: session.userId } },
  });

  let likeDelta = 0;
  let dislikeDelta = 0;

  if (value === null) {
    if (existing) {
      if (existing.value === "up") likeDelta = -1;
      else dislikeDelta = -1;
      await prisma.productVote.delete({ where: { id: existing.id } });
    }
  } else if (!existing) {
    if (value === "up") likeDelta = 1;
    else dislikeDelta = 1;
    await prisma.productVote.create({
      data: { productId, userId: session.userId, value },
    });
  } else if (existing.value !== value) {
    if (existing.value === "up") likeDelta = -1;
    else dislikeDelta = -1;
    if (value === "up") likeDelta += 1;
    else dislikeDelta += 1;
    await prisma.productVote.update({
      where: { id: existing.id },
      data: { value },
    });
  }

  if (likeDelta !== 0 || dislikeDelta !== 0) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        likeCount: { increment: likeDelta },
        dislikeCount: { increment: dislikeDelta },
      },
    });
  }

  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { likeCount: true, dislikeCount: true },
  });

  const vote = await prisma.productVote.findUnique({
    where: { productId_userId: { productId, userId: session.userId } },
    select: { value: true },
  });

  return NextResponse.json({
    likeCount: p?.likeCount ?? 0,
    dislikeCount: p?.dislikeCount ?? 0,
    myVote: vote?.value ?? null,
  });
}
