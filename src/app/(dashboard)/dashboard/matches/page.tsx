import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const categoryLabels: Record<string, string> = {
  equipment: "Обладнання",
  space: "Виробничі площі",
  logistics: "Логістика",
  raw_materials: "Сировина",
  sales_department: "Відділ продажів",
  marketing: "Маркетинг",
  workforce: "Персонал",
};

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) return null;

  const matches = await prisma.match.findMany({
    where: { initiatorId: session.userId },
    include: { asset: true, deficit: true },
    orderBy: { score: "desc" },
    take: 20,
  });

  const hasAssets = await prisma.resource.count({ where: { ownerId: session.userId } });

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Метчинг</h1>
          <p className="text-zinc-500 mt-0.5 text-sm">Знайдені партнери для кооперації</p>
        </div>
        <form action="/api/matching/run" method="POST">
          <button type="submit" className="bg-blue-600 text-white text-xs md:text-sm font-medium px-3 md:px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap">
            Оновити
          </button>
        </form>
      </div>

      {hasAssets === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-4 text-sm">Спочатку пройдіть онбординг</p>
          <Link href="/onboarding" className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
            Пройти онбординг
          </Link>
        </div>
      )}

      {hasAssets > 0 && matches.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">Метчів поки немає. Спробуйте оновити.</p>
        </div>
      )}

      <div className="space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {matches.map((match: any) => (
          <Card key={match.id} padding="sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                  match.type === "direct"
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                }`}>
                  {match.type === "direct" ? "Прямий" : "Ланцюжок"}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Ваш актив</p>
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">{match.asset.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{categoryLabels[match.asset.category]} · {match.asset.city}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Їх дефіцит</p>
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">{match.deficit.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{categoryLabels[match.deficit.category]} · {match.deficit.city}</p>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xl font-bold text-blue-600">{match.score}</div>
                <div className="text-xs text-zinc-400">балів</div>
                <Link
                  href={`/dashboard/deals/new?matchId=${match.id}`}
                  className="mt-2 block bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Угода
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
