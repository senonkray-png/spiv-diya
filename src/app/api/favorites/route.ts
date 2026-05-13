import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true, companyName: true, city: true, businessNiche: true,
          avatarUrl: true, verified: true,
        },
      },
      product: {
        include: {
          owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
        },
      },
      service: {
        include: {
          owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
        },
      },
    },
  });

  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.userId ? String(body.userId) : null;
  const productId = body?.productId ? String(body.productId) : null;
  const serviceId = body?.serviceId ? String(body.serviceId) : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

  const setCount = [userId, productId, serviceId].filter(Boolean).length;
  if (setCount !== 1) {
    return NextResponse.json({ error: "Pass exactly one of userId/productId/serviceId" }, { status: 400 });
  }

  if (userId === session.userId) {
    return NextResponse.json({ error: "Cannot favorite yourself" }, { status: 400 });
  }

  try {
    const fav = await prisma.favorite.create({
      data: {
        ownerId: session.userId,
        userId,
        productId,
        serviceId,
        note,
      },
    });
    return NextResponse.json({ favorite: fav });
  } catch {
    return NextResponse.json({ error: "Already favorited" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.userId ? String(body.userId) : null;
  const productId = body?.productId ? String(body.productId) : null;
  const serviceId = body?.serviceId ? String(body.serviceId) : null;

  await prisma.favorite.deleteMany({
    where: {
      ownerId: session.userId,
      ...(userId ? { userId } : {}),
      ...(productId ? { productId } : {}),
      ...(serviceId ? { serviceId } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
