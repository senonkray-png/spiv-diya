import { prisma } from "@/lib/db";

interface ResourceLite {
  id: string;
  category: string;
  title: string;
  city: string;
  region: string;
  ownerId: string;
}

function geoBonus(a: ResourceLite, b: ResourceLite): number {
  if (a.city && b.city && a.city === b.city) return 20;
  if (a.region && b.region && a.region === b.region) return 10;
  return 0;
}

function pairScore(asset: ResourceLite, deficit: ResourceLite): number {
  if (asset.category !== deficit.category) return 0;
  return 70 + geoBonus(asset, deficit);
}

interface UpsertResult {
  matchId: string;
  created: boolean;
}

async function upsertMatch(params: {
  initiatorId: string;
  counterpartId: string;
  assetId: string;
  deficitId: string;
  score: number;
}): Promise<UpsertResult> {
  const existing = await prisma.match.findFirst({
    where: {
      initiatorId: params.initiatorId,
      counterpartId: params.counterpartId,
      assetId: params.assetId,
      deficitId: params.deficitId,
    },
  });
  if (existing) {
    if (existing.score !== params.score) {
      await prisma.match.update({ where: { id: existing.id }, data: { score: params.score } });
    }
    return { matchId: existing.id, created: false };
  }
  const created = await prisma.match.create({
    data: {
      type: "direct",
      score: params.score,
      initiatorId: params.initiatorId,
      counterpartId: params.counterpartId,
      assetId: params.assetId,
      deficitId: params.deficitId,
    },
  });
  return { matchId: created.id, created: true };
}

async function notifyMatch(params: {
  recipientId: string;
  partnerName: string;
  assetTitle: string;
  deficitTitle: string;
  iAmSupplier: boolean;
  matchId: string;
}) {
  const title = params.iAmSupplier
    ? `«${params.partnerName}» шукає те, що у вас в надлишку`
    : `«${params.partnerName}» має те, чого вам не вистачає`;
  const body = params.iAmSupplier
    ? `Ваш ресурс «${params.assetTitle}» збігається з потребою партнера «${params.deficitTitle}». Можлива взаємовигідна співпраця.`
    : `Партнер пропонує «${params.assetTitle}», що покриває ваш дефіцит «${params.deficitTitle}».`;

  await prisma.notification.create({
    data: {
      userId: params.recipientId,
      type: "system",
      title,
      body,
      entityType: "match",
      entityId: params.matchId,
      link: "/dashboard/opportunities",
    },
  });
}

/**
 * Find and persist all match opportunities for a given user, in both directions:
 *   - my asset covers another user's deficit (I supply them)
 *   - another user's asset covers my deficit (they supply me)
 *
 * For every newly created match, notifies BOTH sides so an existing user gets
 * pinged when a new arrival has the resource they were looking for.
 */
export async function findMatchesForUser(userId: string): Promise<{ created: number }> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { assets: true, deficits: true },
  });
  if (!me) return { created: 0 };

  const others = await prisma.user.findMany({
    where: { id: { not: userId }, isActive: true, acceptsPartners: true },
    include: { assets: true, deficits: true },
  });

  let created = 0;

  for (const other of others) {
    // Direction 1 — my asset → their deficit (I supply them)
    for (const asset of me.assets) {
      for (const deficit of other.deficits) {
        const score = pairScore(asset, deficit);
        if (score < 70) continue;

        // From my perspective
        const mine = await upsertMatch({
          initiatorId: me.id,
          counterpartId: other.id,
          assetId: asset.id,
          deficitId: deficit.id,
          score,
        });
        // From their perspective (so they also see the opportunity)
        const theirs = await upsertMatch({
          initiatorId: other.id,
          counterpartId: me.id,
          assetId: asset.id,
          deficitId: deficit.id,
          score,
        });

        if (mine.created) {
          await notifyMatch({
            recipientId: me.id,
            partnerName: other.companyName,
            assetTitle: asset.title,
            deficitTitle: deficit.title,
            iAmSupplier: true,
            matchId: mine.matchId,
          });
          created++;
        }
        if (theirs.created) {
          await notifyMatch({
            recipientId: other.id,
            partnerName: me.companyName,
            assetTitle: asset.title,
            deficitTitle: deficit.title,
            iAmSupplier: false,
            matchId: theirs.matchId,
          });
        }
      }
    }

    // Direction 2 — their asset → my deficit (they supply me)
    for (const asset of other.assets) {
      for (const deficit of me.deficits) {
        const score = pairScore(asset, deficit);
        if (score < 70) continue;

        const mine = await upsertMatch({
          initiatorId: me.id,
          counterpartId: other.id,
          assetId: asset.id,
          deficitId: deficit.id,
          score,
        });
        const theirs = await upsertMatch({
          initiatorId: other.id,
          counterpartId: me.id,
          assetId: asset.id,
          deficitId: deficit.id,
          score,
        });

        if (mine.created) {
          await notifyMatch({
            recipientId: me.id,
            partnerName: other.companyName,
            assetTitle: asset.title,
            deficitTitle: deficit.title,
            iAmSupplier: false,
            matchId: mine.matchId,
          });
          created++;
        }
        if (theirs.created) {
          await notifyMatch({
            recipientId: other.id,
            partnerName: me.companyName,
            assetTitle: asset.title,
            deficitTitle: deficit.title,
            iAmSupplier: true,
            matchId: theirs.matchId,
          });
        }
      }
    }
  }

  return { created };
}
