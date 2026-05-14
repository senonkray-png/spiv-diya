import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function smartAutoParse(targetUrl) {
    console.log(`🔍 Анализ структуры: ${targetUrl}`);
    
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // ЭТАП 1: Автоматический поиск классов карточки
        const detectedSchema = await page.evaluate(() => {
            // Ищем все ссылки, внутри которых есть картинка и текст (типичная карточка)
            const allLinks = Array.from(document.querySelectorAll('a'));
            const productCandidates = allLinks.filter(a => a.querySelector('img') && a.innerText.length > 5);
            
            if (productCandidates.length === 0) return null;

            // Берем самую частую структуру класса
            const sample = productCandidates[0];
            const titleEl = sample.querySelector('h1, h2, h3, h4, span[class*="title"], div[class*="title"]');
            const priceEl = sample.querySelector('span[class*="price"], div[class*="price"], b, strong');
            
            return {
                cardSelector: `a[href*="${sample.pathname.split('/')[1]}"]`, // Динамический селектор ссылки
                titleClass: titleEl ? `.${titleEl.className.split(' ').join('.')}` : 'h3',
                priceClass: priceEl ? `.${priceEl.className.split(' ').join('.')}` : 'span',
                nextBtnType: !!document.querySelector('button, a')?.innerText.match(/>|Next|Вперед/) ? 'click' : 'scroll'
            };
        });

        console.log('✅ Структура определена:', detectedSchema);

        // ЭТАП 2: Сбор данных с учетом типа пагинации
        let allProducts = [];
        let hasMore = true;
        let pageNum = 1;

        while (hasMore && pageNum <= 10) {
            console.log(`📦 Обработка страницы ${pageNum}...`);

            // Ждем подгрузки
            await new Promise(r => setTimeout(r, 2000));

            const pageData = await page.evaluate((schema) => {
                const cards = document.querySelectorAll(schema.cardSelector);
                return Array.from(cards).map(card => ({
                    name: card.querySelector(schema.titleClass)?.innerText.trim(),
                    price: card.querySelector(schema.priceClass)?.innerText.replace(/[^\d]/g, ''),
                    image: card.querySelector('img')?.src,
                    url: card.href
                })).filter(p => p.name && p.image);
            }, detectedSchema);

            allProducts.push(...pageData);

            // ЛОГИКА ПАГИНАЦИИ (Скролл или Клик)
            if (detectedSchema.nextBtnType === 'click') {
                const clicked = await page.evaluate(() => {
                    const btn = Array.from(document.querySelectorAll('button, a, span'))
                                     .find(el => el.innerText.match(/>|Next|Вперед/) && el.offsetParent !== null);
                    if (btn) { btn.click(); return true; }
                    return false;
                });
                if (!clicked) hasMore = false;
            } else {
                // Скролл
                const prevHeight = await page.evaluate('document.body.scrollHeight');
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await new Promise(r => setTimeout(r, 2000));
                const newHeight = await page.evaluate('document.body.scrollHeight');
                if (newHeight === prevHeight) hasMore = false;
            }

            pageNum++;
        }

        // Чистим дубликаты
        const unique = Array.from(new Map(allProducts.map(item => [item.url, item])).values());
        
        // Сохранение
        const output = path.join(__dirname, '../data/smart-results.json');
        fs.writeFileSync(output, JSON.stringify(unique, null, 2));
        console.log(`\n✨ Готово! Найдено уникальных товаров: ${unique.length}`);
        console.log(`📁 Файл: ${output}`);

    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    } finally {
        await browser.close();
    }
}

// Запуск: node scripts/analitik-pars.mjs <url>
const targetArg = process.argv[2];
if (!targetArg) {
  console.error('❌ Вкажіть URL: node scripts/analitik-pars.mjs https://example.com/catalog');
  process.exit(1);
}
smartAutoParse(targetArg);