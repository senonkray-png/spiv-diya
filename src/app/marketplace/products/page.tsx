import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/market/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { MARKETPLACE_CATALOG } from "@/lib/marketplace-taxonomy";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; catalogCategory?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { q, category, catalogCategory } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: "active" };
  if (category) where.category = category;
  if (catalogCategory) where.catalogCategory = catalogCategory;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      owner: {
        select: { id: true, companyName: true, avatarUrl: true, verified: true },
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Товари</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {products.length} активних оголошень
          </p>
        </div>
        <Link
          href="/dashboard/products"
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          + Розмістити товар
        </Link>
      </div>

      <form className="mb-6 flex gap-2 flex-wrap" action="/marketplace/products">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Пошук товарів..."
          className="flex-1 min-w-[200px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm"
        />
        <select
          name="catalogCategory"
          defaultValue={catalogCategory ?? ""}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm max-w-[200px]"
        >
          <option value="">Каталог маркетплейсу</option>
          {MARKETPLACE_CATALOG.filter((c) => c.slug !== "other").map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.labelUa}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm"
        >
          <option value="">Усі категорії</option>
          <option value="goods">Товари</option>
          <option value="raw_materials">Сировина</option>
          <option value="equipment">Обладнання</option>
          <option value="tech">Електроніка</option>
          <option value="food">Продукти</option>
          <option value="services">Послуги</option>
          <option value="other">Інше</option>
        </select>
        <Button type="submit">Шукати</Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          title="Нічого не знайдено"
          description="Спробуйте змінити запит або стати першим, хто додасть товар цієї категорії."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
