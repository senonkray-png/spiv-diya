import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetUserId = String(body.targetUserId ?? "");
  const value = body.value === "down" ? "down" : body.value === "up" ? "up" : null;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

  if (!value) return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  if (!targetUserId || targetUserId === session.userId) {
    return NextResponse.json({ error: "Не можна голосувати за себе" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert: if existing vote — switch / remove; otherwise create
  const existing = await prisma.rating.findUnique({
    where: { voterId_targetUserId: { voterId: session.userId, targetUserId } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      if (existing.value === value) {
        // Same vote → toggle off
        await tx.rating.delete({ where: { id: existing.id } });
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            ratingScore: { decrement: value === "up" ? 1 : -1 },
            ratingUpCount: value === "up" ? { decrement: 1 } : undefined,
            ratingDownCount: value === "down" ? { decrement: 1 } : undefined,
          },
        });
      } else {
        // Switching vote → swap counters and adjust score by 2
        await tx.rating.update({ where: { id: existing.id }, data: { value, reason } });
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            ratingScore: { increment: value === "up" ? 2 : -2 },
            ratingUpCount: value === "up" ? { increment: 1 } : { decrement: 1 },
            ratingDownCount: value === "down" ? { increment: 1 } : { decrement: 1 },
          },
        });
      }
    } else {
      await tx.rating.create({
        data: { voterId: session.userId, targetUserId, value, reason },
      });
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          ratingScore: { increment: value === "up" ? 1 : -1 },
          ratingUpCount: value === "up" ? { increment: 1 } : undefined,
          ratingDownCount: value === "down" ? { increment: 1 } : undefined,
        },
      });
    }
  });

  // Notify the target — but only when total moved meaningfully
  const fresh = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { ratingScore: true, ratingUpCount: true, ratingDownCount: true },
  });
  if (fresh) {
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "rating_changed",
        title: `Ваш рейтинг: ${fresh.ratingScore > 0 ? "+" : ""}${fresh.ratingScore}`,
        body: `${fresh.ratingUpCount} 👍 · ${fresh.ratingDownCount} 👎`,
        link: `/u/${targetUserId}`,
      },
    });
  }

  return NextResponse.json({ ok: true, score: fresh?.ratingScore ?? 0 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("targetUserId");
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });

  const session = await getSession();
  const my = session
    ? await prisma.rating.findUnique({
        where: { voterId_targetUserId: { voterId: session.userId, targetUserId } },
      })
    : null;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { ratingScore: true, ratingUpCount: true, ratingDownCount: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    score: target.ratingScore,
    upCount: target.ratingUpCount,
    downCount: target.ratingDownCount,
    myVote: my?.value ?? null,
  });
}
