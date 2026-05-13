import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partnership = await prisma.partnership.findUnique({ where: { id } });
  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (partnership.targetId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.partnership.update({
    where: { id },
    data: {
      status: action === "accept" ? "accepted" : "rejected",
      acceptedAt: action === "accept" ? new Date() : null,
    },
  });

  if (action === "accept") {
    await prisma.notification.create({
      data: {
        userId: partnership.initiatorId,
        type: "partner_accepted",
        title: "Партнерство підтверджено",
        body: `${session.companyName} прийняв запит на співпрацю`,
        link: `/dashboard/partners`,
      },
    });
  }

  return NextResponse.json({ partnership: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = await prisma.partnership.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.initiatorId !== session.userId && p.targetId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.partnership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
