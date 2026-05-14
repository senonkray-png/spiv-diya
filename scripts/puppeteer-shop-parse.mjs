/**
 * Універсальний парсинг карток товару з каталогу через Puppeteer (JS-рендер, антибот).
 *
 * Встановлення (один раз): npm install
 * Запуск:
 *   node scripts/puppeteer-shop-parse.mjs --config=scripts/import-selectors.example.json
 * або:
 *   IMPORT_URL=https://shop.ua/cat node scripts/puppeteer-shop-parse.mjs
 *
 * Результат: JSON у stdout або файл (--out=parsed-results.json)
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const out = { config: null, out: null, url: null };
  for (const a of argv) {
    if (a.startsWith("--config=")) out.config = a.slice("--config=".length);
    else if (a.startsWith("--out=")) out.out = a.slice("--out=".length);
    else if (a.startsWith("--url=")) out.url = a.slice("--url=".length);
  }
  return out;
}

const defaultSelectors = {
  productCard: ".product-item",
  title: ".product-title",
  price: ".price-value",
  image: "img.main-photo",
  volume: ".attr-volume",
  nextPage: "a.next-page-btn",
};

function loadConfig(cli) {
  let cfg = {
    targetUrl: process.env.IMPORT_URL || "",
    maxPages: Number(process.env.IMPORT_MAX_PAGES || "5") || 5,
    selectors: { ...defaultSelectors },
  };

  if (cli.config) {
    const raw = fs.readFileSync(path.resolve(cli.config), "utf8");
    const j = JSON.parse(raw);
    if (j.targetUrl) cfg.targetUrl = j.targetUrl;
    if (j.maxPages != null) cfg.maxPages = Number(j.maxPages) || cfg.maxPages;
    if (j.selectors && typeof j.selectors === "object") {
      cfg.selectors = { ...defaultSelectors, ...j.selectors };
    }
  }
  if (cli.url) cfg.targetUrl = cli.url;
  if (!cfg.targetUrl?.trim()) {
    console.error("Вкажіть URL: --url=... або IMPORT_URL=... або targetUrl у JSON-конфігу.");
    process.exit(1);
  }
  return cfg;
}

async function scrapePage(page, cfg) {
  return page.evaluate((c) => {
    const sel = c.selectors;
    const items = [];
    const cards = document.querySelectorAll(sel.productCard);

    cards.forEach((card) => {
      const titleEl = card.querySelector(sel.title);
      const priceEl = card.querySelector(sel.price);
      const imgEl = card.querySelector(sel.image);
      const volEl = sel.volume ? card.querySelector(sel.volume) : null;

      if (titleEl) {
        const priceText = priceEl ? priceEl.textContent.trim() : "";
        const digits = priceText.replace(/[^\d.,]/g, "").replace(",", ".");
        const priceNum = parseFloat(digits);
        items.push({
          name: titleEl.textContent.trim(),
          price: Number.isFinite(priceNum) ? String(Math.round(priceNum)) : "0",
          priceRaw: priceText,
          imageUrl: imgEl ? imgEl.src || imgEl.getAttribute("data-src") || "" : "",
          volume: volEl ? volEl.textContent.trim() : "",
          pageUrl: window.location.href,
          source: window.location.hostname,
        });
      }
    });
    return items;
  }, cfg);
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const CONFIG = loadConfig(cli);

  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer?.default) {
    console.error(
      "Пакет puppeteer не встановлено. Виконайте: npm install puppeteer --save-dev",
    );
    process.exit(1);
  }

  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  const all = [];
  let pageIndex = 0;

  try {
    await page.goto(CONFIG.targetUrl, { waitUntil: "networkidle2", timeout: 90_000 });

    while (pageIndex < CONFIG.maxPages) {
      const batch = await scrapePage(page, CONFIG);
      all.push(...batch);
      pageIndex += 1;

      const hasNext = await page.evaluate((sel) => {
        const el = document.querySelector(sel.nextPage);
        return !!(el && !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true");
      }, CONFIG.selectors);

      if (!hasNext || pageIndex >= CONFIG.maxPages) break;

      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60_000 }).catch(() => null),
        page.click(CONFIG.selectors.nextPage),
      ]);
    }

    const payload = JSON.stringify(all, null, 2);
    const outPath = cli.out || process.env.IMPORT_OUT || "";

    if (outPath) {
      fs.writeFileSync(path.resolve(outPath), payload, "utf8");
      console.error(`Збережено ${all.length} позицій у ${path.resolve(outPath)}`);
    } else {
      process.stdout.write(payload);
    }
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
