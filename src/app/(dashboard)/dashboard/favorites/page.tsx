import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductCard } from "@/components/market/ProductCard";
import { ServiceCard } from "@/components/market/ServiceCard";
import { UserCard } from "@/components/users/UserCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function FavoritesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const favs = await prisma.favorite.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true, companyName: true, industry: true, businessNiche: true, city: true,
          avatarUrl: true, verified: true, interests: true, role: true, aboutMe: true,
        },
      },
      product: {
        include: {
          owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
        },
      },
      service: {
        include: {
          owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true, city: true } },
        },
      },
    },
  });

  const users = favs.filter((f) => f.user).map((f) => f.user!);
  const products = favs.filter((f) => f.product).map((f) => f.product!);
  const services = favs.filter((f) => f.service).map((f) => f.service!);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader
        title="Обране"
        description="Цікаві товари, послуги та підприємства, які ви зберегли."
      />

      {favs.length === 0 ? (
        <EmptyState
          title="Ще нічого не збережено"
          description="Натискайте на ♡ біля цікавих компаній і товарів, щоб не загубити їх."
          action={
            <Link
              href="/marketplace"
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700"
            >
              До маркетплейсу
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {users.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
                Підприємства ({users.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
                Товари ({products.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {services.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
                Послуги ({services.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
