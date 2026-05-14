import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";
import { classifyMarketplaceProductHeuristic } from "@/lib/product-catalog-classify";
import { syncPriceTokensFromUah } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 120;

function commitMax(): number {
  const n = parseInt(process.env.IMPORT_COMMIT_MAX ?? "300", 10);
  if (Number.isNaN(n)) return 300;
  return Math.min(500, Math.max(1, n));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "Немає товарів" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageSellerCatalog(me.role)) {
    return NextResponse.json(
      { error: "Імпорт доступний для ролей «Продавець» і «Підприємець»." },
      { status: 403 },
    );
  }

  const maxItems = commitMax();
  const created = [];
  for (const raw of items.slice(0, maxItems)) {
    const title = String(raw?.title ?? "").trim();
    const description = String(raw?.description ?? "").trim();
    if (!title || !description) continue;

    const photos = Array.isArray(raw?.photos)
      ? raw.photos.filter((p: unknown) => typeof p === "string").slice(0, 8)
      : [];

    const labels = classifyMarketplaceProductHeuristic({
      title,
      description,
      sellerCategory: null,
    });

    const priceUAH = raw?.priceUAH != null ? Math.max(0, Math.round(Number(raw.priceUAH))) : null;
    const discountPercent = 0;
    const priceTokens =
      priceUAH != null
        ? syncPriceTokensFromUah(priceUAH, discountPercent)
        : raw?.priceTokens
          ? Math.max(0, Math.round(Number(raw.priceTokens)))
          : 0;

    const dimensionsText =
      typeof raw?.dimensionsText === "string" && raw.dimensionsText.trim()
        ? raw.dimensionsText.trim().slice(0, 500)
        : null;

    const product = await prisma.product.create({
      data: {
        ownerId: session.userId,
        title: title.slice(0, 200),
        description: description.slice(0, 5000),
        priceUAH,
        priceTokens,
        discountPercent,
        dimensionsText,
        photos,
        sourceUrl: raw?.sourceUrl ? String(raw.sourceUrl).slice(0, 500) : null,
        externalId: raw?.externalId ? String(raw.externalId).slice(0, 200) : null,
        city: me.city,
        region: me.region,
        catalogCategory: labels.catalogCategory,
        catalogSubcategory: labels.catalogSubcategory,
        isPromotional: labels.isPromotional,
      },
    });
    created.push(product.id);
  }

  return NextResponse.json({ created: created.length });
}
