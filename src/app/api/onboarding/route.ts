import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { chat } from "@/lib/ai/onboarding-agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

  // Load or create onboarding session
  let onboarding = await prisma.onboardingSession.findUnique({
    where: { userId: session.userId },
  });

  if (!onboarding) {
    onboarding = await prisma.onboardingSession.create({
      data: { userId: session.userId, history: [] },
    });
  }

  const history = onboarding.history as { role: "user" | "assistant"; content: string }[];

  const { reply, profile } = await chat(history, message);

  const updatedHistory = [
    ...history,
    { role: "user" as const, content: message },
    { role: "assistant" as const, content: reply },
  ];

  const completed = !!profile;

  await prisma.onboardingSession.update({
    where: { id: onboarding.id },
    data: { history: updatedHistory, completed },
  });

  // Persist resources if onboarding completed
  if (profile) {
    const userId = session.userId;

    for (const asset of profile.assets ?? []) {
      await prisma.resource.create({
        data: {
          category: asset.category ?? "equipment",
          title: asset.title ?? "Актив",
          description: asset.description ?? "",
          city: asset.city ?? "Невідомо",
          region: asset.region ?? "Невідомо",
          ownerId: userId,
        },
      });
    }

    for (const deficit of profile.deficits ?? []) {
      await prisma.resource.create({
        data: {
          category: deficit.category ?? "equipment",
          title: deficit.title ?? "Дефіцит",
          description: deficit.description ?? "",
          city: deficit.city ?? "Невідомо",
          region: deficit.region ?? "Невідомо",
          ownerId: userId,
          deficitOf: userId,
        },
      });
    }
  }

  return NextResponse.json({ reply, completed });
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
