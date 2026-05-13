import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const authorId = url.searchParams.get("authorId");
  const followedOnly = url.searchParams.get("followedOnly") === "1";
  const session = followedOnly ? await getSession() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: "active" };
  if (authorId) where.authorId = authorId;

  if (followedOnly && session) {
    const favs = await prisma.favorite.findMany({
      where: { ownerId: session.userId, userId: { not: null } },
      select: { userId: true },
    });
    const ids = favs.map((f) => f.userId).filter((id): id is string => !!id);
    if (ids.length === 0) return NextResponse.json({ posts: [] });
    where.authorId = { in: ids };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      author: {
        select: { id: true, companyName: true, avatarUrl: true, role: true, businessNiche: true, ratingScore: true },
      },
    },
  });

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only entrepreneurs (and admins) can post on the marketplace feed
  if (me.role !== "entrepreneur" && me.role !== "admin") {
    return NextResponse.json(
      { error: "Публікація постів доступна для плану «Підприємець»." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const images = Array.isArray(body.images)
    ? body.images.filter((s: unknown) => typeof s === "string").slice(0, 6)
    : [];

  if (!title || !text) {
    return NextResponse.json({ error: "Заголовок і текст обов'язкові" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      authorId: session.userId,
      title: title.slice(0, 200),
      body: text.slice(0, 5000),
      images,
    },
  });

  // Notify followers (people who favorited this entrepreneur)
  const followers = await prisma.favorite.findMany({
    where: { userId: session.userId },
    select: { ownerId: true },
  });
  if (followers.length > 0) {
    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.ownerId,
        type: "favorite_new_post",
        title: `Новий пост від ${me.companyName}`,
        body: title.slice(0, 120),
        entityType: "post",
        entityId: post.id,
        link: `/marketplace/posts/${post.id}`,
      })),
    });
  }

  return NextResponse.json({ post });
}
