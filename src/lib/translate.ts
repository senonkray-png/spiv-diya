import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const client = new Anthropic();

const TARGET_LOCALES = ["ru", "en"] as const;
type TargetLocale = (typeof TARGET_LOCALES)[number];

const LOCALE_NAMES: Record<TargetLocale, string> = {
  ru: "Russian",
  en: "English",
};

export type TranslatableEntityType = "product" | "service" | "post" | "resource";

export interface TranslatableFields {
  title?: string;
  description?: string;
  body?: string;
  [key: string]: string | undefined;
}

/**
 * Translates content fields to all target locales using Claude.
 * Runs fire-and-forget — call without awaiting from API routes.
 */
export async function translateContent(
  entityType: TranslatableEntityType,
  entityId: string,
  fields: TranslatableFields,
): Promise<void> {
  const fieldEntries = Object.entries(fields).filter(([, v]) => v && v.trim().length > 0) as [string, string][];
  if (fieldEntries.length === 0) return;

  const fieldsList = fieldEntries.map(([k, v]) => `${k}: ${v}`).join("\n---\n");

  await Promise.allSettled(
    TARGET_LOCALES.map(async (locale) => {
      try {
        const msg = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          system: `You are a professional translator. Translate the provided content fields to ${LOCALE_NAMES[locale]}.
Rules:
- Preserve the original meaning and tone
- For product/service titles: keep them natural and market-ready
- Return ONLY a JSON object with the same field names as input, no extra text
- Example output: {"title":"...","description":"..."}`,
          messages: [
            {
              role: "user",
              content: `Translate these fields to ${LOCALE_NAMES[locale]}:\n\n${fieldsList}\n\nReturn JSON only.`,
            },
          ],
        });

        const raw = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;

        const translated = JSON.parse(jsonMatch[0]) as Record<string, string>;

        await prisma.contentTranslation.upsert({
          where: {
            entityType_entityId_locale: { entityType, entityId, locale },
          },
          create: { entityType, entityId, locale, fields: translated },
          update: { fields: translated },
        });
      } catch {
        // Translation failure is non-critical — original content is still shown
      }
    }),
  );
}

/**
 * Deletes all translations for an entity (call when entity is deleted).
 */
export async function deleteTranslations(entityType: TranslatableEntityType, entityId: string) {
  await prisma.contentTranslation.deleteMany({ where: { entityType, entityId } }).catch(() => {});
}

/**
 * Reads locale from Next.js cookie string (NEXT_LOCALE=xx).
 */
export function parseLocaleFromCookie(cookieHeader: string | null): string {
  if (!cookieHeader) return "uk";
  const match = cookieHeader.match(/NEXT_LOCALE=([a-z]{2})/);
  return match?.[1] ?? "uk";
}

/**
 * Injects translated fields into an array of entities if locale != 'uk'.
 * Mutates objects in place.
 */
export async function injectTranslations<T extends { id: string; [key: string]: unknown }>(
  items: T[],
  entityType: TranslatableEntityType,
  locale: string,
): Promise<T[]> {
  if (locale === "uk" || items.length === 0) return items;

  const ids = items.map((i) => i.id);
  const translations = await prisma.contentTranslation.findMany({
    where: { entityType, entityId: { in: ids }, locale },
  });

  const byId = new Map(translations.map((t) => [t.entityId, t.fields as Record<string, string>]));

  return items.map((item) => {
    const tx = byId.get(item.id);
    if (!tx) return item;
    return { ...item, ...tx };
  });
}

/**
 * Injects translation for a single entity.
 */
export async function injectTranslation<T extends { id: string; [key: string]: unknown }>(
  item: T,
  entityType: TranslatableEntityType,
  locale: string,
): Promise<T> {
  if (locale === "uk") return item;

  const tx = await prisma.contentTranslation.findUnique({
    where: { entityType_entityId_locale: { entityType, entityId: item.id, locale } },
  });

  if (!tx) return item;
  return { ...item, ...(tx.fields as Record<string, string>) };
}
