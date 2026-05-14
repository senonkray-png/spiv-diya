import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { translateContent, injectTranslation, deleteTranslations, parseLocaleFromCookie } from "@/lib/translate";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, companyName: true, avatarUrl: true, role: true, businessNiche: true, city: true, ratingScore: true },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
  const locale = parseLocaleFromCookie(req.headers.get("cookie"));
  const translated = await injectTranslation(post, "post", locale);
  return NextResponse.json({ post: translated });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim().slice(0, 200);
  if (typeof body.body === "string") data.body = body.body.trim().slice(0, 5000);
  if (Array.isArray(body.images)) data.images = body.images.filter((s: unknown) => typeof s === "string").slice(0, 6);
  if (body.status === "active" || body.status === "removed") data.status = body.status;

  const updated = await prisma.post.update({ where: { id }, data });

  if (typeof data.title === "string" || typeof data.body === "string") {
    void translateContent("post", id, { title: updated.title, body: updated.body });
  }

  return NextResponse.json({ post: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id } });
  void deleteTranslations("post", id);
  return NextResponse.json({ ok: true });
}
