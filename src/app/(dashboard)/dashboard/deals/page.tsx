import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Чернетка", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  negotiating: { label: "Переговори", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  signed: { label: "Підписано", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  completed: { label: "Завершено", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  cancelled: { label: "Скасовано", color: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" },
};

export default async function DealsPage() {
  const session = await getSession();
  if (!session) return null;

  const dealParties = await prisma.dealParty.findMany({
    where: { userId: session.userId },
    include: {
      deal: {
        include: {
          match: { include: { asset: true, deficit: true } },
          parties: { include: { user: true } },
        },
      },
    },
    orderBy: { deal: { createdAt: "desc" } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals = dealParties.map((dp: any) => dp.deal);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Угоди</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">Ваші активні та завершені угоди</p>
      </div>

      {deals.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-4 text-sm">Угод ще немає. Знайдіть партнера у Метчингу.</p>
          <Link href="/dashboard/matches" className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
            До метчингу →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {deals.map((deal: any) => {
          const status = statusLabels[deal.status] ?? statusLabels.draft;
          const partners = deal.parties
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((p: any) => p.userId !== session.userId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => p.user.companyName)
            .join(", ");

          return (
            <Card key={deal.id} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(deal.createdAt).toLocaleDateString("uk-UA")}
                    </span>
                  </div>

                  <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                    {deal.match.asset.title} ↔ {deal.match.deficit.title}
                  </p>

                  {partners && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">Партнер: {partners}</p>
                  )}

                  {deal.terms && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{deal.terms}</p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col gap-1 items-end">
                  <Link href={`/dashboard/deals/${deal.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    →
                  </Link>
                  {deal.pdfUrl && (
                    <a href={deal.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:text-zinc-600">
                      PDF
                    </a>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
