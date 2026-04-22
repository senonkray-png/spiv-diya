import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";

const categoryLabels: Record<string, string> = {
  equipment: "Обладнання",
  space: "Виробничі площі",
  logistics: "Логістика",
  raw_materials: "Сировина",
  sales_department: "Відділ продажів",
  marketing: "Маркетинг",
  workforce: "Персонал",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { assets: true, deficits: true },
  });

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Профіль</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">Ваші дані та ресурси</p>
      </div>

      <Card className="mb-4" padding="sm">
        <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">Інформація про компанію</h2>
        <dl className="space-y-2">
          {[
            { label: "Назва", value: user.companyName },
            { label: "Email", value: user.email },
            { label: "Галузь", value: user.industry },
            { label: "Місто", value: user.city },
            { label: "Регіон", value: user.region },
            { label: "Баланс", value: `${user.balance} СпівМонет` },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-3">
              <dt className="w-24 shrink-0 text-xs text-zinc-500 pt-0.5">{label}</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="sm">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">
            Активи ({user.assets.length})
          </h2>
          {user.assets.length === 0 && (
            <p className="text-xs text-zinc-400">Не заповнено. Пройдіть онбординг.</p>
          )}
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {user.assets.map((a: any) => (
              <div key={a.id} className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{categoryLabels[a.category]} · {a.city}</p>
                {a.description && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{a.description}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="sm">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">
            Дефіцити ({user.deficits.length})
          </h2>
          {user.deficits.length === 0 && (
            <p className="text-xs text-zinc-400">Не заповнено. Пройдіть онбординг.</p>
          )}
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {user.deficits.map((d: any) => (
              <div key={d.id} className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{d.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{categoryLabels[d.category]} · {d.city}</p>
                {d.description && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{d.description}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
