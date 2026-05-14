import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";
import { fetchAndParseProducts, fetchSiteProductCatalog } from "@/lib/import/site-importer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!me || !canManageSellerCatalog(me.role)) {
    return NextResponse.json(
      { error: "Імпорт доступний для ролей «Продавець» і «Підприємець»." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "Вкажіть URL" }, { status: 400 });

  const mode = body?.mode === "page" ? "page" : "site";

  try {
    const items =
      mode === "page"
        ? await fetchAndParseProducts(url, { limit: 30, linkFollow: 12 })
        : await fetchSiteProductCatalog(url, { maxUrls: 220, maxFetch: 90, concurrency: 5 });
    return NextResponse.json({ items, mode });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 400 },
    );
  }
}
