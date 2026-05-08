import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const q = url.searchParams.get("q");
  const interest = url.searchParams.get("interest");
  const role = url.searchParams.get("role");
  const city = url.searchParams.get("city");
  const excludeSelf = url.searchParams.get("excludeSelf") === "1";
  const session = await getSession();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (id) where.id = id;
  if (excludeSelf && session) where.NOT = { id: session.userId };
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { businessNiche: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } },
      { aboutMe: { contains: q, mode: "insensitive" } },
    ];
  }
  if (interest) where.interests = { has: interest };
  if (role && ["member", "provider", "buyer"].includes(role)) where.role = role;
  if (city) where.city = { contains: city, mode: "insensitive" };

  const users = await prisma.user.findMany({
    where,
    take: id ? 1 : 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      role: true,
      industry: true,
      businessNiche: true,
      city: true,
      region: true,
      country: true,
      avatarUrl: true,
      bannerUrl: true,
      verified: true,
      websiteUrl: true,
      aboutMe: true,
      interests: true,
      acceptsPartners: true,
      // Contact details — only show to logged-in users
      email: !!session,
      phone: !!session,
      workPhone: !!session,
      telegram: !!session,
      instagram: !!session,
      facebook: !!session,
      whatsapp: !!session,
    },
  });

  return NextResponse.json({ users });
}
