import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";
import { classifyMarketplaceProduct } from "@/lib/product-catalog-classify";
import { syncPriceTokensFromUah } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sellerId = url.searchParams.get("sellerId");
  const q = url.searchParams.get("q");
  const category = url.searchParams.get("category");
  const catalogCategory = url.searchParams.get("catalogCategory");
  const includeMine = url.searchParams.get("includeMine") === "1";

  const session = includeMine ? await getSession() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (sellerId) {
    where.ownerId = sellerId;
  } else if (includeMine && session) {
    where.OR = [{ status: "active" }, { ownerId: session.userId }];
  } else {
    where.status = "active";
  }

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
  if (category) where.category = category;
  if (catalogCategory) where.catalogCategory = catalogCategory;

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      owner: {
        select: { id: true, companyName: true, city: true, avatarUrl: true, verified: true },
      },
    },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!me.isActive) return NextResponse.json({ error: "Account is not active" }, { status: 403 });

  if (!canManageSellerCatalog(me.role)) {
    return NextResponse.json(
      { error: "Розміщення товарів доступне для планів «Продавець» і «Підприємець». Активуйте підписку." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const data = body?.product ?? body;

  const title = String(data?.title ?? "").trim();
  const description = String(data?.description ?? "").trim();
  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const priceUAH = data?.priceUAH != null ? Math.max(0, Math.round(Number(data.priceUAH))) : null;
  const discountPercent = Math.min(100, Math.max(0, Math.round(Number(data?.discountPercent ?? 0))));
  let stockQuantity: number | null = null;
  if (data?.stockQuantity === null || data?.stockQuantity === "") stockQuantity = null;
  else if (data?.stockQuantity != null && data.stockQuantity !== "")
    stockQuantity = Math.max(0, Math.round(Number(data.stockQuantity)));
  const dimensionsText =
    typeof data?.dimensionsText === "string" ? data.dimensionsText.trim().slice(0, 500) || null : null;

  const priceTokensManual = Math.max(0, Math.round(Number(data?.priceTokens ?? 0)));
  const priceTokens =
    priceUAH != null ? syncPriceTokensFromUah(priceUAH, discountPercent) : priceTokensManual;
  const photos = Array.isArray(data?.photos) ? data.photos.filter((p: unknown) => typeof p === "string").slice(0, 10) : [];
  const sellerCat = data?.category ? String(data.category).slice(0, 80) : null;

  const labels = await classifyMarketplaceProduct({
    title,
    description,
    sellerCategory: sellerCat,
  });

  const product = await prisma.product.create({
    data: {
      ownerId: session.userId,
      title: title.slice(0, 200),
      description: description.slice(0, 5000),
      priceTokens,
      priceUAH,
      discountPercent,
      stockQuantity,
      dimensionsText,
      currency: typeof data?.currency === "string" ? data.currency : "UAH",
      category: sellerCat,
      catalogCategory: labels.catalogCategory,
      catalogSubcategory: labels.catalogSubcategory,
      isPromotional: labels.isPromotional,
      city: data?.city ? String(data.city).slice(0, 80) : me.city,
      region: data?.region ? String(data.region).slice(0, 80) : me.region,
      photos,
      sourceUrl: data?.sourceUrl ? String(data.sourceUrl).slice(0, 500) : null,
      externalId: data?.externalId ? String(data.externalId).slice(0, 200) : null,
    },
  });

  // Notify users who favorited this seller — their feed should highlight the new product
  const followers = await prisma.favorite.findMany({
    where: { userId: me.id },
    select: { ownerId: true },
  });
  if (followers.length > 0) {
    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.ownerId,
        type: "favorite_new_product",
        title: `Новий товар від ${me.companyName}`,
        body: title.slice(0, 120),
        entityType: "product",
        entityId: product.id,
        link: `/marketplace/products/${product.id}`,
      })),
    });
  }

  return NextResponse.json({ product });
}
