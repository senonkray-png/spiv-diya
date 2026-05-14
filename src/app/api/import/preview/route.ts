import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageSellerCatalog } from "@/lib/auth";
import { fetchAndParseProducts, fetchSiteProductCatalog } from "@/lib/import/site-importer";
import {
  defaultCatalogSelectors,
  scrapeCatalogWithPuppeteer,
  type CatalogSelectors,
} from "@/lib/import/puppeteer-catalog";

export const runtime = "nodejs";
export const maxDuration = 120;

function clampInt(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

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

  const mode: "site" | "page" | "browse" =
    body?.mode === "page" ? "page" : body?.mode === "browse" ? "browse" : "site";

  const maxUrls = clampInt(parseInt(process.env.IMPORT_MAX_URLS ?? "600", 10) || 600, 50, 2500);
  const maxFetch = clampInt(parseInt(process.env.IMPORT_MAX_FETCH ?? "220", 10) || 220, 20, 400);
  const concurrency = clampInt(parseInt(process.env.IMPORT_FETCH_CONCURRENCY ?? "5", 10) || 5, 1, 8);

  try {
    let items;

    if (mode === "browse") {
      if (process.env.IMPORT_ENABLE_HEADLESS !== "1") {
        return NextResponse.json(
          {
            error:
              "Режим «каталог у браузері» вимкнено. Для VPS/локально задайте IMPORT_ENABLE_HEADLESS=1 або використайте «Отримати товари з сайту».",
          },
          { status: 403 },
        );
      }
      const rawSel = body?.selectors;
      const selectors: CatalogSelectors = {
        ...defaultCatalogSelectors,
        ...(rawSel && typeof rawSel === "object" ? (rawSel as Partial<CatalogSelectors>) : {}),
      };
      const maxPages = clampInt(Number(body?.maxPages) || 10, 1, 30);
      items = await scrapeCatalogWithPuppeteer(url, { selectors, maxPages });
    } else if (mode === "page") {
      items = await fetchAndParseProducts(url, { limit: 30, linkFollow: 12 });
    } else {
      items = await fetchSiteProductCatalog(url, { maxUrls, maxFetch, concurrency });
    }

    return NextResponse.json({ items, mode });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 400 },
    );
  }
}
