import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function PostsFeedPage() {
  const posts = await prisma.post.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      author: {
        select: { id: true, companyName: true, avatarUrl: true, businessNiche: true, ratingScore: true, role: true },
      },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
        Стрічка ідей та реклами
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        Свіжі пости від підприємців на платформі. Підпишіться (додайте в обране), щоб бачити нові пости одразу в кабінеті.
      </p>

      <div className="mt-5 space-y-3">
        {posts.length === 0 && (
          <div className="text-center py-12 text-sm text-zinc-500">Поки що немає постів</div>
        )}
        {posts.map((p) => (
          <Card key={p.id} padding="md">
            <div className="flex items-center gap-3 mb-2">
              <Avatar src={p.author.avatarUrl} name={p.author.companyName} size="sm" />
              <div className="flex-1 min-w-0">
                <Link href={`/u/${p.author.id}`} className="font-semibold text-zinc-900 dark:text-white hover:text-blue-600 truncate block">
                  {p.author.companyName}
                </Link>
                <p className="text-xs text-zinc-500 truncate">
                  {p.author.businessNiche ?? "Підприємець"} · {new Date(p.createdAt).toLocaleString("uk-UA")}
                </p>
              </div>
              {p.author.ratingScore !== 0 && (
                <Badge variant={p.author.ratingScore >= 0 ? "green" : "red"}>
                  {p.author.ratingScore > 0 ? `+${p.author.ratingScore}` : p.author.ratingScore}
                </Badge>
              )}
            </div>
            <Link href={`/marketplace/posts/${p.id}`}>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base md:text-lg hover:text-blue-600 transition-colors">
                {p.title}
              </h2>
            </Link>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 whitespace-pre-wrap line-clamp-4">
              {p.body}
            </p>
            {p.images.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {p.images.slice(0, 3).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="h-32 w-32 object-cover rounded-xl flex-shrink-0" />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
