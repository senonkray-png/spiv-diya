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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.resource.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    assets: items.filter((r) => !r.deficitOf),
    deficits: items.filter((r) => !!r.deficitOf),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "deficit" ? "deficit" : "asset";
  const category = (VALID_CATEGORIES as string[]).includes(body.category) ? body.category : "equipment";
  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "Назва обов'язкова" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const description = String(body.description ?? "").trim().slice(0, 1000);
  const city = String(body.city ?? user.city ?? "Невідомо").trim().slice(0, 100);
  const region = String(body.region ?? user.region ?? "Невідомо").trim().slice(0, 100);

  const created = await prisma.resource.create({
    data: {
      category,
      title,
      description,
      city,
      region,
      ownerId: session.userId,
      deficitOf: kind === "deficit" ? session.userId : null,
    },
  });

  // Re-run matching for the user — notifies both sides on new opportunities
  await findMatchesForUser(session.userId);

  return NextResponse.json({ resource: created });
}
