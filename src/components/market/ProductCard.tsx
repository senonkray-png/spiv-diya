import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { effectivePriceUah } from "@/lib/pricing";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string;
    priceTokens: number;
    priceUAH: number | null;
    discountPercent?: number;
    currency: string;
    photos: string[];
    city: string | null;
    category: string | null;
    catalogCategory?: string | null;
    isPromotional?: boolean;
    status: string;
    owner: {
      id: string;
      companyName: string;
      avatarUrl: string | null;
      verified: boolean;
    };
  };
  href?: string;
}

export function ProductCard({ product, href }: ProductCardProps) {
  const link = href ?? `/marketplace/products/${product.id}`;
  const cover = product.photos?.[0];

  return (
    <Link
      href={link}
      className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all flex flex-col"
    >
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {product.isPromotional && product.status === "active" && (
          <div className="absolute top-2 left-2">
            <Badge variant="red" size="xs">
              Акція
            </Badge>
          </div>
        )}
        {(product.discountPercent ?? 0) > 0 && product.status === "active" && (
          <div className={`absolute ${product.isPromotional ? "top-10" : "top-2"} left-2`}>
            <Badge variant="amber" size="xs">
              −{product.discountPercent}%
            </Badge>
          </div>
        )}
        {product.status !== "active" && (
          <div className="absolute top-2 right-2">
            <Badge variant={product.status === "removed" ? "red" : "amber"}>
              {product.status === "removed" ? "Знято" : "Пауза"}
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.title}
        </h3>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          {product.priceUAH != null ? (
            <>
              {(product.discountPercent ?? 0) > 0 && (
                <span className="text-sm text-zinc-400 line-through">
                  {product.priceUAH.toLocaleString("uk-UA")} ₴
                </span>
              )}
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                {effectivePriceUah(product.priceUAH, product.discountPercent ?? 0).toLocaleString("uk-UA")} ₴
              </span>
            </>
          ) : product.priceTokens > 0 ? (
            <span className="text-base font-bold text-zinc-900 dark:text-white">
              {product.priceTokens} <span className="text-xs text-zinc-500">монет</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-zinc-500">Договірна</span>
          )}
        </div>
        <div className="mt-auto pt-3 flex items-center gap-2">
          <Avatar src={product.owner.avatarUrl} name={product.owner.companyName} size="xs" />
          <span className="text-xs text-zinc-500 truncate flex-1">{product.owner.companyName}</span>
          {product.city && <span className="text-[10px] text-zinc-400">{product.city}</span>}
        </div>
      </div>
    </Link>
  );
}
