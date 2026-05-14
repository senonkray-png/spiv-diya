import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";
import { translateContent, injectTranslations, parseLocaleFromCookie } from "@/lib/translate";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ownerId = url.searchParams.get("ownerId");
  const type = url.searchParams.get("type"); // offer | request
  const q = url.searchParams.get("q");
  const includeMine = url.searchParams.get("includeMine") === "1";

  const session = includeMine ? await getSession() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (ownerId) {
    where.ownerId = ownerId;
  } else if (includeMine && session) {
    where.OR = [{ status: "active" }, { ownerId: session.userId }];
  } else {
    where.status = "active";
  }

  if (type === "offer" || type === "request") where.type = type;
  if (q) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const services = await prisma.serviceAd.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      owner: {
        select: { id: true, companyName: true, avatarUrl: true, verified: true, city: true },
      },
    },
  });

  const locale = parseLocaleFromCookie(req.headers.get("cookie"));
  const translated = await injectTranslations(services, "service", locale);
  return NextResponse.json({ services: translated });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!me.isActive) return NextResponse.json({ error: "Account is not active" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = body?.service ?? body;

  const type = data?.type === "request" ? "request" : "offer";

  if (!canManageSellerCatalog(me.role)) {
    return NextResponse.json(
      { error: "Розміщення послуг доступне для ролей «Продавець» і «Підприємець»." },
      { status: 403 },
    );
  }
  const title = String(data?.title ?? "").trim();
  const description = String(data?.description ?? "").trim();

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const photos = Array.isArray(data?.photos) ? data.photos.filter((p: unknown) => typeof p === "string").slice(0, 10) : [];

  const service = await prisma.serviceAd.create({
    data: {
      ownerId: session.userId,
      type,
      title: title.slice(0, 200),
      description: description.slice(0, 5000),
      priceTokens: data?.priceTokens != null && data.priceTokens !== "" ? Math.max(0, Math.round(Number(data.priceTokens))) : null,
      priceUAH: data?.priceUAH != null && data.priceUAH !== "" ? Math.max(0, Math.round(Number(data.priceUAH))) : null,
      category: data?.category ? String(data.category).slice(0, 80) : null,
      city: data?.city ? String(data.city).slice(0, 80) : me.city,
      region: data?.region ? String(data.region).slice(0, 80) : me.region,
      photos,
    },
  });

  void translateContent("service", service.id, { title, description });

  return NextResponse.json({ service });
}
