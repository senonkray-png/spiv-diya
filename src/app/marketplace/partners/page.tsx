import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { UserCard } from "@/components/users/UserCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; role?: string; city?: string }>;
}

export default async function PartnersDirectoryPage({ searchParams }: PageProps) {
  const { q, role, city } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { acceptsPartners: true };
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { businessNiche: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } },
      { interests: { has: q } },
    ];
  }
  if (role && ["member", "provider", "buyer"].includes(role)) where.role = role;
  if (city) where.city = { contains: city, mode: "insensitive" };

  const users = await prisma.user.findMany({
    where,
    take: 60,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      role: true,
      industry: true,
      businessNiche: true,
      city: true,
      avatarUrl: true,
      verified: true,
      interests: true,
      aboutMe: true,
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Каталог партнерів</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Знаходьте підприємства для співпраці, обміну ресурсами та спільних проектів.
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-2" action="/marketplace/partners">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Назва компанії, ніша, тег..."
          className="flex-1 min-w-[200px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm"
        />
        <select
          name="role"
          defaultValue={role ?? ""}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm"
        >
          <option value="">Усі ролі</option>
          <option value="provider">Постачальники</option>
          <option value="buyer">Покупці</option>
          <option value="member">Учасники</option>
        </select>
        <input
          name="city"
          defaultValue={city ?? ""}
          placeholder="Місто"
          className="w-32 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm"
        />
        <Button type="submit">Шукати</Button>
      </form>

      {users.length === 0 ? (
        <EmptyState title="Нічого не знайдено" description="Спробуйте інший запит або фільтр." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
