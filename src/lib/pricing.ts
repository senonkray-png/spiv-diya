/** Скільки СпівМонет за 1 ₴ (округлення вгору при перерахунку). */
export function getTokensPerOneUah(): number {
  const n = Number(process.env.NEXT_PUBLIC_TOKENS_PER_1_UAH ?? "1");
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export function uahToTokens(uah: number): number {
  if (uah <= 0) return 0;
  return Math.ceil(uah * getTokensPerOneUah());
}

export function effectivePriceUah(priceUAH: number | null, discountPercent: number): number {
  if (priceUAH == null || priceUAH <= 0) return 0;
  const d = Math.min(100, Math.max(0, Math.round(discountPercent)));
  return Math.round(priceUAH * (1 - d / 100));
}

export function syncPriceTokensFromUah(priceUAH: number | null, discountPercent: number): number {
  return uahToTokens(effectivePriceUah(priceUAH, discountPercent));
}
