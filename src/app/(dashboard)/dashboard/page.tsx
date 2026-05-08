import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [user, partnersCount, productCount, serviceCount, unreadMessages, notifications] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        include: { assets: true, deficits: true },
      }),
      prisma.partnership.count({
        where: {
          OR: [
            { initiatorId: session.userId, status: "accepted" },
            { targetId: session.userId, status: "accepted" },
          ],
        },
      }),
      prisma.product.count({ where: { ownerId: session.userId } }),
      prisma.serviceAd.count({ where: { ownerId: session.userId } }),
      prisma.directMessage.count({ where: { receiverId: session.userId, read: false } }),
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const balance = user?.balance ?? 0;
  const onboarding = await prisma.onboardingSession.findUnique({
    where: { userId: session.userId },
  });

  const stats = [
    { label: "Баланс", value: balance, unit: "монет", href: "/dashboard/wallet" },
    { label: "Партнерів", value: partnersCount, unit: "активних", href: "/dashboard/partners" },
    { label: "Товарів", value: productCount, unit: "розміщено", href: "/dashboard/products" },
    { label: "Послуг", value: serviceCount, unit: "оголошень", href: "/dashboard/services" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex items-start gap-4">
        <Avatar src={user?.avatarUrl} name={user?.companyName} size="lg" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
            Вітаємо, {user?.fullName || user?.companyName}!
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {user?.businessNiche || user?.industry} {user?.city ? `· ${user?.city}` : ""}
          </p>
        </div>
      </div>

      {!onboarding?.completed && productCount === 0 && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200">Додайте перший товар</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
              Розмістіть товар або послугу — і ваш профіль з&apos;явиться в каталозі.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/products"
              className="shrink-0 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700"
            >
              + Товар
            </Link>
            <Link
              href="/dashboard/import"
              className="shrink-0 bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium px-4 py-2 rounded-xl"
            >
              Імпорт із сайту
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card padding="sm" className="hover:border-blue-300 transition-colors">
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">{stat.unit}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3">
        Швидкі дії
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {[
          { href: "/marketplace/partners", title: "Знайти партнерів", desc: "Каталог підприємств" },
          { href: "/marketplace/products", title: "Купити товар", desc: "Усі товари маркетплейса" },
          { href: "/dashboard/messages", title: "Чати", desc: unreadMessages > 0 ? `${unreadMessages} нових повідомлень` : "Активні діалоги" },
          { href: "/dashboard/wallet", title: "Поповнити гаманець", desc: "Крипта, Mono або переказ" },
          { href: "/dashboard/services", title: "Опублікувати запит", desc: "Шукаю послугу/виконавця" },
          { href: "/dashboard/profile", title: "Налаштувати профіль", desc: "Сайт, контакти, опис" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <p className="font-semibold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors text-sm">
              {action.title} →
            </p>
            <p className="text-xs text-zinc-500 mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>

      {notifications.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">Останні події</h2>
          <Card padding="sm">
            <div className="space-y-1">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  className={`flex items-start justify-between gap-3 py-2 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                    !n.read ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-zinc-500 truncate">{n.body}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString("uk-UA", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  {!n.read && <Badge variant="blue" size="xs">нове</Badge>}
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
