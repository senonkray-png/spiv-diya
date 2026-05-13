import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      companyName: true,
      role: true,
      subscriptionPlan: true,
    },
  });
  if (!user) redirect("/login");

  // Якщо користувач уже не в цьому онбордингу — на маркетплейс
  if (user.role === "admin") redirect("/marketplace");
  if (user.subscriptionPlan !== "free") redirect("/marketplace");
  // If user already chose buyer/provider/entrepreneur but not paid, allow re-pick
  if (user.role === "buyer") redirect("/marketplace");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-zinc-900 dark:text-white">
            Вітаємо, {user.companyName}!
          </h1>
          <p className="text-zinc-500 mt-2 max-w-2xl mx-auto">
            Оберіть, як ви плануєте користуватись СпівДією. Можна змінити будь-коли в налаштуваннях.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RoleCard
            badge="Безкоштовно"
            title="Покупець"
            tag="Шукаю товари та послуги"
            features={[
              "Внутрішній гаманець для зручних покупок",
              "Чат із продавцями та підприємцями",
              "Обране — слідкуйте за улюбленими брендами",
              "Стрічка свіжих товарів від обраних",
            ]}
            href="/api/welcome/choose?role=buyer"
            cta="Почати як покупець"
          />

          <RoleCard
            badge="1 000 ₴ / міс"
            title="Продавець"
            tag="Розміщую товари та послуги"
            highlight
            features={[
              "Гарно оформлений профіль на маркетплейсі",
              "Розміщення товарів і послуг без обмежень",
              "Аналітика: перегляди профілю, товарів, конверсії",
              "Усе з ролі покупця",
            ]}
            href="/checkout?plan=provider"
            cta="Стати продавцем"
          />

          <RoleCard
            badge="3 000 ₴ / міс"
            title="Підприємець"
            tag="Шукаю партнерів і масштабую бізнес"
            features={[
              "ШІ-агент для глибокого онбордингу",
              "Авто-підбір партнерів і оптових продавців",
              "Сторінка з постами/рекламою на маркетплейсі",
              "Імпорт товарів зі свого сайту в 2 кліки",
              "Усе з ролей покупця і продавця",
            ]}
            href="/checkout?plan=entrepreneur"
            cta="Стати підприємцем"
          />
        </div>

        <div className="mt-8 text-center">
          <Link href="/marketplace" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            Пропустити поки що
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  badge,
  title,
  tag,
  features,
  href,
  cta,
  highlight,
}: {
  badge: string;
  title: string;
  tag: string;
  features: string[];
  href: string;
  cta: string;
  highlight?: boolean;
}) {
  return (
    <Card padding="md" className={highlight ? "border-blue-400 shadow-lg ring-1 ring-blue-200 dark:ring-blue-900" : ""}>
      <div className="flex items-center justify-between mb-3">
        <Badge variant={highlight ? "blue" : "neutral"}>{badge}</Badge>
        {highlight && <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600">Популярне</span>}
      </div>
      <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>
      <p className="text-xs text-zinc-500 mt-0.5">{tag}</p>

      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link href={href} className="block mt-5">
        <Button className="w-full" size="lg" variant={highlight ? "primary" : "secondary"}>
          {cta}
        </Button>
      </Link>
    </Card>
  );
}
