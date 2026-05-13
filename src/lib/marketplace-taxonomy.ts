/** Єдиний словник категорій маркетплейсу (slug → укр. назва). Продавець бачить свій `category`; для головної — `catalogCategory`. */

export interface CatalogSubcategoryDef {
  slug: string;
  labelUa: string;
  keywords: string[];
}

export interface CatalogCategoryDef {
  slug: string;
  labelUa: string;
  keywords: string[];
  subcategories: CatalogSubcategoryDef[];
}

export const MARKETPLACE_CATALOG: CatalogCategoryDef[] = [
  {
    slug: "electronics",
    labelUa: "Електроніка",
    keywords: ["телефон", "смартфон", "ноутбук", "планшет", "навушник", "камера", "монітор", "клавіатур", "миш", "зарядк", "кабель", "ssd", "процесор", "відеокарт", "роутер", "wifi", "iphone", "samsung", "xiaomi"],
    subcategories: [
      { slug: "phones", labelUa: "Смартфони", keywords: ["смартфон", "телефон", "iphone", "android", "sim"] },
      { slug: "computers", labelUa: "Комп’ютери", keywords: ["ноутбук", "laptop", "macbook", "pc", "комп’ютер", "моноблок"] },
      { slug: "accessories", labelUa: "Аксесуари", keywords: ["чохол", "скло", "зарядк", "кабель", "powerbank", "навушник"] },
    ],
  },
  {
    slug: "home_garden",
    labelUa: "Дім і сад",
    keywords: ["мебл", "диван", "стіл", "стілець", "ламп", "горш", "сад", "інструмент сад", "штор", "ковер", "посуд", "кухн"],
    subcategories: [
      { slug: "furniture", labelUa: "Меблі", keywords: ["диван", "ліжк", "шаф", "стіл", "мебл"] },
      { slug: "kitchen", labelUa: "Кухня", keywords: ["каструл", "сковород", "нож", "тарілк", "блендер", "міксер"] },
      { slug: "decor", labelUa: "Декор", keywords: ["ваз", "рамк", "картин", "свічк", "декор"] },
    ],
  },
  {
    slug: "beauty_health",
    labelUa: "Краса і здоров’я",
    keywords: ["крем", "шампун", "парфум", "космет", "вітамін", "масаж", "аптек", "зуб", "мило", "маск"],
    subcategories: [
      { slug: "cosmetics", labelUa: "Косметика", keywords: ["крем", "помад", "туш", "тон", "космет"] },
      { slug: "health", labelUa: "Здоров’я", keywords: ["вітамін", "бад", "аптек", "бинт", "термометр"] },
    ],
  },
  {
    slug: "clothing_shoes",
    labelUa: "Одяг і взуття",
    keywords: ["футболк", "штан", "куртк", "сукн", "взутт", "кросівк", "черевик", "шкарпетк", "сумк", "рюкзак", "одяг"],
    subcategories: [
      { slug: "mens", labelUa: "Чоловікам", keywords: ["чоловіч", "men"] },
      { slug: "womens", labelUa: "Жінкам", keywords: ["жіноч", "women", "сукн"] },
      { slug: "shoes", labelUa: "Взуття", keywords: ["кросівк", "черевик", "чобіт", "взутт"] },
    ],
  },
  {
    slug: "food_drinks",
    labelUa: "Продукти та напої",
    keywords: ["кава", "чай", "солодощ", "спеці", "олія", "мед", "сир", "м’яс", "риб", "напій", "вино", "печив"],
    subcategories: [
      { slug: "coffee_tea", labelUa: "Кава / чай", keywords: ["кава", "чай", "зерно", "еспресо"] },
      { slug: "grocery", labelUa: "Бакалія", keywords: ["круп", "макарон", "консерв", "спеці"] },
    ],
  },
  {
    slug: "sports_outdoor",
    labelUa: "Спорт і відпочинок",
    keywords: ["спорт", "велосипед", "тренажер", "гантел", "м’яч", "туризм", "намет", "спальник", "рибалк", "полюванн"],
    subcategories: [
      { slug: "fitness", labelUa: "Фітнес", keywords: ["гантел", "йога", "мат", "тренажер"] },
      { slug: "outdoor", labelUa: "Туризм", keywords: ["намет", "рюкзак турист", "спальник", "компас"] },
    ],
  },
  {
    slug: "auto_moto",
    labelUa: "Авто і мото",
    keywords: ["авто", "машин", "шин", "акумулятор", "олія мотор", "фільтр", "мото", "запчастин"],
    subcategories: [
      { slug: "parts", labelUa: "Запчастини", keywords: ["запчастин", "фільтр", "гальм", "амортизатор"] },
      { slug: "accessories_auto", labelUa: "Аксесуари авто", keywords: ["відеореєстратор", "тримач", "зарядк авто"] },
    ],
  },
  {
    slug: "kids",
    labelUa: "Дитячі товари",
    keywords: ["дитяч", "іграшк", "коляск", "підгуз", "дитин", "школ", "рюкзак дитяч"],
    subcategories: [
      { slug: "toys", labelUa: "Іграшки", keywords: ["іграшк", "конструктор", "лялька"] },
      { slug: "baby", labelUa: "Для малюків", keywords: ["підгуз", "коляск", "пляшечк"] },
    ],
  },
  {
    slug: "tools_industry",
    labelUa: "Інструмент і промисловість",
    keywords: ["дриль", "болгарк", "перфоратор", "ключ", "пила", "зварювальн", "генератор", "компресор", "станок"],
    subcategories: [
      { slug: "power_tools", labelUa: "Електроінструмент", keywords: ["дриль", "болгарк", "перфоратор", "шуруповерт"] },
      { slug: "hand_tools", labelUa: "Ручний інструмент", keywords: ["ключ", "молоток", "викрутк", "рулетк"] },
    ],
  },
  {
    slug: "raw_materials",
    labelUa: "Сировина та матеріали",
    keywords: ["сировин", "метал", "деревин", "тканин", "пластик лист", "рулон", "пісок", "цемент", "фарба опт"],
    subcategories: [],
  },
  {
    slug: "equipment_b2b",
    labelUa: "Обладнання для бізнесу",
    keywords: ["обладнан", "станок", "прес", "лінія", "холодиль промисл", "склад", "підйомник", "вантаж"],
    subcategories: [],
  },
  {
    slug: "other",
    labelUa: "Інше",
    keywords: [],
    subcategories: [],
  },
];

const SLUGS = new Set(MARKETPLACE_CATALOG.map((c) => c.slug));

export function isCatalogCategorySlug(slug: string): boolean {
  return SLUGS.has(slug);
}

export function getCategoryBySlug(slug: string): CatalogCategoryDef | undefined {
  return MARKETPLACE_CATALOG.find((c) => c.slug === slug);
}

export function getCategoryLabelUa(slug: string): string {
  return getCategoryBySlug(slug)?.labelUa ?? slug;
}
