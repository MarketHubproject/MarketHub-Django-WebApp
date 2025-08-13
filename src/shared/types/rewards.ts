// Loyalty Tiers
export type LoyaltyTier = "Silver" | "Gold" | "Platinum";

// Tier Configuration
export interface TierConfig {
  tier: LoyaltyTier;
  minPoints: number;
  maxPoints: number | null;
  pointsMultiplier: number;
  perks: string[];
  color: string;
  icon: string;
}

// Points Balance
export interface PointsBalance {
  current: number;
  lifetime: number;
  pendingExpiration: number;
  expirationDate?: string;
}

// Earning Rules
export interface EarnRule {
  id: string;
  type:
    | "purchase"
    | "signup"
    | "referral"
    | "review"
    | "social_share"
    | "birthday"
    | "bonus";
  description: string;
  pointsPerUnit: number;
  multiplier?: number;
  maxPointsPerDay?: number;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  conditions?: {
    minPurchaseAmount?: number;
    categories?: string[];
    products?: string[];
    userTier?: LoyaltyTier[];
  };
}

// Redemption Options
export interface RedemptionOption {
  id: string;
  type: "discount" | "free_product" | "free_shipping" | "voucher" | "cashback";
  title: string;
  description: string;
  pointsCost: number;
  value: number; // Monetary value or percentage
  imageUrl?: string;
  isActive: boolean;
  stock?: number;
  maxRedemptionsPerUser?: number;
  validFrom?: string;
  validTo?: string;
  conditions?: {
    minOrderAmount?: number;
    categories?: string[];
    products?: string[];
    userTier?: LoyaltyTier[];
  };
}

// User's Vouchers
export interface UserVoucher {
  id: string;
  redemptionId: string;
  voucherCode: string;
  title: string;
  description: string;
  type: RedemptionOption["type"];
  value: number;
  isUsed: boolean;
  usedAt?: string;
  expirationDate: string;
  applicableCategories?: string[];
  minOrderAmount?: number;
  createdAt: string;
}

// Points Transaction History
export interface PointsTransaction {
  id: string;
  type: "earned" | "redeemed" | "expired" | "bonus" | "refunded";
  amount: number; // positive for earned, negative for redeemed/expired
  description: string;
  relatedOrderId?: string;
  relatedRedemptionId?: string;
  timestamp: string;
  expirationDate?: string;
}

// Loyalty Program Status
export interface LoyaltyProgramStatus {
  tier: LoyaltyTier;
  tierConfig: TierConfig;
  pointsBalance: PointsBalance;
  nextTier?: {
    tier: LoyaltyTier;
    pointsNeeded: number;
    config: TierConfig;
  };
  memberSince: string;
  monthlyStats: {
    pointsEarned: number;
    pointsRedeemed: number;
    ordersCount: number;
    totalSpent: number;
  };
  yearlyStats: {
    pointsEarned: number;
    pointsRedeemed: number;
    ordersCount: number;
    totalSpent: number;
  };
}

// API Response Types
export interface RewardsApiResponse {
  success: boolean;
  data: any;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PointsBalanceResponse extends RewardsApiResponse {
  data: PointsBalance;
}

export interface EarnRulesResponse extends RewardsApiResponse {
  data: EarnRule[];
}

export interface RedemptionOptionsResponse extends RewardsApiResponse {
  data: RedemptionOption[];
}

export interface UserVouchersResponse extends RewardsApiResponse {
  data: UserVoucher[];
}

export interface PointsTransactionsResponse extends RewardsApiResponse {
  data: {
    results: PointsTransaction[];
    count: number;
    next?: string;
    previous?: string;
  };
}

export interface LoyaltyStatusResponse extends RewardsApiResponse {
  data: LoyaltyProgramStatus;
}

export interface RedeemPointsRequest {
  redemptionOptionId: string;
  pointsToRedeem: number;
}

export interface RedeemPointsResponse extends RewardsApiResponse {
  data: {
    voucher: UserVoucher;
    newBalance: PointsBalance;
    transaction: PointsTransaction;
  };
}

// Constants for tier configurations
export const TIER_CONFIGS: Record<LoyaltyTier, TierConfig> = {
  Silver: {
    tier: "Silver",
    minPoints: 0,
    maxPoints: 999,
    pointsMultiplier: 1,
    perks: [
      "Earn 1 point per $1 spent",
      "Free standard shipping on orders $50+",
      "Access to member-only sales",
    ],
    color: "#C0C0C0",
    icon: "medal-outline",
  },
  Gold: {
    tier: "Gold",
    minPoints: 1000,
    maxPoints: 4999,
    pointsMultiplier: 1.25,
    perks: [
      "Earn 1.25 points per $1 spent",
      "Free standard shipping on all orders",
      "Priority customer support",
      "Early access to new products",
      "Birthday bonus: 100 points",
    ],
    color: "#FFD700",
    icon: "medal",
  },
  Platinum: {
    tier: "Platinum",
    minPoints: 5000,
    maxPoints: null,
    pointsMultiplier: 1.5,
    perks: [
      "Earn 1.5 points per $1 spent",
      "Free express shipping on all orders",
      "Dedicated VIP customer support",
      "Exclusive VIP events and previews",
      "Birthday bonus: 250 points",
      "Annual bonus: 500 points",
    ],
    color: "#E5E4E2",
    icon: "trophy",
  },
};

// Helper function to get tier by points
export const getTierByPoints = (points: number): LoyaltyTier => {
  if (points >= 5000) return "Platinum";
  if (points >= 1000) return "Gold";
  return "Silver";
};

// Helper function to get next tier info
export const getNextTierInfo = (currentPoints: number) => {
  const currentTier = getTierByPoints(currentPoints);

  if (currentTier === "Silver") {
    return {
      tier: "Gold" as LoyaltyTier,
      pointsNeeded: 1000 - currentPoints,
      config: TIER_CONFIGS.Gold,
    };
  } else if (currentTier === "Gold") {
    return {
      tier: "Platinum" as LoyaltyTier,
      pointsNeeded: 5000 - currentPoints,
      config: TIER_CONFIGS.Platinum,
    };
  }

  return null; // Already at highest tier
};
