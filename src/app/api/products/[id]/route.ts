import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          companyName: true,
          city: true,
          region: true,
          avatarUrl: true,
          verified: true,
          phone: true,
          websiteUrl: true,
        },
      },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  const isOwner = product.ownerId === session.userId;
  const isAdmin = me?.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdmin && (!me || !canManageSellerCatalog(me.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data = body?.product ?? body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {};
  if (typeof data?.title === "string") update.title = data.title.trim().slice(0, 200);
  if (typeof data?.description === "string") update.description = data.description.trim().slice(0, 5000);
  if (data?.priceTokens != null) update.priceTokens = Math.max(0, Math.round(Number(data.priceTokens)));
  if (data?.priceUAH != null) update.priceUAH = data.priceUAH === "" ? null : Math.max(0, Math.round(Number(data.priceUAH)));
  if (typeof data?.currency === "string") update.currency = data.currency;
  if (typeof data?.category === "string") update.category = data.category.slice(0, 80) || null;
  if (typeof data?.city === "string") update.city = data.city.slice(0, 80);
  if (typeof data?.region === "string") update.region = data.region.slice(0, 80);
  if (Array.isArray(data?.photos)) update.photos = data.photos.filter((p: unknown) => typeof p === "string").slice(0, 10);
  if (typeof data?.status === "string" && ["active", "paused", "removed"].includes(data.status)) {
    update.status = data.status;
  }

  const oldTokens = product.priceTokens;
  const oldUAH = product.priceUAH;
  const updated = await prisma.product.update({ where: { id }, data: update });

  // Track price changes for suspicious-pricing detector
  const newTokens = updated.priceTokens;
  const newUAH = updated.priceUAH;
  const tokensChanged = newTokens !== oldTokens;
  const uahChanged = newUAH !== oldUAH;
  if (tokensChanged || uahChanged) {
    const primaryOld = oldUAH ?? oldTokens;
    const primaryNew = newUAH ?? newTokens;
    const delta = primaryNew - primaryOld;
    let flagged = false;
    let reason: string | null = null;

    if (primaryOld > 0) {
      const pct = (Math.abs(delta) / primaryOld) * 100;
      if (delta > 0 && pct > 50) {
        flagged = true;
        reason = "spike_up";
      }
    }

    // Detect rapid changes — more than 3 changes in last 24h
    const recent = await prisma.priceLog.count({
      where: { productId: id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
    });
    if (recent >= 3) {
      flagged = true;
      reason = reason ?? "rapid_changes";
    }

    await prisma.priceLog.create({
      data: {
        productId: id,
        oldPriceTokens: oldTokens,
        newPriceTokens: newTokens,
        oldPriceUAH: oldUAH,
        newPriceUAH: newUAH,
        delta,
        flagged,
        reason,
      },
    });

    if (flagged && !isAdmin) {
      // Penalise the seller's rating: -1 for spike, -2 for rapid changes
      const penalty = reason === "rapid_changes" ? -2 : -1;
      await prisma.user.update({
        where: { id: product.ownerId },
        data: { ratingScore: { increment: penalty } },
      });
      await prisma.notification.create({
        data: {
          userId: product.ownerId,
          type: "rating_changed",
          title: "Підозріла зміна ціни",
          body:
            reason === "rapid_changes"
              ? "Занадто часті зміни ціни — рейтинг зменшено."
              : "Різке підвищення ціни — рейтинг зменшено.",
          link: `/dashboard/products`,
        },
      });
    }
  }

  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  const isOwner = product.ownerId === session.userId;
  const isAdmin = me?.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdmin && (!me || !canManageSellerCatalog(me.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
