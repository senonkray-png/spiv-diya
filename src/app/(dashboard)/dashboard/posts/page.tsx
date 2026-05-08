import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostsBoard } from "@/components/posts/PostsBoard";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Only entrepreneurs (and admins for moderation context) reach here
  if (user.role !== "entrepreneur" && user.role !== "admin") {
    redirect("/welcome");
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PageHeader
        title="Мої пости"
        description="Публікуйте новини, рекламу та ідеї — їх побачать у стрічці маркетплейсу та підписники в кабінеті."
      />

      <PostsBoard
        initial={posts.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          images: p.images,
          status: p.status,
          views: p.views,
          likes: p.likes,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
