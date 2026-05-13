// ─── User & Profile ───────────────────────────────────────────────────────────

export type ResourceCategory =
  | "equipment"
  | "space"
  | "logistics"
  | "raw_materials"
  | "sales_department"
  | "marketing"
  | "workforce";

export type UserRole = "member" | "provider" | "buyer" | "entrepreneur" | "admin";

export type SubscriptionPlan = "free" | "provider" | "entrepreneur";
export type SubscriptionStatus = "pending" | "active" | "expired" | "cancelled";
export type EmailTokenType = "verify" | "magic" | "reset";
export type PostStatus = "active" | "removed";
export type RatingValue = "up" | "down";

export const PLAN_PRICES: Record<Exclude<SubscriptionPlan, "free">, { uah: number; tokens: number }> = {
  provider: { uah: 1000, tokens: 1000 },
  entrepreneur: { uah: 3000, tokens: 3000 },
};

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
  country?: string;
  role: UserRole;
  isActive: boolean;

  fullName?: string | null;
  phone?: string | null;
  workPhone?: string | null;
  websiteUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  aboutMe?: string | null;
  businessNiche?: string | null;
  acceptsPartners?: boolean;
  interests: string[];

  telegram?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;

  assets: Resource[];
  deficits: Resource[];
  balance: number;
  verified: boolean;
  createdAt: string;
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export type ListingStatus = "active" | "paused" | "removed";
export type ServiceType = "offer" | "request";

export interface Product {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  priceTokens: number;
  priceUAH: number | null;
  currency: string;
  category: string | null;
  city: string | null;
  region: string | null;
  photos: string[];
  status: ListingStatus;
  views: number;
  sourceUrl: string | null;
  createdAt: string;
}

export interface ServiceAd {
  id: string;
  ownerId: string;
  type: ServiceType;
  title: string;
  description: string;
  priceTokens: number | null;
  priceUAH: number | null;
  category: string | null;
  city: string | null;
  region: string | null;
  photos: string[];
  status: ListingStatus;
  createdAt: string;
}

// ─── Direct messaging ─────────────────────────────────────────────────────────

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  contextType?: string | null;
  contextId?: string | null;
  read: boolean;
  createdAt: string;
}

// ─── Partnership / Favorites ──────────────────────────────────────────────────

export type PartnerStatus = "pending" | "accepted" | "rejected";

export interface Partnership {
  id: string;
  initiatorId: string;
  targetId: string;
  status: PartnerStatus;
  message?: string | null;
  createdAt: string;
}

export interface Favorite {
  id: string;
  ownerId: string;
  userId?: string | null;
  productId?: string | null;
  serviceId?: string | null;
  note?: string | null;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface MatchResult {
  type: "direct" | "chain";
  score: number;
  counterparty: Pick<UserProfile, "id" | "companyName" | "city" | "region">;
  myAsset: Resource;
  theirDeficit: Resource;
  chain?: MatchResult[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod = "crypto_binance" | "crypto_whitebit" | "p2p_screenshot" | "p2p_manual";
export type PaymentStatus = "pending" | "awaiting_confirmation" | "confirmed" | "rejected";

export interface Payment {
  id: string;
  userId: string;
  method: PaymentMethod;
  amountUSD: number;
  amountTokens: number;
  status: PaymentStatus;
  screenshot?: string;
  txHash?: string;
  createdAt: string;
  confirmedAt?: string;
}

export type WalletTxType =
  | "deposit"
  | "withdrawal"
  | "transfer_in"
  | "transfer_out"
  | "purchase"
  | "refund"
  | "bonus";

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amountTokens: number;
  amountUAH?: number | null;
  details: string;
  reason?: string | null;
  status: WithdrawalStatus;
  adminNote?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "partner_request"
  | "partner_accepted"
  | "message"
  | "product_warning"
  | "product_removed"
  | "service_warning"
  | "service_removed"
  | "payment_confirmed"
  | "payment_rejected"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "subscription_activated"
  | "subscription_expiring"
  | "favorite_new_product"
  | "favorite_new_post"
  | "rating_changed"
  | "email_verified"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export type DealStatus = "draft" | "negotiating" | "signed" | "completed" | "cancelled";

export interface Deal {
  id: string;
  matchId: string;
  parties: string[];
  status: DealStatus;
  terms: string;
  pdfUrl?: string;
  chatId?: string;
  createdAt: string;
}

// ─── Posts (entrepreneur ad/idea posts on the marketplace feed) ───────────────

export interface Post {
  id: string;
  authorId: string;
  title: string;
  body: string;
  images: string[];
  status: PostStatus;
  views: number;
  likes: number;
  createdAt: string;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  priceUAH: number;
  priceTokens: number;
  paidWith: "tokens" | "uah";
  paymentId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

export interface Rating {
  id: string;
  voterId: string;
  targetUserId: string;
  value: RatingValue;
  reason?: string | null;
  createdAt: string;
}
