/**
 * Lightweight site importer (best-effort, no headless browser).
 *
 * 1. Fetch HTML.
 * 2. JSON-LD: Product (incl. @graph, ItemList → Product), flexible <script type=...ld+json>.
 * 3. OpenGraph / <title> / meta description + price heuristics in page text.
 * 4. If still empty: same-origin links that look like product URLs → fetch a few pages and parse.
 */

export interface ImportedProduct {
  title: string;
  description: string;
  priceUAH: number | null;
  priceTokens: number;
  photos: string[];
  sourceUrl: string;
  externalId?: string;
  /** Фасовка, розміри, дод. характеристики з мікророзмітки */
  dimensionsText?: string | null;
}

const UAH_RX = /([\d\u00A0\s]+(?:[.,]\d+)?)\s*(?:грн|₴|UAH|uah)/i;
const USD_RX = /\$\s*([\d\u00A0\s]+(?:[.,]\d+)?)/i;

/** Paths that often denote a product detail page (same site only). */
const PRODUCT_PATH_HINTS =
  /\/(product|products|p|item|goods|tovar|товар|shop|store|katalog|catalog|collection)\/|\/p\d+\/?(?:$|[?#])|[?&](product_?id|goods_?id|item_?id)=/i;

function isLikelyProductUrl(href: string): boolean {
  try {
    const u = new URL(href);
    const path = u.pathname + u.search;
    if (!/^https?:$/i.test(u.protocol)) return false;
    if (/\.(pdf|jpe?g|png|gif|webp|zip|mp4|css|js|svg)$/i.test(path)) return false;
    if (/sitemap|\/wp-json\/|\/feed\/?/i.test(path)) return false;
    return PRODUCT_PATH_HINTS.test(path);
  } catch {
    return false;
  }
}

function parsePrice(raw: string): number | null {
  const uah = raw.match(UAH_RX);
  if (uah) {
    const n = Number(uah[1].replace(/[\u00A0\s]/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return Math.round(n);
  }
  const usd = raw.match(USD_RX);
  if (usd) {
    const n = Number(usd[1].replace(/[\u00A0\s]/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return Math.round(n * 41);
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
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function metaTag(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decode(m[1]) : null;
}

function metaTagAlt(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
    "i",
  );
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

function getTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const t = stripTags(m[1]);
  return t.length > 0 ? t.slice(0, 300) : null;
}

function tryParseJsonText(raw: string): unknown | null {
  let s = raw.trim();
  s = s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i, "$1").trim();
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  try {
    return JSON.parse(s);
  } catch {
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(s.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    const attrs = m[1];
    if (!/\btype\s*=\s*["']?\s*application\/ld\+json/i.test(attrs)) continue;
    const parsed = tryParseJsonText(m[2]);
    if (parsed == null) continue;
    if (Array.isArray(parsed)) blocks.push(...parsed);
    else blocks.push(parsed);
  }
  return blocks;
}

function isProductSchemaType(t: unknown): boolean {
  if (t == null) return false;
  if (typeof t === "string") {
    const s = t.toLowerCase();
    if (s.includes("itemlist") || s.includes("productcollection") || s.includes("searchresults")) return false;
    return s.includes("product");
  }
  if (Array.isArray(t)) return t.some(isProductSchemaType);
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickOfferPrice(offers: any): { price: string; currency: string } | null {
  if (offers == null) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = raw as any;
    if (typeof o.price === "number" || typeof o.price === "string") {
      const cur = String(o.priceCurrency ?? "UAH");
      return { price: String(o.price), currency: cur };
    }
    if (o.lowPrice != null || o.highPrice != null) {
      const p = o.lowPrice ?? o.highPrice;
      const cur = String(o.priceCurrency ?? "UAH");
      return { price: String(p), currency: cur };
    }
    if (o.priceSpecification) {
      const nested = pickOfferPrice(o.priceSpecification);
      if (nested) return nested;
    }
    if (Array.isArray(o.offers)) {
      const nested = pickOfferPrice(o.offers);
      if (nested) return nested;
    }
    if (o.offers && typeof o.offers === "object") {
      const nested = pickOfferPrice(o.offers);
      if (nested) return nested;
    }
  }
  return null;
}

function priceUahFromOffer(priceRaw: string, currencyRaw: string): number | null {
  const n = Number(String(priceRaw).replace(",", ".").replace(/\s/g, ""));
  if (Number.isNaN(n) || n <= 0) return null;
  const cur = currencyRaw.toUpperCase();
  if (cur === "USD") return Math.round(n * 41);
  if (cur === "EUR") return Math.round(n * 44);
  return Math.round(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDimensionsFromJsonLd(b: any): string | null {
  const lines: string[] = [];
  const ap = b.additionalProperty;
  if (Array.isArray(ap)) {
    for (const x of ap) {
      if (x && typeof x === "object" && x.name != null && x.value != null) {
        lines.push(`${String(x.name).trim()}: ${String(x.value).trim()}`);
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qline = (label: string, v: any) => {
    if (!v || typeof v !== "object") return;
    if (v.value != null) {
      const u = v.unitCode != null ? String(v.unitCode) : v.unitText != null ? String(v.unitText) : "";
      lines.push(`${label}: ${v.value} ${u}`.trim());
    }
  };
  qline("Вага", b.weight);
  qline("Ширина", b.width);
  qline("Висота", b.height);
  qline("Глибина", b.depth);
  if (b.size) {
    if (typeof b.size === "string") lines.push(`Розмір: ${b.size}`);
    else if (typeof b.size === "object") qline("Розмір", b.size);
  }
  if (!lines.length) return null;
  return lines.join(" · ").slice(0, 500);
}

function fromJsonLdProduct(block: unknown, pageUrl: string): ImportedProduct | null {
  if (!block || typeof block !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = block as any;
  if (!isProductSchemaType(b["@type"])) return null;
  const title = String(b.name ?? "").trim();
  if (!title) return null;
  let description = stripTags(String(b.description ?? "")).slice(0, 4000);
  if (!description) description = title;

  const picked = pickOfferPrice(b.offers);
  let priceUAH: number | null = null;
  if (picked) {
    priceUAH = priceUahFromOffer(picked.price, picked.currency);
  }

  const photos: string[] = [];
  const imageField = b.image;
  if (typeof imageField === "string") photos.push(abs(imageField, pageUrl));
  else if (Array.isArray(imageField)) {
    for (const i of imageField) {
      if (typeof i === "string") photos.push(abs(i, pageUrl));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if (i && typeof i === "object" && (i as any).url) photos.push(abs(String((i as any).url), pageUrl));
    }
  }
  const canonical =
    typeof b.url === "string" && b.url.trim()
      ? abs(b.url.trim(), pageUrl)
      : typeof b["@id"] === "string" && /^https?:\/\//i.test(b["@id"])
        ? b["@id"]
        : pageUrl;

  const dimensionsText = buildDimensionsFromJsonLd(b);

  return {
    title: title.slice(0, 200),
    description,
    priceUAH,
    priceTokens: 0,
    photos: photos.slice(0, 8),
    sourceUrl: canonical,
    externalId: b.sku != null ? String(b.sku) : b.gtin != null ? String(b.gtin) : undefined,
    dimensionsText: dimensionsText ?? undefined,
  };
}

function expandGraphBlocks(block: unknown): unknown[] {
  const out: unknown[] = [];
  if (!block || typeof block !== "object") return out;
  out.push(block);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (block as any)["@graph"];
  if (Array.isArray(g)) {
    for (const inner of g) out.push(inner);
  }
  return out;
}

function fromJsonLdItemList(block: unknown, pageUrl: string): ImportedProduct[] {
  if (!block || typeof block !== "object") return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = block as any;
  const types = Array.isArray(b["@type"]) ? b["@type"] : [b["@type"]];
  const isList = types.some((t: unknown) => typeof t === "string" && t.toLowerCase().includes("itemlist"));
  if (!isList) return [];
  const elements = b.itemListElement;
  if (!Array.isArray(elements)) return [];
  const products: ImportedProduct[] = [];
  for (const el of elements) {
    if (!el || typeof el !== "object") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (el as any).item ?? el;
    if (typeof item === "string" && /^https?:\/\//i.test(item)) {
      // URL only — skip here; link follower may pick it up
      continue;
    }
    const p = fromJsonLdProduct(item, pageUrl);
    if (p) products.push(p);
  }
  return products;
}

function fromOpenGraph(html: string, url: string): ImportedProduct | null {
  const title =
    getMeta(html, "og:title") ??
    getMeta(html, "twitter:title") ??
    getMeta(html, "twitter:title:label1") ??
    getTitleTag(html);
  if (!title) return null;
  let description =
    getMeta(html, "og:description") ??
    getMeta(html, "description") ??
    getMeta(html, "twitter:description") ??
    "";
  description = stripTags(description).slice(0, 4000);
  if (!description) description = title;

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
    description,
    priceUAH,
    priceTokens: 0,
    photos: image ? [abs(image, url)] : [],
    sourceUrl: url,
    dimensionsText: undefined,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SpivdiaImporter/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en-US;q=0.7,en;q=0.6",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Не вдалось отримати сторінку (HTTP ${res.status})`);
  return res.text();
}

function collectSameOriginProductLinks(html: string, baseUrl: string, max: number): string[] {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const hrefRe = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    let full: string;
    try {
      full = new URL(m[1].trim(), baseUrl).href;
    } catch {
      continue;
    }
    if (!full.startsWith(origin)) continue;
    if (full.split("#")[0] === baseUrl.split("#")[0]) continue;
    if (!PRODUCT_PATH_HINTS.test(new URL(full).pathname + new URL(full).search)) continue;
    seen.add(full.split("#")[0]);
    if (seen.size >= max) break;
  }
  return [...seen];
}

function parseProductsFromHtml(html: string, pageUrl: string, limit: number): ImportedProduct[] {
  const out: ImportedProduct[] = [];

  for (const block of extractJsonLd(html)) {
    for (const expanded of expandGraphBlocks(block)) {
      const p = fromJsonLdProduct(expanded, pageUrl);
      if (p) out.push(p);
      for (const lp of fromJsonLdItemList(expanded, pageUrl)) {
        out.push(lp);
        if (out.length >= limit) return out.slice(0, limit);
      }
      if (out.length >= limit) return out.slice(0, limit);
    }
  }

  if (out.length === 0) {
    const og = fromOpenGraph(html, pageUrl);
    if (og) out.push(og);
  }

  return out.slice(0, limit);
}

function extractLocsFromXml(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

function urlDedupeKey(href: string): string {
  try {
    const u = new URL(href);
    u.hash = "";
    let p = u.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    u.pathname = p;
    return u.href.toLowerCase();
  } catch {
    return href;
  }
}

/**
 * Збирає адреси карток товарів: sitemap (вкл. індекс), robots.txt, посилання з головної та введеної сторінки.
 */
export async function discoverProductUrls(entryUrl: string, max: number): Promise<string[]> {
  const base = new URL(entryUrl);
  const origin = base.origin;
  const seen = new Map<string, string>();

  const add = (raw: string) => {
    try {
      const n = new URL(raw.trim(), origin).href.split("#")[0];
      if (!n.startsWith(origin)) return;
      if (!isLikelyProductUrl(n)) return;
      const k = urlDedupeKey(n);
      if (!seen.has(k)) seen.set(k, n);
    } catch {
      /* skip */
    }
  };

  const sitemapSeeds = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/wp-sitemap.xml`,
    `${origin}/sitemap-products.xml`,
    `${origin}/product-sitemap.xml`,
  ];

  try {
    const robots = await fetchHtml(`${origin}/robots.txt`);
    for (const line of robots.split(/\r?\n/)) {
      const m = line.match(/^\s*Sitemap:\s*(.+)\s*$/i);
      if (m) sitemapSeeds.push(m[1].trim());
    }
  } catch {
    /* no robots */
  }

  const tried = new Set<string>();
  for (const sm of sitemapSeeds) {
    if (seen.size >= max) break;
    if (tried.has(sm)) continue;
    tried.add(sm);
    let xml: string;
    try {
      xml = await fetchHtml(sm);
    } catch {
      continue;
    }
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    if (isIndex) {
      const nested = extractLocsFromXml(xml).filter((l) => /\.xml(\?|$)/i.test(l));
      for (const nestedUrl of nested.slice(0, 20)) {
        if (seen.size >= max) break;
        if (tried.has(nestedUrl)) continue;
        tried.add(nestedUrl);
        try {
          const inner = await fetchHtml(nestedUrl);
          for (const loc of extractLocsFromXml(inner)) {
            add(loc);
            if (seen.size >= max) break;
          }
        } catch {
          /* skip */
        }
      }
    } else {
      for (const loc of extractLocsFromXml(xml)) {
        add(loc);
        if (seen.size >= max) break;
      }
    }
  }

  const pageSeeds = [entryUrl, `${origin}/`, `${origin}/shop`, `${origin}/shop/`, `${origin}/catalog/`, `${origin}/store/`];
  for (const seed of pageSeeds) {
    if (seen.size >= max) break;
    try {
      const html = await fetchHtml(seed);
      for (const u of collectSameOriginProductLinks(html, seed, 120)) add(u);
    } catch {
      /* skip */
    }
  }

  return [...seen.values()].slice(0, max);
}

/**
 * Повний прохід: знайти URL товарів на сайті й зчитати кожну сторінку (обмеження — захист таймаутів).
 */
export async function fetchSiteProductCatalog(
  entryUrl: string,
  options: { maxUrls?: number; maxFetch?: number; concurrency?: number } = {},
): Promise<ImportedProduct[]> {
  const maxUrls = options.maxUrls ?? 220;
  const maxFetch = options.maxFetch ?? 90;
  const concurrency = Math.max(1, Math.min(8, options.concurrency ?? 5));

  if (!/^https?:\/\//i.test(entryUrl)) {
    throw new Error("URL має починатись з http:// або https://");
  }

  const normalized = new URL(entryUrl).href;
  const urls = await discoverProductUrls(normalized, maxUrls);
  const merged: string[] = [];
  const pushU = (u: string) => {
    const k = urlDedupeKey(u);
    if (merged.some((x) => urlDedupeKey(x) === k)) return;
    merged.push(u.split("#")[0]);
  };
  if (isLikelyProductUrl(normalized)) pushU(normalized);
  for (const u of urls) pushU(u);
  let toFetch = merged.slice(0, maxFetch);
  if (toFetch.length === 0) toFetch = [normalized];

  const out: ImportedProduct[] = [];
  const got = new Set<string>();

  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (u) => {
        try {
          const html = await fetchHtml(u);
          const ps = parseProductsFromHtml(html, u, 1);
          return ps[0] ?? null;
        } catch {
          return null;
        }
      }),
    );
    for (const p of batchResults) {
      if (!p) continue;
      const k = urlDedupeKey(p.sourceUrl) + "\0" + p.title.toLowerCase();
      if (got.has(k)) continue;
      got.add(k);
      out.push(p);
    }
  }

  return out;
}

export async function fetchAndParseProducts(
  url: string,
  options: { limit?: number; linkFollow?: number } = {},
): Promise<ImportedProduct[]> {
  const limit = options.limit ?? 30;
  const linkFollow = options.linkFollow ?? 8;

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("URL має починатись з http:// або https://");
  }

  const html = await fetchHtml(url);
  let out = parseProductsFromHtml(html, url, limit);

  if (out.length === 0 && linkFollow > 0) {
    const links = collectSameOriginProductLinks(html, url, linkFollow);
    const chunk = Math.min(links.length, linkFollow);
    const fetched = await Promise.all(
      links.slice(0, chunk).map(async (u) => {
        try {
          const h = await fetchHtml(u);
          return parseProductsFromHtml(h, u, 1);
        } catch {
          return [] as ImportedProduct[];
        }
      }),
    );
    for (const arr of fetched) {
      for (const p of arr) {
        if (!out.some((x) => x.sourceUrl === p.sourceUrl && x.title === p.title)) out.push(p);
        if (out.length >= limit) break;
      }
      if (out.length >= limit) break;
    }
  }

  return out.slice(0, limit);
}
