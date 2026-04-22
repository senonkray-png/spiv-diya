// ─── User & Profile ───────────────────────────────────────────────────────────

export type ResourceCategory =
  | "equipment"
  | "space"
  | "logistics"
  | "raw_materials"
  | "sales_department"
  | "marketing"
  | "workforce";

export interface Resource {
  id: string;
  category: ResourceCategory;
  title: string;
  description: string;
  quantity?: number;
  unit?: string;
  city: string;
  region: string;
  photos?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  companyName: string;
  industry: string;
  city: string;
  region: string;
  assets: Resource[];      // Що є
  deficits: Resource[];    // Що потрібно
  balance: number;         // Internal currency (СпівМонети)
  verified: boolean;
  createdAt: string;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface MatchResult {
  type: "direct" | "chain";
  score: number;           // 0–100
  counterparty: Pick<UserProfile, "id" | "companyName" | "city" | "region">;
  myAsset: Resource;
  theirDeficit: Resource;
  chain?: MatchResult[];   // For circular deals A→B→C→A
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod = "crypto" | "p2p_screenshot" | "p2p_manual";
export type PaymentStatus = "pending" | "awaiting_confirmation" | "confirmed" | "rejected";

export interface Payment {
  id: string;
  userId: string;
  method: PaymentMethod;
  amountUSD: number;
  amountTokens: number;
  status: PaymentStatus;
  screenshot?: string;
  txHash?: string;         // Crypto tx hash
  createdAt: string;
  confirmedAt?: string;
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export type DealStatus = "draft" | "negotiating" | "signed" | "completed" | "cancelled";

export interface Deal {
  id: string;
  matchId: string;
  parties: string[];       // User IDs
  status: DealStatus;
  terms: string;
  pdfUrl?: string;
  chatId?: string;
  createdAt: string;
}
