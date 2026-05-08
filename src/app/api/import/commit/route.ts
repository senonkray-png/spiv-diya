import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "Немає товарів" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const created = [];
  for (const raw of items.slice(0, 50)) {
    const title = String(raw?.title ?? "").trim();
    const description = String(raw?.description ?? "").trim();
    if (!title || !description) continue;

    const photos = Array.isArray(raw?.photos)
      ? raw.photos.filter((p: unknown) => typeof p === "string").slice(0, 8)
      : [];

    const product = await prisma.product.create({
      data: {
        ownerId: session.userId,
        title: title.slice(0, 200),
        description: description.slice(0, 5000),
        priceUAH: raw?.priceUAH != null ? Math.max(0, Math.round(Number(raw.priceUAH))) : null,
        priceTokens: raw?.priceTokens ? Math.max(0, Math.round(Number(raw.priceTokens))) : 0,
        photos,
        sourceUrl: raw?.sourceUrl ? String(raw.sourceUrl).slice(0, 500) : null,
        externalId: raw?.externalId ? String(raw.externalId).slice(0, 200) : null,
        city: me.city,
        region: me.region,
      },
    });
    created.push(product.id);
  }

  return NextResponse.json({ created: created.length });
}
