/**
 * Tailwind CSS 4 у цьому проєкті збирається через `@tailwindcss/postcss`.
 *
 * Основна тема (кольори, радіуси, typography) описана в CSS:
 * — `src/styles/design-system.css` — токени + блок `@theme inline`
 * — `src/app/globals.css` — імпорт Tailwind та base-шари
 *
 * Переносимо JavaScript-config лише коли знадобиться (@config у CSS),
 * бо v4 використовує CSS-first конфігурацію.
 */

export default {};
