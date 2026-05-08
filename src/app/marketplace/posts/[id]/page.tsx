import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, companyName: true, avatarUrl: true, businessNiche: true, city: true, ratingScore: true, role: true },
      },
    },
  });
  if (!post || post.status !== "active") return notFound();

  await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/marketplace/posts" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
        ← Уся стрічка
      </Link>

      <Card padding="md" className="mt-3">
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={post.author.avatarUrl} name={post.author.companyName} size="md" />
          <div className="flex-1 min-w-0">
            <Link href={`/u/${post.author.id}`} className="font-semibold text-zinc-900 dark:text-white hover:text-blue-600 truncate block">
              {post.author.companyName}
            </Link>
            <p className="text-xs text-zinc-500 truncate">
              {post.author.businessNiche ?? "Підприємець"} · {post.author.city} · {new Date(post.createdAt).toLocaleString("uk-UA")}
            </p>
          </div>
          {post.author.ratingScore !== 0 && (
            <Badge variant={post.author.ratingScore >= 0 ? "green" : "red"}>
              {post.author.ratingScore > 0 ? `+${post.author.ratingScore}` : post.author.ratingScore}
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{post.title}</h1>
        <p className="text-zinc-700 dark:text-zinc-300 mt-3 whitespace-pre-wrap leading-relaxed">{post.body}</p>

        {post.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {post.images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="aspect-square object-cover rounded-xl w-full" />
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/u/${post.author.id}`}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            Перейти у профіль
          </Link>
          <Link
            href={`/dashboard/messages?to=${post.author.id}`}
            className="inline-flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium px-4 py-2 rounded-xl"
          >
            Написати
          </Link>
        </div>
      </Card>
    </div>
  );
}
