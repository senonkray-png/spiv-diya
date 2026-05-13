import Link from "next/link";
import type { MarketplaceSort } from "@/lib/marketplace-home-products";

const SORTS: { id: MarketplaceSort; label: string }[] = [
  { id: "new", label: "Нові" },
  { id: "expensive", label: "Дорожчі" },
  { id: "cheap", label: "Дешевші" },
  { id: "popular", label: "Популярні" },
  { id: "sale", label: "Акції" },
];

function hrefFor(sort: MarketplaceSort, cat: string | null) {
  const p = new URLSearchParams();
  p.set("sort", sort);
  if (cat) p.set("cat", cat);
  const q = p.toString();
  return q ? `/marketplace?${q}` : "/marketplace";
}

export function MarketplaceSortFilters({
  activeSort,
  catalogCategory,
}: {
  activeSort: MarketplaceSort;
  catalogCategory: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      {SORTS.map((s) => {
        const active = activeSort === s.id;
        return (
          <Link
            key={s.id}
            href={hrefFor(s.id, catalogCategory)}
            className={`rounded-full px-3.5 py-1.5 text-xs md:text-sm font-medium transition-colors ${
              active
                ? "bg-violet-600 text-white shadow"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-violet-100 dark:hover:bg-violet-950/40"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
      {catalogCategory && (
        <Link
          href="/marketplace"
          className="rounded-full px-3 py-1.5 text-xs text-violet-700 dark:text-violet-300 hover:underline"
        >
          Скинути категорію
        </Link>
      )}
    </div>
  );
}
