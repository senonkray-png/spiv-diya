import Link from "next/link";
import { prisma } from "@/lib/db";
import { ServiceCard } from "@/components/market/ServiceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string; category?: string }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const { q, type, category } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: "active" };
  if (type === "offer" || type === "request") where.type = type;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const services = await prisma.serviceAd.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true, city: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Послуги</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {services.length} оголошень — пропозиції та запити
          </p>
        </div>
        <Link
          href="/dashboard/services"
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          + Розмістити послугу
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap gap-2" action="/marketplace/services">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Пошук послуг..."
          className="flex-1 min-w-[200px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm"
        />
        <select
          name="type"
          defaultValue={type ?? ""}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm"
        >
          <option value="">Усі</option>
          <option value="offer">Пропозиції</option>
          <option value="request">Запити</option>
        </select>
        <Button type="submit">Шукати</Button>
      </form>

      {services.length === 0 ? (
        <EmptyState
          title="Нічого не знайдено"
          description="Спробуйте інший запит або станьте першим, хто розмістить послугу."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}
