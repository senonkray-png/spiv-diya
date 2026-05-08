import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { mapCategoryLabel } from "@/lib/ai/onboarding-agent";
import type { ResourceCategory } from "@/types";
import { RefreshButton } from "@/components/opportunities/RefreshButton";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const session = await getSession();
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, assets: { select: { id: true } }, deficits: { select: { id: true } } },
  });
  if (!me) return null;

  // Mark match notifications as read upon viewing the page
  await prisma.notification.updateMany({
    where: { userId: session.userId, entityType: "match", read: false },
    data: { read: true },
  });

  const myAssetIds = new Set(me.assets.map((r) => r.id));
  const myDeficitIds = new Set(me.deficits.map((r) => r.id));

  const matches = await prisma.match.findMany({
    where: { initiatorId: session.userId },
    include: {
      asset: true,
      deficit: true,
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  // Pull counterpart info in one query
  const counterpartIds = Array.from(new Set(matches.map((m) => m.counterpartId)));
  const counterparts = await prisma.user.findMany({
    where: { id: { in: counterpartIds } },
    select: {
      id: true,
      companyName: true,
      city: true,
      region: true,
      industry: true,
      businessNiche: true,
      avatarUrl: true,
    },
  });
  const cpMap = new Map(counterparts.map((u) => [u.id, u]));

  // Has the user passed onboarding / has any resources?
  const totalResources = me.assets.length + me.deficits.length;

  const items = matches
    .map((m) => {
      // Determine direction:
      // - "i_supply" — my asset covers their deficit
      // - "they_supply" — their asset covers my deficit
      const myAssetMatchesTheir = myAssetIds.has(m.assetId) && !myDeficitIds.has(m.deficitId);
      const theirAssetMatchesMine = !myAssetIds.has(m.assetId) && myDeficitIds.has(m.deficitId);

      let direction: "i_supply" | "they_supply" | "ambiguous" = "ambiguous";
      if (myAssetMatchesTheir) direction = "i_supply";
      else if (theirAssetMatchesMine) direction = "they_supply";

      return { match: m, direction, partner: cpMap.get(m.counterpartId) };
    })
    .filter((x) => !!x.partner);

  const directIncoming = items.filter((x) => x.direction === "they_supply");
  const directOutgoing = items.filter((x) => x.direction === "i_supply");

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Можливі партнери"
        description="ШІ-агент знаходить компанії, які мають те, чого вам не вистачає, або шукають те, що у вас в надлишку."
        actions={<RefreshButton />}
      />

      {totalResources === 0 ? (
        <EmptyState
          title="Спочатку розкажіть про свій бізнес"
          description="Пройдіть коротке інтерв'ю з ШІ-агентом — він підбере партнерів автоматично."
          action={
            <Link href="/onboarding">
              <Button>Почати інтерв&apos;ю</Button>
            </Link>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Поки що збігів немає"
          description="Як тільки на платформі з'явиться компанія, що шукає ваш ресурс або має те, чого вам не вистачає — ви побачите її тут і отримаєте сповіщення."
          action={<RefreshButton />}
        />
      ) : (
        <div className="space-y-8">
          {directIncoming.length > 0 && (
            <Section
              title="Партнери, які можуть закрити ваш дефіцит"
              accent="blue"
              items={directIncoming}
            />
          )}
          {directOutgoing.length > 0 && (
            <Section
              title="Партнери, яким потрібен ваш ресурс"
              accent="emerald"
              items={directOutgoing}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface Item {
  match: {
    id: string;
    score: number;
    asset: { id: string; title: string; category: string; city: string };
    deficit: { id: string; title: string; category: string; city: string };
  };
  direction: "i_supply" | "they_supply" | "ambiguous";
  partner: {
    id: string;
    companyName: string;
    city: string;
    region: string;
    industry: string;
    businessNiche: string | null;
    avatarUrl: string | null;
  } | undefined;
}

function Section({
  title,
  items,
  accent,
}: {
  title: string;
  items: Item[];
  accent: "blue" | "emerald";
}) {
  const accentBg = accent === "blue" ? "bg-blue-50 dark:bg-blue-950/30" : "bg-emerald-50 dark:bg-emerald-950/30";
  const accentText = accent === "blue" ? "text-blue-700 dark:text-blue-300" : "text-emerald-700 dark:text-emerald-300";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1 h-5 rounded-full ${accent === "blue" ? "bg-blue-500" : "bg-emerald-500"}`} />
        <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
        <span className="text-xs text-zinc-500">· {items.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(({ match, direction, partner }) => {
          if (!partner) return null;
          const supplierTitle = direction === "i_supply" ? "Ваш ресурс" : `Пропонує: ${partner.companyName}`;
          const seekerTitle = direction === "i_supply" ? `Потрібно: ${partner.companyName}` : "Ваша потреба";
          return (
            <Card key={match.id} padding="md" className="hover:border-blue-400 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <Avatar src={partner.avatarUrl} name={partner.companyName} size="md" />
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${partner.id}`} className="font-semibold text-zinc-900 dark:text-white hover:text-blue-600 transition-colors block truncate">
                    {partner.companyName}
                  </Link>
                  <p className="text-xs text-zinc-500 truncate">
                    {partner.businessNiche ?? partner.industry} · {partner.city}
                  </p>
                </div>
                <Badge variant={match.score >= 90 ? "green" : "neutral"}>{match.score}</Badge>
              </div>

              <div className="space-y-2">
                <div className={`rounded-xl p-3 ${accentBg}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${accentText} mb-1`}>{supplierTitle}</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{match.asset.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{mapCategoryLabel(match.asset.category as ResourceCategory)} · {match.asset.city}</p>
                </div>
                <div className="rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">{seekerTitle}</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{match.deficit.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{mapCategoryLabel(match.deficit.category as ResourceCategory)} · {match.deficit.city}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  href={`/dashboard/messages?to=${partner.id}`}
                  className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                >
                  Написати
                </Link>
                <Link
                  href={`/dashboard/partners/new?to=${partner.id}`}
                  className="flex-1 text-center border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                >
                  Запросити в партнери
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
