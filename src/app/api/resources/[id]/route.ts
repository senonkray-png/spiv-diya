import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { findMatchesForUser } from "@/lib/matching/auto-matcher";
import type { ResourceCategory } from "@/types";

const VALID_CATEGORIES: ResourceCategory[] = [
  "equipment",
  "space",
  "logistics",
  "raw_materials",
  "sales_department",
  "marketing",
  "workforce",
];

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim().slice(0, 200);
  if (typeof body.description === "string") data.description = body.description.trim().slice(0, 1000);
  if (typeof body.city === "string") data.city = body.city.trim().slice(0, 100);
  if (typeof body.region === "string") data.region = body.region.trim().slice(0, 100);
  if (typeof body.category === "string" && (VALID_CATEGORIES as string[]).includes(body.category)) {
    data.category = body.category;
  }

  const updated = await prisma.resource.update({ where: { id }, data });

  // Wipe stale matches involving this resource — categories/cities may have changed
  await prisma.match.deleteMany({
    where: {
      OR: [{ assetId: id }, { deficitId: id }],
      deal: { is: null },
    },
  });

  await findMatchesForUser(session.userId);

  return NextResponse.json({ resource: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Remove dependent matches first (only those without deals)
  await prisma.match.deleteMany({
    where: {
      OR: [{ assetId: id }, { deficitId: id }],
      deal: { is: null },
    },
  });

  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
