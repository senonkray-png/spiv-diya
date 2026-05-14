import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";
import { translateContent, injectTranslation, deleteTranslations, parseLocaleFromCookie } from "@/lib/translate";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const service = await prisma.serviceAd.findUnique({
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
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const locale = parseLocaleFromCookie(req.headers.get("cookie"));
  const translated = await injectTranslation(service, "service", locale);
  return NextResponse.json({ service: translated });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.serviceAd.findUnique({ where: { id } });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  const isOwner = service.ownerId === session.userId;
  const isAdmin = me?.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdmin && (!me || !canManageSellerCatalog(me.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data = body?.service ?? body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {};
  if (typeof data?.title === "string") update.title = data.title.trim().slice(0, 200);
  if (typeof data?.description === "string") update.description = data.description.trim().slice(0, 5000);
  if (data?.type === "offer" || data?.type === "request") update.type = data.type;
  if (data?.priceTokens != null) update.priceTokens = data.priceTokens === "" ? null : Math.max(0, Math.round(Number(data.priceTokens)));
  if (data?.priceUAH != null) update.priceUAH = data.priceUAH === "" ? null : Math.max(0, Math.round(Number(data.priceUAH)));
  if (typeof data?.category === "string") update.category = data.category.slice(0, 80) || null;
  if (typeof data?.city === "string") update.city = data.city.slice(0, 80);
  if (typeof data?.region === "string") update.region = data.region.slice(0, 80);
  if (Array.isArray(data?.photos)) update.photos = data.photos.filter((p: unknown) => typeof p === "string").slice(0, 10);
  if (typeof data?.status === "string" && ["active", "paused", "removed"].includes(data.status)) {
    update.status = data.status;
  }

  const updated = await prisma.serviceAd.update({ where: { id }, data: update });

  if (typeof update.title === "string" || typeof update.description === "string") {
    void translateContent("service", id, { title: updated.title, description: updated.description });
  }

  return NextResponse.json({ service: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.serviceAd.findUnique({ where: { id } });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  const isOwner = service.ownerId === session.userId;
  const isAdmin = me?.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdmin && (!me || !canManageSellerCatalog(me.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.serviceAd.delete({ where: { id } });
  void deleteTranslations("service", id);
  return NextResponse.json({ ok: true });
}
