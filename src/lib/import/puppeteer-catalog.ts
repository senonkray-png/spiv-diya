import type { ImportedProduct } from "@/lib/import/site-importer";

export type CatalogSelectors = {
  productCard: string;
  title: string;
  price: string;
  image: string;
  volume: string;
  nextPage: string;
};

export const defaultCatalogSelectors: CatalogSelectors = {
  productCard: ".product-item",
  title: ".product-title",
  price: ".price-value",
  image: "img.main-photo",
  volume: ".attr-volume",
  nextPage: "a.next-page-btn",
};

type ScrapedRow = {
  name: string;
  price: string;
  priceRaw: string;
  imageUrl: string;
  volume: string;
  pageUrl: string;
};

function absUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function rowToImported(row: ScrapedRow, index: number): ImportedProduct {
  const priceNum = Number(row.price);
  const priceUAH = Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum) : null;
  const desc = [row.name, row.volume ? `Фасовка: ${row.volume}` : "", row.priceRaw ? `Ціна на сайті: ${row.priceRaw}` : ""]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
  const photos: string[] = [];
  if (row.imageUrl) photos.push(absUrl(row.imageUrl, row.pageUrl));
  const sourceUrl = `${row.pageUrl.replace(/#.*$/, "")}#import-${index}-${encodeURIComponent(row.name.slice(0, 40))}`;
  return {
    title: row.name.slice(0, 200),
    description: desc || row.name,
    priceUAH,
    priceTokens: 0,
    photos,
    sourceUrl: sourceUrl.slice(0, 500),
    dimensionsText: row.volume || null,
  };
}

/**
 * Збір карток з каталогу через Puppeteer (локально / VPS; на типовому Vercel не працює без окремого Chromium).
 */
export async function scrapeCatalogWithPuppeteer(
  targetUrl: string,
  options: { selectors: CatalogSelectors; maxPages: number },
): Promise<ImportedProduct[]> {
  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer?.default) {
    throw new Error("Пакет puppeteer не встановлено на сервері.");
  }

  const { selectors, maxPages } = options;
  const pages = Math.max(1, Math.min(30, maxPages));

  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  const raw: ScrapedRow[] = [];
  let pageIndex = 0;

  try {
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 90_000 });

    while (pageIndex < pages) {
      const batch: ScrapedRow[] = await page.evaluate((sel) => {
        const items: ScrapedRow[] = [];
        const cards = document.querySelectorAll(sel.productCard);
        cards.forEach((card) => {
          const titleEl = card.querySelector(sel.title);
          const priceEl = card.querySelector(sel.price);
          const imgEl = card.querySelector(sel.image);
          const volEl = sel.volume ? card.querySelector(sel.volume) : null;
          if (!titleEl) return;
          const priceText = priceEl ? priceEl.textContent?.trim() ?? "" : "";
          const digits = priceText.replace(/[^\d.,]/g, "").replace(",", ".");
          const priceNum = parseFloat(digits);
          items.push({
            name: titleEl.textContent?.trim() ?? "",
            price: Number.isFinite(priceNum) ? String(Math.round(priceNum)) : "0",
            priceRaw: priceText,
            imageUrl: imgEl ? imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "" : "",
            volume: volEl ? volEl.textContent?.trim() ?? "" : "",
            pageUrl: window.location.href,
          });
        });
        return items;
      }, selectors);

      raw.push(...batch);
      pageIndex += 1;

      const hasNext = await page.evaluate((sel) => {
        const el = document.querySelector(sel.nextPage);
        return !!(el && !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true");
      }, selectors);

      if (!hasNext || pageIndex >= pages) break;

      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60_000 }).catch(() => null),
        page.click(selectors.nextPage),
      ]);
    }
  } finally {
    await browser.close();
  }

  return raw.map((row, i) => rowToImported(row, i));
}
