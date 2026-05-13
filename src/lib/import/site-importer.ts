/**
 * Lightweight site importer.
 *
 * Strategy (best-effort, no headless browser):
 *   1. Fetch the page HTML.
 *   2. Try to extract structured data (JSON-LD `Product` blocks, OpenGraph meta).
 *   3. If we got a single product → return that.
 *   4. Else look for product cards on listing pages: links matching `/product/`,
 *      images near them, prices in nearby text. (Heuristic.)
 */

export interface ImportedProduct {
  title: string;
  description: string;
  priceUAH: number | null;
  priceTokens: number;
  photos: string[];
  sourceUrl: string;
  externalId?: string;
}

const UAH_RX = /([\d\u00A0\s]+(?:[.,]\d+)?)\s*(?:грн|₴|UAH|uah)/i;
const USD_RX = /\$\s*([\d\u00A0\s]+(?:[.,]\d+)?)/i;

function parsePrice(raw: string): number | null {
  const uah = raw.match(UAH_RX);
  if (uah) {
    const n = Number(uah[1].replace(/[\u00A0\s]/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return Math.round(n);
  }
  const usd = raw.match(USD_RX);
  if (usd) {
    const n = Number(usd[1].replace(/[\u00A0\s]/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return Math.round(n * 41); // rough USD → UAH
  }
  return null;
}

function decode(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function metaTag(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  return m ? decode(m[1]) : null;
}

function metaTagAlt(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  const m = html.match(re);
  return m ? decode(m[1]) : null;
}

function getMeta(html: string, prop: string): string | null {
  return metaTag(html, prop) ?? metaTagAlt(html, prop);
}

function abs(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // ignore malformed blocks
    }
  }
  return blocks;
}

function fromJsonLdProduct(block: unknown, baseUrl: string): ImportedProduct | null {
  if (!block || typeof block !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = block as any;
  const types = Array.isArray(b["@type"]) ? b["@type"] : [b["@type"]];
  if (!types.some((t: string) => typeof t === "string" && t.toLowerCase().includes("product"))) {
    return null;
  }
  const title = String(b.name ?? "").trim();
  if (!title) return null;
  const description = stripTags(String(b.description ?? "")).slice(0, 4000);
  const offers = b.offers ?? {};
  const priceRaw = String(offers.price ?? offers.lowPrice ?? "").trim();
  let priceUAH: number | null = null;
  if (priceRaw) {
    const n = Number(priceRaw.replace(",", "."));
    if (!Number.isNaN(n) && n > 0) {
      const cur = String(offers.priceCurrency ?? "UAH").toUpperCase();
      priceUAH = cur === "USD" ? Math.round(n * 41) : cur === "EUR" ? Math.round(n * 44) : Math.round(n);
    }
  }
  const photos: string[] = [];
  const imageField = b.image;
  if (typeof imageField === "string") photos.push(abs(imageField, baseUrl));
  else if (Array.isArray(imageField)) {
    for (const i of imageField) {
      if (typeof i === "string") photos.push(abs(i, baseUrl));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if (i && typeof i === "object" && (i as any).url) photos.push(abs(String((i as any).url), baseUrl));
    }
  }
  return {
    title: title.slice(0, 200),
    description,
    priceUAH,
    priceTokens: 0,
    photos: photos.slice(0, 8),
    sourceUrl: baseUrl,
    externalId: b.sku ? String(b.sku) : undefined,
  };
}

function fromOpenGraph(html: string, url: string): ImportedProduct | null {
  const title = getMeta(html, "og:title") ?? getMeta(html, "twitter:title");
  if (!title) return null;
  const description = getMeta(html, "og:description") ?? getMeta(html, "description") ?? "";
  const image = getMeta(html, "og:image") ?? getMeta(html, "twitter:image");
  const priceRaw = getMeta(html, "product:price:amount") ?? getMeta(html, "og:price:amount");
  let priceUAH: number | null = null;
  if (priceRaw) {
    const n = Number(priceRaw.replace(",", "."));
    if (!Number.isNaN(n) && n > 0) priceUAH = Math.round(n);
  }
  if (!priceUAH) {
    const found = parsePrice(stripTags(html.slice(0, 50000)));
    if (found) priceUAH = found;
  }
  return {
    title: title.slice(0, 200),
    description: stripTags(description).slice(0, 4000),
    priceUAH,
    priceTokens: 0,
    photos: image ? [abs(image, url)] : [],
    sourceUrl: url,
  };
}

export async function fetchAndParseProducts(
  url: string,
  options: { limit?: number } = {},
): Promise<ImportedProduct[]> {
  const limit = options.limit ?? 30;

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("URL має починатись з http:// або https://");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SpivdiaImporter/1.0; +https://spivdia.app)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "uk,ru;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`Не вдалось отримати сторінку (HTTP ${res.status})`);
  const html = await res.text();

  const out: ImportedProduct[] = [];

  // 1. JSON-LD products
  for (const block of extractJsonLd(html)) {
    const p = fromJsonLdProduct(block, url);
    if (p) out.push(p);
    if (out.length >= limit) break;
    // Some sites wrap multiple products in `@graph`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (block && typeof block === "object" && Array.isArray((block as any)["@graph"])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const inner of (block as any)["@graph"]) {
        const p2 = fromJsonLdProduct(inner, url);
        if (p2) out.push(p2);
        if (out.length >= limit) break;
      }
    }
  }

  // 2. Fallback: single product by OpenGraph
  if (out.length === 0) {
    const og = fromOpenGraph(html, url);
    if (og) out.push(og);
  }

  return out.slice(0, limit);
}
