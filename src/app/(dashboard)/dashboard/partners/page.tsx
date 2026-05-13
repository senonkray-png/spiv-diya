import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartnerActions } from "@/components/partners/PartnerActions";

export default async function PartnersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = session.userId;
  const [incoming, outgoing] = await Promise.all([
    prisma.partnership.findMany({
      where: { targetId: me },
      orderBy: { createdAt: "desc" },
      include: {
        initiator: {
          select: {
            id: true, companyName: true, avatarUrl: true, businessNiche: true, city: true, verified: true,
          },
        },
      },
    }),
    prisma.partnership.findMany({
      where: { initiatorId: me },
      orderBy: { createdAt: "desc" },
      include: {
        target: {
          select: {
            id: true, companyName: true, avatarUrl: true, businessNiche: true, city: true, verified: true,
          },
        },
      },
    }),
  ]);

  const accepted = [
    ...incoming.filter((p) => p.status === "accepted").map((p) => ({ ...p.initiator, partnershipId: p.id })),
    ...outgoing.filter((p) => p.status === "accepted").map((p) => ({ ...p.target, partnershipId: p.id })),
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <PageHeader
        title="Партнерства"
        description="Запити на співпрацю та підтверджені партнери."
        actions={
          <Link
            href="/marketplace/partners"
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            Знайти партнерів
          </Link>
        }
      />

      <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
        Вхідні запити ({incoming.filter((i) => i.status === "pending").length})
      </h2>
      <div className="space-y-2 mb-8">
        {incoming.filter((i) => i.status === "pending").length === 0 ? (
          <EmptyState title="Поки немає запитів" description="Як тільки хтось захоче співпрацювати — побачите тут." />
        ) : (
          incoming
            .filter((i) => i.status === "pending")
            .map((p) => (
              <Card key={p.id} padding="sm">
                <div className="flex items-center gap-3">
                  <Avatar src={p.initiator.avatarUrl} name={p.initiator.companyName} size="md" />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/u/${p.initiator.id}`}
                      className="font-semibold text-sm text-zinc-900 dark:text-white truncate hover:text-blue-600"
                    >
                      {p.initiator.companyName}
                    </Link>
                    <p className="text-xs text-zinc-500 truncate">
                      {p.initiator.businessNiche || ""} · {p.initiator.city || ""}
                    </p>
                    {p.message && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                        «{p.message}»
                      </p>
                    )}
                  </div>
                  <PartnerActions id={p.id} kind="incoming" />
                </div>
              </Card>
            ))
        )}
      </div>

      <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
        Підтверджені партнери ({accepted.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {accepted.length === 0 && (
          <EmptyState title="Ще немає підтверджених партнерств" description="Знайдіть партнерів у каталозі та надішліть запит." />
        )}
        {accepted.map((u) => (
          <Card key={u.partnershipId} padding="sm">
            <div className="flex items-center gap-3">
              <Avatar src={u.avatarUrl} name={u.companyName} size="md" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/u/${u.id}`}
                  className="font-semibold text-sm text-zinc-900 dark:text-white truncate hover:text-blue-600"
                >
                  {u.companyName}
                </Link>
                <p className="text-xs text-zinc-500 truncate">
                  {u.businessNiche || ""} · {u.city || ""}
                </p>
              </div>
              {u.verified && <Badge variant="green" size="xs">✓</Badge>}
              <Link
                href={`/dashboard/messages?user=${u.id}`}
                className="text-xs font-medium text-blue-600 hover:underline shrink-0"
              >
                Чат →
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
        Мої вихідні запити ({outgoing.filter((o) => o.status === "pending").length})
      </h2>
      <div className="space-y-2">
        {outgoing.filter((o) => o.status === "pending").length === 0 && (
          <p className="text-sm text-zinc-500">Активних запитів немає.</p>
        )}
        {outgoing
          .filter((o) => o.status === "pending")
          .map((p) => (
            <Card key={p.id} padding="sm">
              <div className="flex items-center gap-3">
                <Avatar src={p.target.avatarUrl} name={p.target.companyName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-900 dark:text-white truncate">
                    {p.target.companyName}
                  </p>
                  <p className="text-xs text-zinc-500">Очікує підтвердження</p>
                </div>
                <Badge variant="amber" size="xs">очікує</Badge>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
