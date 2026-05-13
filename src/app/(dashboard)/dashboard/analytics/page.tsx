import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Analytics is reserved for paid plans (provider/entrepreneur) and admin
  if (!["provider", "entrepreneur", "admin"].includes(user.role)) {
    redirect("/welcome");
  }

  const [products, services, posts, favoritedBy, partnersCount, recentRatings] = await Promise.all([
    prisma.product.findMany({
      where: { ownerId: user.id },
      orderBy: { views: "desc" },
      select: { id: true, title: true, views: true, status: true, createdAt: true },
    }),
    prisma.serviceAd.findMany({
      where: { ownerId: user.id },
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { views: "desc" },
      select: { id: true, title: true, views: true, likes: true, status: true },
    }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.partnership.count({
      where: {
        OR: [
          { initiatorId: user.id, status: "accepted" },
          { targetId: user.id, status: "accepted" },
        ],
      },
    }),
    prisma.rating.findMany({
      where: { targetUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { voter: { select: { id: true, companyName: true, avatarUrl: true } } },
    }),
  ]);

  const totalProductViews = products.reduce((s, p) => s + p.views, 0);
  const totalPostViews = posts.reduce((s, p) => s + p.views, 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <PageHeader
        title="Аналітика"
        description="Скільки людей бачать ваші товари, послуги, пости та підписані на ваш профіль."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Підписані на вас" value={favoritedBy} hint="користувачів" />
        <Stat label="Партнерів" value={partnersCount} hint="підтверджених" />
        <Stat label="Перегляди товарів" value={totalProductViews} hint={`${products.length} лот.`} />
        <Stat label="Перегляди постів" value={totalPostViews} hint={`${posts.length} постів`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">Топ товарів</h2>
          {products.length === 0 ? (
            <p className="text-sm text-zinc-500">Поки немає товарів</p>
          ) : (
            <ul className="space-y-2">
              {products.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300">{p.title}</span>
                  <Badge variant="blue" size="xs">{p.views} 👁</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">Топ постів</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-zinc-500">Поки немає постів</p>
          ) : (
            <ul className="space-y-2">
              {posts.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300">{p.title}</span>
                  <Badge variant="purple" size="xs">{p.views} 👁</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md" className="md:col-span-2">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">Останні голоси</h2>
          {recentRatings.length === 0 ? (
            <p className="text-sm text-zinc-500">Поки що ніхто не голосував</p>
          ) : (
            <ul className="space-y-2">
              {recentRatings.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                    {r.voter.companyName}
                  </span>
                  <Badge variant={r.value === "up" ? "green" : "red"} size="xs">
                    {r.value === "up" ? "👍" : "👎"}
                  </Badge>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {new Date(r.createdAt).toLocaleDateString("uk-UA")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {services.length > 0 && (
        <Card padding="md" className="mt-4">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">Активні послуги</h2>
          <ul className="space-y-2">
            {services.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-zinc-700 dark:text-zinc-300">{s.title}</span>
                <Badge variant={s.status === "active" ? "green" : "neutral"} size="xs">
                  {s.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card padding="sm">
      <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
      {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
    </Card>
  );
}
