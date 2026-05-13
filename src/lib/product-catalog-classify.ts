import Anthropic from "@anthropic-ai/sdk";
import {
  MARKETPLACE_CATALOG,
  isCatalogCategorySlug,
  type CatalogCategoryDef,
} from "@/lib/marketplace-taxonomy";

const PROMO_RE =
  /(акці|знижк|розпродаж|sale|промо|outlet|black\s*friday|-\s*\d+\s*%|скидк|discount|спеццін|ліквідаці)/i;

export interface CatalogClassifyResult {
  catalogCategory: string;
  catalogSubcategory: string | null;
  isPromotional: boolean;
}

function normalize(text: string): string {
  return `${text}`.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Швидка класифікація без мережі — завжди повертає валідні slug з MARKETPLACE_CATALOG. */
export function classifyMarketplaceProductHeuristic(input: {
  title: string;
  description: string;
  sellerCategory?: string | null;
}): CatalogClassifyResult {
  const blob = normalize(`${input.title} ${input.description} ${input.sellerCategory ?? ""}`);
  const isPromotional = PROMO_RE.test(blob);

  let bestCat: CatalogCategoryDef = MARKETPLACE_CATALOG[MARKETPLACE_CATALOG.length - 1]!;
  let bestScore = -1;
  let bestSub: string | null = null;

  for (const cat of MARKETPLACE_CATALOG) {
    if (cat.slug === "other") continue;
    let score = 0;
    for (const kw of cat.keywords) {
      if (kw && blob.includes(kw.toLowerCase())) score += 3;
    }
    let subSlug: string | null = null;
    let subBest = -1;
    for (const sub of cat.subcategories) {
      let s = 0;
      for (const kw of sub.keywords) {
        if (kw && blob.includes(kw.toLowerCase())) s += 2;
      }
      if (s > subBest) {
        subBest = s;
        subSlug = sub.slug;
      }
    }
    score += subBest;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
      bestSub = subSlug && subBest > 0 ? subSlug : null;
    }
  }

  if (bestScore <= 0) {
    return {
      catalogCategory: "other",
      catalogSubcategory: null,
      isPromotional,
    };
  }

  return {
    catalogCategory: bestCat.slug,
    catalogSubcategory: bestSub,
    isPromotional,
  };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function classifyWithAnthropic(input: {
  title: string;
  description: string;
  sellerCategory?: string | null;
}): Promise<CatalogClassifyResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key?.trim()) return null;

  const allowed = MARKETPLACE_CATALOG.filter((c) => c.slug !== "other")
    .map((c) => {
      const subs = c.subcategories.map((s) => `${s.slug} (${s.labelUa})`).join(", ");
      return `- ${c.slug}: ${c.labelUa}${subs ? `; підкатегорії: ${subs}` : ""}`;
    })
    .join("\n");

  const client = new Anthropic({ apiKey: key });
  const userBlock = `Товар українською (або змішаною) мовою.
Назва: ${input.title.slice(0, 400)}
Опис: ${input.description.slice(0, 4000)}
Категорія продавця (довільна, може бути помилковою): ${input.sellerCategory ?? "—"}

Обери ОДНУ категорію catalogCategory зі списку slug нижче та за потреби catalogSubcategory (slug підкатегорії з тієї ж гілки). Визнач isPromotional якщо явна акція/знижка/розпродаж.

Допустимі catalogCategory (slug):
${allowed}
Також можна "other" якщо нічого не підходить.

Відповідь ТІЛЬКИ JSON об’єктом без markdown:
{"catalogCategory":"...","catalogSubcategory":null або "slug","isPromotional":true/false}`;

  const msg = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 200,
    messages: [{ role: "user", content: userBlock }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = extractJsonObject(text);
  if (!parsed) return null;

  const cat = typeof parsed.catalogCategory === "string" ? parsed.catalogCategory.trim() : "";
  const sub =
    parsed.catalogSubcategory === null || parsed.catalogSubcategory === undefined
      ? null
      : String(parsed.catalogSubcategory).trim() || null;
  const isPromotional = Boolean(parsed.isPromotional);

  if (!isCatalogCategorySlug(cat)) return null;
  const def = MARKETPLACE_CATALOG.find((c) => c.slug === cat);
  if (!def) return null;
  if (sub && !def.subcategories.some((s) => s.slug === sub)) {
    return { catalogCategory: cat, catalogSubcategory: null, isPromotional };
  }
  return { catalogCategory: cat, catalogSubcategory: sub, isPromotional };
}

/** Класифікація для головної / фільтрів: спочатку Claude (якщо є ключ), інакше евристика. */
export async function classifyMarketplaceProduct(input: {
  title: string;
  description: string;
  sellerCategory?: string | null;
}): Promise<CatalogClassifyResult> {
  try {
    const ai = await classifyWithAnthropic(input);
    if (ai) return ai;
  } catch {
    // fall through
  }
  return classifyMarketplaceProductHeuristic(input);
}
