import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id: productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product || product.status === "removed") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await prisma.productComment.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { id: true, companyName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const body = await req.json().catch(() => ({}));
  const text = String(body?.body ?? "").trim();
  if (text.length < 2) return NextResponse.json({ error: "Занадто короткий коментар" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Занадто довгий коментар" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product || product.status === "removed") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const c = await prisma.productComment.create({
    data: { productId, userId: session.userId, body: text },
    include: {
      user: { select: { id: true, companyName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ comment: c });
}
