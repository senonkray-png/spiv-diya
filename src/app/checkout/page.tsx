import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_PRICES, type SubscriptionPlan } from "@/types";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { plan } = await searchParams;
  if (plan !== "provider" && plan !== "entrepreneur") {
    redirect("/welcome");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      balance: true,
      subscriptionPlan: true,
      companyName: true,
      emailVerified: true,
    },
  });
  if (!user) redirect("/login");
  if (!user.emailVerified) {
    redirect(`/register/pending?email=${encodeURIComponent(user.email)}`);
  }

  const planKey = plan as Exclude<SubscriptionPlan, "free">;
  const price = PLAN_PRICES[planKey];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/welcome" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
          ← Назад до вибору ролі
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mt-3">
          Активація плану &quot;{planKey === "provider" ? "Продавець" : "Підприємець"}&quot;
        </h1>
        <p className="text-zinc-500 mt-1">Оплата на 1 місяць. Можна продовжити згодом.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card padding="md">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Що ви отримаєте</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {(planKey === "provider"
                ? [
                    "Розміщення товарів і послуг без обмежень",
                    "Гарно оформлений профіль на маркетплейсі",
                    "Аналітика: перегляди, лайки, рейтинг",
                    "Внутрішній чат із покупцями",
                  ]
                : [
                    "Все, що в плані «Продавець»",
                    "ШІ-агент для глибокого онбордингу",
                    "Авто-підбір партнерів і оптових продавців",
                    "Сторінка з постами/рекламою на маркетплейсі",
                    "Імпорт товарів зі свого сайту в 2 кліки",
                  ]
              ).map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Сума</h2>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">
              {price.uah} <span className="text-sm font-normal text-zinc-500">грн / міс</span>
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              або <b>{price.tokens}</b> СпівМонет <span className="text-zinc-400">(1 ₴ = 1 монета)</span>
            </p>

            <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-500">
              Ваш поточний баланс: <b className="text-zinc-900 dark:text-white">{user.balance}</b> монет
            </div>
          </Card>
        </div>

        <CheckoutForm plan={planKey} priceUAH={price.uah} priceTokens={price.tokens} balance={user.balance} />
      </div>
    </div>
  );
}
