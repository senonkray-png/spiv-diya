import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

function scoreGeo(
  aCity: string,
  aRegion: string,
  bCity: string,
  bRegion: string
): number {
  if (aCity === bCity) return 20;
  if (aRegion === bRegion) return 10;
  return 0;
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { assets: true, deficits: true },
  });
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get all other users with their resources
  const others = await prisma.user.findMany({
    where: { id: { not: session.userId } },
    include: { assets: true, deficits: true },
  });

  const created: string[] = [];

  for (const other of others) {
    // My assets vs their deficits (direct match)
    for (const asset of me.assets) {
      for (const deficit of other.deficits) {
        if (asset.category !== deficit.category) continue;

        const score = 70 + scoreGeo(asset.city, asset.region, deficit.city, deficit.region);

        // Upsert to avoid duplicates
        const existing = await prisma.match.findFirst({
          where: {
            initiatorId: session.userId,
            counterpartId: other.id,
            assetId: asset.id,
            deficitId: deficit.id,
          },
        });

        if (!existing) {
          const m = await prisma.match.create({
            data: {
              type: "direct",
              score,
              initiatorId: session.userId,
              counterpartId: other.id,
              assetId: asset.id,
              deficitId: deficit.id,
            },
          });
          created.push(m.id);
        }
      }
    }
  }

  return NextResponse.json({ matched: created.length });
}
