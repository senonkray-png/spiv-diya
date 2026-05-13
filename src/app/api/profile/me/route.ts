import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { findMatchesForUser } from "@/lib/matching/auto-matcher";

const STRING_FIELDS = [
  "fullName",
  "phone",
  "workPhone",
  "websiteUrl",
  "avatarUrl",
  "bannerUrl",
  "aboutMe",
  "businessNiche",
  "telegram",
  "instagram",
  "facebook",
  "whatsapp",
  "industry",
  "city",
  "region",
  "country",
  "companyName",
] as const;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 ? null : t.slice(0, 1000);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      verified: true,
      balance: true,
      companyName: true,
      industry: true,
      city: true,
      region: true,
      country: true,
      fullName: true,
      phone: true,
      workPhone: true,
      websiteUrl: true,
      avatarUrl: true,
      bannerUrl: true,
      aboutMe: true,
      interests: true,
      businessNiche: true,
      telegram: true,
      instagram: true,
      facebook: true,
      whatsapp: true,
      acceptsPartners: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const profile = (body?.profile ?? body) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  for (const f of STRING_FIELDS) {
    if (f in profile) data[f] = clean(profile[f]);
  }

  if (Array.isArray(profile.interests)) {
    data.interests = profile.interests
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0)
      .slice(0, 30);
  }

  if (typeof profile.acceptsPartners === "boolean") {
    data.acceptsPartners = profile.acceptsPartners;
  }

  const allowedRoles = ["member", "provider", "buyer"] as const;
  if (typeof profile.role === "string" && (allowedRoles as readonly string[]).includes(profile.role)) {
    // Users can self-elect provider/buyer/member; admin role granted by admins only.
    data.role = profile.role;
  }

  if (!data.companyName || typeof data.companyName !== "string") {
    delete data.companyName;
  }

  const before = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { city: true, region: true, acceptsPartners: true },
  });

  const user = await prisma.user.update({
    where: { id: session.userId },
    data,
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      balance: true,
      companyName: true,
      industry: true,
      city: true,
      region: true,
      country: true,
      fullName: true,
      phone: true,
      workPhone: true,
      websiteUrl: true,
      avatarUrl: true,
      bannerUrl: true,
      aboutMe: true,
      interests: true,
      businessNiche: true,
      telegram: true,
      instagram: true,
      facebook: true,
      whatsapp: true,
      acceptsPartners: true,
      createdAt: true,
    },
  });

  // Re-run matching when fields that influence pairing have changed
  const cityChanged = before?.city !== user.city;
  const regionChanged = before?.region !== user.region;
  const partnersToggled = before?.acceptsPartners !== user.acceptsPartners;
  if (cityChanged || regionChanged || partnersToggled) {
    if (user.acceptsPartners) {
      await findMatchesForUser(session.userId);
    }
  }

  return NextResponse.json({ user });
}
