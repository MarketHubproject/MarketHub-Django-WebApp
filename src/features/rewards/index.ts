// Main Components
export { default as RewardsScreen } from "./ui/RewardsScreen";
export { default as CheckoutRewards } from "./ui/CheckoutRewards";

// Hooks
export * from "./hooks/useRewards";

// API
export { default as rewardsApi } from "./api/rewardsApi";

// Store exports (re-exported from shared)
export {
  useRewardsStore,
  usePointsBalance,
  useLoyaltyStatus,
  useUserVouchers,
  useAvailableVouchers,
  useUsedVouchers,
  useExpiredVouchers,
  useCurrentTier,
  useNextTierInfo,
  useTierProgress,
  usePointsTransactions,
  useEarnRules,
  useRedemptionOptions,
  useRewardsLoading,
  useRewardsError,
  useAppliedVoucher,
  usePointsToApply,
  useMaxApplicablePoints,
} from "../../shared/stores/rewardsStore";

// Types (re-exported from shared)
export type {
  LoyaltyTier,
  TierConfig,
  PointsBalance,
  EarnRule,
  RedemptionOption,
  UserVoucher,
  PointsTransaction,
  LoyaltyProgramStatus,
  RedeemPointsRequest,
  RedeemPointsResponse,
  RewardsApiResponse,
} from "../../shared/types/rewards";

// Constants
export {
  TIER_CONFIGS,
  getTierByPoints,
  getNextTierInfo,
} from "../../shared/types/rewards";
