import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = session.userId;
  const incoming = await prisma.partnership.findMany({
    where: { targetId: me },
    orderBy: { createdAt: "desc" },
    include: {
      initiator: {
        select: {
          id: true, companyName: true, avatarUrl: true, businessNiche: true, city: true, verified: true,
        },
      },
    },
  });
  const outgoing = await prisma.partnership.findMany({
    where: { initiatorId: me },
    orderBy: { createdAt: "desc" },
    include: {
      target: {
        select: {
          id: true, companyName: true, avatarUrl: true, businessNiche: true, city: true, verified: true,
        },
      },
    },
  });

  return NextResponse.json({ incoming, outgoing });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetId = String(body?.targetId ?? "");
  const message = body?.message ? String(body.message).trim().slice(0, 500) : null;

  if (!targetId || targetId === session.userId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!target.acceptsPartners) {
    return NextResponse.json({ error: "Користувач не приймає запити в партнери" }, { status: 403 });
  }

  try {
    const partnership = await prisma.partnership.create({
      data: {
        initiatorId: session.userId,
        targetId,
        message,
      },
    });
    await prisma.notification.create({
      data: {
        userId: targetId,
        type: "partner_request",
        title: "Новий запит у партнери",
        body: message ?? `${session.companyName} хоче співпрацювати`,
        link: `/dashboard/partners`,
        entityType: "partnership",
        entityId: partnership.id,
      },
    });
    return NextResponse.json({ partnership });
  } catch {
    return NextResponse.json({ error: "Запит уже надіслано" }, { status: 409 });
  }
}
