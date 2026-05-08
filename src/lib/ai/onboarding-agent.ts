import type { Resource, ResourceCategory } from "@/types";

export interface OnboardingMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ExtractedAsset extends Partial<Resource> {
  category?: ResourceCategory;
  title?: string;
  description?: string;
  city?: string;
  region?: string;
}

export interface ExtractedProfile {
  // Account fields the agent fills in for the user
  businessNiche?: string;
  aboutMe?: string;
  interests?: string[];
  fullName?: string;
  phone?: string;
  websiteUrl?: string;
  city?: string;
  region?: string;

  // Resources
  assets: ExtractedAsset[];
  deficits: ExtractedAsset[];
}

const SYSTEM_PROMPT = `Ти — ШІ-агент платформи «СпівДія». Твоя задача — провести коротке (5–7 повідомлень) дружнє інтерв'ю з представником підприємства та зібрати:

1. Нішу/галузь бізнесу (1–2 слова, наприклад: «пекарня», «логістика», «IT-послуги»).
2. Короткий опис того, чим займається компанія (1–2 речення).
3. 3–5 ключових інтересів/тегів (для пошуку партнерів).
4. Активи компанії — те, що в надлишку: вільне обладнання, площі, транспорт, відділи продажів/маркетингу, сировина, персонал, час фахівців.
5. Дефіцити — те, чого не вистачає для зростання.

ВАЖЛИВІ правила:
- Задавай ОДНЕ запитання за раз. Будь конкретним і дружнім.
- Якщо співрозмовник написав щось абстрактне («у нас все є», «нічого не треба») — уточни конкретними прикладами.
- Не вигадуй за користувача — записуй тільки те, що він явно сказав.
- Місто та регіон бери такі, як вказано в профілі (передаються в контексті).
- Категорії активів/дефіцитів суворо одна з: equipment, space, logistics, raw_materials, sales_department, marketing, workforce.

КОЛИ зібрав хоча б нішу + опис + 1 актив + 1 дефіцит — заверши інтерв'ю короткою подякою і додай у кінці своєї останньої відповіді JSON-блок у такому ТОЧНОМУ форматі (включно з потрійними бектиками):

\`\`\`json
{
  "businessNiche": "Пекарня",
  "aboutMe": "Виробляємо хлібобулочні вироби для роздробу та HoReCa у Києві.",
  "interests": ["хліб", "випічка", "HoReCa", "доставка"],
  "assets": [
    {"category":"sales_department","title":"Велика клієнтська база","description":"500+ роздрібних точок у Києві","city":"Київ","region":"Київська обл."}
  ],
  "deficits": [
    {"category":"equipment","title":"Промислові печі","description":"Не вистачає 2 хлібопічних печей для масштабування","city":"Київ","region":"Київська обл."}
  ]
}
\`\`\`

Якщо чогось не дістав — задай ще одне коротке запитання, але в наступних відповідях обов'язково поверни JSON, як тільки інформації достатньо.`;

async function callOpenRouter(
  history: OnboardingMessage[],
  userMessage: string,
  context: string
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      "X-Title": "SpivDiia",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n\n" + context },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export interface ChatContext {
  companyName?: string;
  industry?: string;
  city?: string;
  region?: string;
}

export async function chat(
  history: OnboardingMessage[],
  userMessage: string,
  ctx: ChatContext = {}
): Promise<{ reply: string; profile?: ExtractedProfile }> {
  const isStub = !process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.startsWith("stub_");

  const contextLine = `Контекст профілю: компанія="${ctx.companyName ?? "?"}", галузь="${ctx.industry ?? "?"}", місто="${ctx.city ?? "?"}", регіон="${ctx.region ?? "?"}".`;

  let reply: string;

  if (isStub) {
    const turn = history.length;
    const stubReplies = [
      `Привіт! Я бачу, що ваша компанія — «${ctx.companyName ?? "?"}» у галузі «${ctx.industry ?? "?"}». Розкажіть у 1–2 реченнях, чим саме ви займаєтесь? (ДЕМО — додайте OPENROUTER_API_KEY)`,
      "Дякую! Що у вас зараз у надлишку — вільне обладнання, площі, персонал, клієнтська база чи щось інше?",
      "Зрозуміло. А чого вам зараз найбільше не вистачає для зростання?",
      `Чудово! Збираю ваш профіль.\n\n\`\`\`json
{"businessNiche":"${ctx.industry ?? "Бізнес"}","aboutMe":"${history[1]?.content ?? "Опис компанії"}","interests":["${ctx.industry ?? "виробництво"}","партнерство"],"assets":[{"category":"equipment","title":"Демо актив","description":"${history[3]?.content ?? "У надлишку"}","city":"${ctx.city ?? "Київ"}","region":"${ctx.region ?? "Київська обл."}"}],"deficits":[{"category":"raw_materials","title":"Демо дефіцит","description":"${history[5]?.content ?? "Не вистачає"}","city":"${ctx.city ?? "Київ"}","region":"${ctx.region ?? "Київська обл."}"}]}
\`\`\``,
    ];
    reply = stubReplies[Math.min(turn, stubReplies.length - 1)];
  } else {
    reply = await callOpenRouter(history, userMessage, contextLine);
  }

  const jsonMatch = reply.match(/```json\s*\n([\s\S]+?)\n\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const profile: ExtractedProfile = {
        businessNiche: typeof parsed.businessNiche === "string" ? parsed.businessNiche : undefined,
        aboutMe: typeof parsed.aboutMe === "string" ? parsed.aboutMe : undefined,
        interests: Array.isArray(parsed.interests) ? parsed.interests.filter((s: unknown) => typeof s === "string").slice(0, 10) : undefined,
        fullName: typeof parsed.fullName === "string" ? parsed.fullName : undefined,
        phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
        websiteUrl: typeof parsed.websiteUrl === "string" ? parsed.websiteUrl : undefined,
        city: typeof parsed.city === "string" ? parsed.city : undefined,
        region: typeof parsed.region === "string" ? parsed.region : undefined,
        assets: Array.isArray(parsed.assets) ? parsed.assets : [],
        deficits: Array.isArray(parsed.deficits) ? parsed.deficits : [],
      };
      return { reply, profile };
    } catch { /* malformed — continue */ }
  }

  return { reply };
}

export function mapCategoryLabel(category: ResourceCategory): string {
  const labels: Record<ResourceCategory, string> = {
    equipment: "Обладнання",
    space: "Виробничі площі",
    logistics: "Логістика",
    raw_materials: "Сировина",
    sales_department: "Відділ продажів",
    marketing: "Маркетинг",
    workforce: "Персонал",
  };
  return labels[category];
}
