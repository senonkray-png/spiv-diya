import Link from "next/link";
import type { InterestChip } from "@/lib/marketplace-personalization";

export function MarketplaceInterestRow({ chips }: { chips: InterestChip[] }) {
  if (chips.length === 0) return null;

  return (
    <section className="mt-8 md:mt-10">
      <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white mb-4 text-center">
        Тебе зацікавить
      </h2>
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-2 justify-start md:justify-center scrollbar-thin px-1">
        {chips.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            className="flex flex-col items-center shrink-0 w-[72px] md:w-[88px] group"
          >
            <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full border-2 border-violet-200 dark:border-violet-900 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm group-hover:border-violet-500 transition-colors">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-violet-400 text-center p-1 leading-tight">
                  {c.labelUa.slice(0, 12)}
                </div>
              )}
            </div>
            <span className="mt-2 text-[11px] md:text-xs text-center text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-snug max-w-[88px]">
              {c.labelUa}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
