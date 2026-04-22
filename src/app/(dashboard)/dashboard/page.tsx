import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [user, matchCount, dealCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      include: { assets: true, deficits: true },
    }),
    prisma.match.count({ where: { initiatorId: session.userId } }),
    prisma.dealParty.count({ where: { userId: session.userId } }),
  ]);

  const assetCount = user?.assets.length ?? 0;
  const deficitCount = user?.deficits.length ?? 0;
  const balance = user?.balance ?? 0;

  const onboarding = await prisma.onboardingSession.findUnique({
    where: { userId: session.userId },
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
          Вітаємо, {session.companyName}!
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">Ось стан вашого акаунту</p>
      </div>

      {!onboarding?.completed && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200">Заповніть профіль</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
              ШІ-агент допоможе описати активи та дефіцити
            </p>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 self-start sm:self-auto bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Пройти онбординг →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "СпівМонети", value: balance, unit: "монет" },
          { label: "Активи", value: assetCount, unit: "ресурсів" },
          { label: "Дефіцити", value: deficitCount, unit: "потреб" },
          { label: "Угоди", value: dealCount, unit: "всього" },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{stat.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{stat.unit}</p>
          </Card>
        ))}
      </div>

      <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3">Швидкі дії</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/dashboard/matches", title: "Знайти партнерів", desc: "Перегляньте запропоновані метчі" },
          { href: "/dashboard/wallet", title: "Поповнити гаманець", desc: "Крипта, Monobank або P2P" },
          { href: "/dashboard/deals", title: "Мої угоди", desc: "Активні переговори" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
          >
            <p className="font-semibold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors text-sm md:text-base">
              {action.title} →
            </p>
            <p className="text-xs md:text-sm text-zinc-500 mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
