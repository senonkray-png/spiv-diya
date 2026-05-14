import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProductCard } from "@/components/market/ProductCard";
import { ProductActions } from "@/components/market/ProductActions";
import { ProductGallery } from "@/components/market/ProductGallery";
import { AddToCartButton } from "@/components/market/AddToCartButton";
import { ProductVoteBlock } from "@/components/market/ProductVoteBlock";
import { ProductCommentsSection, type CommentRow } from "@/components/market/ProductCommentsSection";
import { getSession } from "@/lib/session";
import { appendUserBrowseCategory } from "@/lib/marketplace-personalization";
import { effectivePriceUah, syncPriceTokensFromUah } from "@/lib/pricing";

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
          bannerUrl: true,
        },
      },
    },
  });

  if (!product || product.status === "removed") notFound();
  const isOwner = session?.userId === product.ownerId;
  if (product.status !== "active" && !isOwner) notFound();

  const [more, comments, myVoteRow] = await Promise.all([
    prisma.product.findMany({
      where: { ownerId: product.ownerId, status: "active", NOT: { id } },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, companyName: true, avatarUrl: true, verified: true } },
      },
    }),
    prisma.productComment.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: { select: { id: true, companyName: true, avatarUrl: true } },
      },
    }),
    session
      ? prisma.productVote.findUnique({
          where: { productId_userId: { productId: id, userId: session.userId } },
          select: { value: true },
        })
      : Promise.resolve(null),
  ]);

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

  const commentRows: CommentRow[] = comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  }));

  const myVote = myVoteRow?.value === "up" || myVoteRow?.value === "down" ? myVoteRow.value : null;

  const effUah =
    product.priceUAH != null ? effectivePriceUah(product.priceUAH, product.discountPercent) : null;
  const payTokens =
    product.priceUAH != null ? syncPriceTokensFromUah(product.priceUAH, product.discountPercent) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <Link href="/marketplace/products" className="text-sm text-primary hover:underline">
        ← До каталогу
      </Link>

      {product.owner.bannerUrl && (
        <Link
          href={`/u/${product.owner.id}`}
          className="mt-4 block overflow-hidden rounded-2xl border border-border shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.owner.bannerUrl}
            alt=""
            className="h-32 w-full object-cover md:h-40"
          />
          <div className="flex items-center justify-between gap-2 bg-card/95 px-4 py-3 backdrop-blur-sm">
            <span className="text-sm font-semibold text-foreground">Профіль продавця</span>
            <span className="text-sm text-primary">Перейти →</span>
          </div>
        </Link>
      )}

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <ProductGallery photos={product.photos} alt={product.title} />

        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{product.title}</h1>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            {product.priceUAH != null ? (
              <>
                {product.discountPercent > 0 && (
                  <span className="text-lg text-muted-foreground line-through">
                    {product.priceUAH.toLocaleString("uk-UA")} ₴
                  </span>
                )}
                <span className="text-3xl font-bold text-foreground">
                  {effUah != null ? effUah.toLocaleString("uk-UA") : "—"} ₴
                </span>
                {product.discountPercent > 0 && (
                  <Badge variant="amber" size="xs">
                    −{product.discountPercent}%
                  </Badge>
                )}
                {payTokens != null && (
                  <span className="text-sm text-muted-foreground">
                    ≈ {payTokens} СпівМонет
                  </span>
                )}
              </>
            ) : product.priceTokens > 0 ? (
              <span className="text-3xl font-bold text-foreground">
                {product.priceTokens}{" "}
                <span className="text-base font-medium text-muted-foreground">монет</span>
              </span>
            ) : (
              <span className="text-xl font-medium text-muted-foreground">Договірна</span>
            )}
            {product.category && <Badge variant="neutral">{product.category}</Badge>}
            {product.city && <span className="text-sm text-muted-foreground">{product.city}</span>}
          </div>

          {(product.dimensionsText || product.stockQuantity != null) && (
            <dl className="mt-4 grid gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              {product.dimensionsText && (
                <div>
                  <dt className="font-medium text-muted-foreground">Розміри</dt>
                  <dd className="text-foreground">{product.dimensionsText}</dd>
                </div>
              )}
              {product.stockQuantity != null && (
                <div>
                  <dt className="font-medium text-muted-foreground">На складі</dt>
                  <dd className="text-foreground">{product.stockQuantity} шт.</dd>
                </div>
              )}
            </dl>
          )}

          <p className="mt-5 whitespace-pre-wrap leading-relaxed text-muted-foreground">{product.description}</p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Avatar src={product.owner.avatarUrl} name={product.owner.companyName} size="md" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${product.owner.id}`}
                  className="truncate font-semibold text-foreground hover:text-primary"
                >
                  {product.owner.companyName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{product.owner.businessNiche || ""}</p>
              </div>
              {product.owner.verified && (
                <Badge variant="green" size="xs">
                  Перевірено
                </Badge>
              )}
            </div>
          </div>

          {!isOwner && product.status === "active" && (
            <div className="mt-4">
              <AddToCartButton
                productId={product.id}
                maxQty={product.stockQuantity}
                isLogged={!!session}
              />
            </div>
          )}

          <ProductVoteBlock
            productId={product.id}
            initialUp={product.likeCount}
            initialDown={product.dislikeCount}
            initialMy={myVote}
            isLogged={!!session}
          />

          <ProductActions
            productId={product.id}
            ownerId={product.owner.id}
            ownerName={product.owner.companyName}
            isLogged={!!session}
            isOwner={isOwner}
            isFav={isFav}
          />

          {product.sourceUrl && (
            <p className="mt-3 text-xs text-muted-foreground">
              Імпорт із{" "}
              <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                {new URL(product.sourceUrl).hostname}
              </a>
            </p>
          )}
        </div>
      </div>

      <ProductCommentsSection
        productId={product.id}
        initial={commentRows}
        isLogged={!!session}
      />

      {more.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-foreground">Ще від {product.owner.companyName}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {more.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
