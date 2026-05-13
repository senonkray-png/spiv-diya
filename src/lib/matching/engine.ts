import type { UserProfile, MatchResult, Resource } from "@/types";

// Score how well an asset covers a deficit (0–100)
function scorePair(asset: Resource, deficit: Resource): number {
  if (asset.category !== deficit.category) return 0;
  const sameCity = asset.city === deficit.city ? 20 : 0;
  const sameRegion = asset.region === deficit.region ? 10 : 0;
  return 70 + sameCity + sameRegion; // base + geo bonus
}

// Direct match: my assets vs their deficits
export function findDirectMatches(
  me: UserProfile,
  others: UserProfile[]
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const other of others) {
    for (const asset of me.assets) {
      for (const deficit of other.deficits) {
        const score = scorePair(asset, deficit);
        if (score > 0) {
          results.push({
            type: "direct",
            score,
            counterparty: {
              id: other.id,
              companyName: other.companyName,
              city: other.city,
              region: other.region,
            },
            myAsset: asset,
            theirDeficit: deficit,
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// Chain match: A→B→C→A circular exchange (depth-limited BFS)
export function findChainMatches(
  me: UserProfile,
  others: UserProfile[],
  maxDepth = 3
): MatchResult[] {
  // Placeholder — full graph traversal implemented in backend
  void me; void others; void maxDepth;
  return [];
}
