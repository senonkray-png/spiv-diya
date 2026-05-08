import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { chat, type ExtractedProfile } from "@/lib/ai/onboarding-agent";
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

function normalizeCategory(value: unknown): ResourceCategory {
  if (typeof value === "string" && (VALID_CATEGORIES as string[]).includes(value)) {
    return value as ResourceCategory;
  }
  return "equipment";
}

async function applyProfileToUser(userId: string, profile: ExtractedProfile) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // Only fill in fields that the user has not set yet — never overwrite manual edits.
  const update: Record<string, unknown> = {};
  if (profile.businessNiche && !user.businessNiche) update.businessNiche = profile.businessNiche.slice(0, 120);
  if (profile.aboutMe && !user.aboutMe) update.aboutMe = profile.aboutMe.slice(0, 2000);
  if (profile.fullName && !user.fullName) update.fullName = profile.fullName.slice(0, 120);
  if (profile.phone && !user.phone) update.phone = profile.phone.slice(0, 40);
  if (profile.websiteUrl && !user.websiteUrl) update.websiteUrl = profile.websiteUrl.slice(0, 200);
  if (profile.interests && profile.interests.length && (!user.interests || user.interests.length === 0)) {
    update.interests = profile.interests.map((s) => s.trim()).filter(Boolean).slice(0, 12);
  }
  if (profile.city && (!user.city || user.city === "Невідомо")) update.city = profile.city;
  if (profile.region && (!user.region || user.region === "Невідомо")) update.region = profile.region;

  if (Object.keys(update).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: update });
  }
}

async function persistResources(userId: string, profile: ExtractedProfile) {
  // Existing resources to avoid duplicating identical onboarding entries
  const existing = await prisma.resource.findMany({
    where: { ownerId: userId },
    select: { title: true, category: true, deficitOf: true },
  });
  const seen = new Set(existing.map((r) => `${r.category}|${r.title.toLowerCase()}|${r.deficitOf ? "d" : "a"}`));

  const fallbackCity = profile.city ?? "Невідомо";
  const fallbackRegion = profile.region ?? "Невідомо";

  for (const asset of profile.assets ?? []) {
    const category = normalizeCategory(asset.category);
    const title = (asset.title ?? "Актив").slice(0, 200);
    const key = `${category}|${title.toLowerCase()}|a`;
    if (seen.has(key)) continue;
    seen.add(key);
    await prisma.resource.create({
      data: {
        category,
        title,
        description: (asset.description ?? "").slice(0, 1000),
        city: asset.city ?? fallbackCity,
        region: asset.region ?? fallbackRegion,
        ownerId: userId,
      },
    });
  }

  for (const deficit of profile.deficits ?? []) {
    const category = normalizeCategory(deficit.category);
    const title = (deficit.title ?? "Дефіцит").slice(0, 200);
    const key = `${category}|${title.toLowerCase()}|d`;
    if (seen.has(key)) continue;
    seen.add(key);
    await prisma.resource.create({
      data: {
        category,
        title,
        description: (deficit.description ?? "").slice(0, 1000),
        city: deficit.city ?? fallbackCity,
        region: deficit.region ?? fallbackRegion,
        ownerId: userId,
        deficitOf: userId,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let onboarding = await prisma.onboardingSession.findUnique({
    where: { userId: session.userId },
  });
  if (!onboarding) {
    onboarding = await prisma.onboardingSession.create({
      data: { userId: session.userId, history: [] },
    });
  }

  const history = onboarding.history as { role: "user" | "assistant"; content: string }[];

  const { reply, profile } = await chat(history, message, {
    companyName: user.companyName,
    industry: user.industry,
    city: user.city,
    region: user.region,
  });

  const updatedHistory = [
    ...history,
    { role: "user" as const, content: message },
    { role: "assistant" as const, content: reply },
  ];

  const completed = !!profile;

  await prisma.onboardingSession.update({
    where: { id: onboarding.id },
    data: { history: updatedHistory, completed: completed || onboarding.completed },
  });

  let matchesCreated = 0;
  if (profile && !onboarding.completed) {
    await applyProfileToUser(session.userId, profile);
    await persistResources(session.userId, profile);
    const result = await findMatchesForUser(session.userId);
    matchesCreated = result.created;
  }

  return NextResponse.json({ reply, completed, matchesCreated });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const onboarding = await prisma.onboardingSession.findUnique({
    where: { userId: session.userId },
  });

  return NextResponse.json({
    history: (onboarding?.history ?? []) as { role: string; content: string }[],
    completed: onboarding?.completed ?? false,
  });
}
