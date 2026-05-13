import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProductCard } from "@/components/market/ProductCard";
import { ProductActions } from "@/components/market/ProductActions";
import { getSession } from "@/lib/session";
import { appendUserBrowseCategory } from "@/lib/marketplace-personalization";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          companyName: true,
          city: true,
          region: true,
          avatarUrl: true,
          verified: true,
          phone: true,
          websiteUrl: true,
          businessNiche: true,
        },
      },
    },
  });

  if (!product || product.status === "removed") notFound();

  const more = await prisma.product.findMany({
    where: { ownerId: product.ownerId, status: "active", NOT: { id } },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
    },
  });

  // Increment views (best-effort)
  await prisma.product.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});

  if (session) {
    await appendUserBrowseCategory(session.userId, product.catalogCategory ?? null).catch(() => {});
  }

  let isFav = false;
  if (session) {
    const fav = await prisma.favorite.findFirst({
      where: { ownerId: session.userId, productId: id },
    });
    isFav = !!fav;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <Link href="/marketplace/products" className="text-sm text-blue-600 hover:underline">
        ← До каталогу
      </Link>

      <div className="mt-4 grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
          {product.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.photos[0]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-zinc-400">Без фото</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
            {product.title}
          </h1>
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            {product.priceUAH != null ? (
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                {product.priceUAH.toLocaleString("uk-UA")} ₴
              </span>
            ) : product.priceTokens > 0 ? (
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                {product.priceTokens} <span className="text-base font-medium text-zinc-500">монет</span>
              </span>
            ) : (
              <span className="text-xl font-medium text-zinc-500">Договірна</span>
            )}
            {product.category && <Badge variant="neutral">{product.category}</Badge>}
            {product.city && <span className="text-sm text-zinc-500">{product.city}</span>}
          </div>

          <p className="mt-5 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {product.description}
          </p>

          <div className="mt-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 flex items-center gap-3">
            <Avatar src={product.owner.avatarUrl} name={product.owner.companyName} size="md" />
            <div className="flex-1 min-w-0">
              <Link
                href={`/u/${product.owner.id}`}
                className="font-semibold text-zinc-900 dark:text-white truncate hover:text-blue-600"
              >
                {product.owner.companyName}
              </Link>
              <p className="text-xs text-zinc-500 truncate">{product.owner.businessNiche || ""}</p>
            </div>
            {product.owner.verified && <Badge variant="green" size="xs">Перевірено</Badge>}
          </div>

          <ProductActions
            productId={product.id}
            ownerId={product.owner.id}
            ownerName={product.owner.companyName}
            isLogged={!!session}
            isOwner={session?.userId === product.owner.id}
            isFav={isFav}
          />

          {product.sourceUrl && (
            <p className="mt-3 text-xs text-zinc-400">
              Імпорт із{" "}
              <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                {new URL(product.sourceUrl).hostname}
              </a>
            </p>
          )}
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
            Ще від {product.owner.companyName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {more.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
