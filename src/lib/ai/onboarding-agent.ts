import type { Resource, ResourceCategory } from "@/types";

const SYSTEM_PROMPT = `Ти — ШІ-агент платформи «СпівДія». Твоя задача — провести коротке інтерв'ю з представником підприємства та зібрати інформацію про:
1. Активи компанії (вільне обладнання, площі, транспорт, відділи продажів/маркетингу, сировина)
2. Дефіцити компанії (що потрібно для зростання)

Задавай питання по одному. Будь конкретним і дружнім. Коли зберіть достатньо інформації (мінімум 1 актив і 1 дефіцит), поверни структурований JSON у кінці відповіді у такому форматі:

\`\`\`json
{"assets":[{"category":"equipment|space|logistics|raw_materials|sales_department|marketing|workforce","title":"...","description":"...","city":"...","region":"..."}],"deficits":[...]}
\`\`\``;

export interface OnboardingMessage {
  role: "user" | "assistant";
  content: string;
}

async function callOpenRouter(
  history: OnboardingMessage[],
  userMessage: string
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
        { role: "system", content: SYSTEM_PROMPT },
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

export async function chat(
  history: OnboardingMessage[],
  userMessage: string
): Promise<{ reply: string; profile?: { assets: Partial<Resource>[]; deficits: Partial<Resource>[] } }> {
  const isStub = !process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.startsWith("stub_");

  let reply: string;

  if (isStub) {
    const turn = history.length;
    const stubReplies = [
      "Привіт! Розкажіть, будь ласка, яке обладнання або ресурси є у вашій компанії? (ДЕМО-РЕЖИМ — додайте OPENROUTER_API_KEY)",
      "Добре! А що саме вашій компанії зараз найбільше потрібно для розвитку?",
      "Зрозуміло. Вкажіть, будь ласка, ваше місто та регіон.",
      `Дякую! Профіль зібрано (демо).
\`\`\`json
{"assets":[{"category":"equipment","title":"Демо обладнання","description":"${history[1]?.content ?? 'Наявне обладнання'}","city":"Київ","region":"Київська обл."}],"deficits":[{"category":"raw_materials","title":"Демо дефіцит","description":"${history[3]?.content ?? 'Потрібні матеріали'}","city":"Київ","region":"Київська обл."}]}
\`\`\``,
    ];
    reply = stubReplies[Math.min(turn, stubReplies.length - 1)];
  } else {
    reply = await callOpenRouter(history, userMessage);
  }

  const jsonMatch = reply.match(/```json\n([\s\S]+?)\n```/);
  if (jsonMatch) {
    try {
      const profile = JSON.parse(jsonMatch[1]);
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
