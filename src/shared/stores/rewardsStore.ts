import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";
import {
  LoyaltyProgramStatus,
  PointsBalance,
  UserVoucher,
  PointsTransaction,
  EarnRule,
  RedemptionOption,
  LoyaltyTier,
  getTierByPoints,
  getNextTierInfo,
  TIER_CONFIGS,
} from "../types/rewards";

interface RewardsState {
  // State
  loyaltyStatus: LoyaltyProgramStatus | null;
  pointsBalance: PointsBalance | null;
  userVouchers: UserVoucher[];
  pointsTransactions: PointsTransaction[];
  earnRules: EarnRule[];
  redemptionOptions: RedemptionOption[];
  isLoading: boolean;
  error: string | null;

  // Checkout-related state
  appliedVoucher: UserVoucher | null;
  pointsToApply: number;
  maxApplicablePoints: number;

  // Pagination
  transactionsPagination: {
    hasMore: boolean;
    isLoadingMore: boolean;
    nextUrl?: string;
  };

  // Actions
  setLoyaltyStatus: (status: LoyaltyProgramStatus) => void;
  setPointsBalance: (balance: PointsBalance) => void;
  setUserVouchers: (vouchers: UserVoucher[]) => void;
  setPointsTransactions: (
    transactions: PointsTransaction[],
    append?: boolean
  ) => void;
  setEarnRules: (rules: EarnRule[]) => void;
  setRedemptionOptions: (options: RedemptionOption[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Checkout actions
  applyVoucher: (voucher: UserVoucher) => void;
  removeAppliedVoucher: () => void;
  setPointsToApply: (points: number) => void;
  setMaxApplicablePoints: (maxPoints: number) => void;

  // Transaction actions
  addPointsTransaction: (transaction: PointsTransaction) => void;
  markVoucherAsUsed: (voucherId: string) => void;
  updatePointsBalance: (newBalance: Partial<PointsBalance>) => void;

  // Pagination actions
  setTransactionsPagination: (
    pagination: Partial<RewardsState["transactionsPagination"]>
  ) => void;

  // Computed helpers
  getCurrentTier: () => LoyaltyTier | null;
  getNextTierInfo: () => ReturnType<typeof getNextTierInfo>;
  getTierProgress: () => number;
  getAvailableVouchers: () => UserVoucher[];
  getUsedVouchers: () => UserVoucher[];
  getExpiredVouchers: () => UserVoucher[];

  // Reset actions
  clearRewardsData: () => void;
  resetCheckoutState: () => void;
}

// AsyncStorage adapter
const asyncStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch (error) {
      console.error("Error getting item from AsyncStorage:", error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.error("Error setting item to AsyncStorage:", error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error("Error removing item from AsyncStorage:", error);
    }
  },
};

export const useRewardsStore = create<RewardsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        loyaltyStatus: null,
        pointsBalance: null,
        userVouchers: [],
        pointsTransactions: [],
        earnRules: [],
        redemptionOptions: [],
        isLoading: false,
        error: null,

        // Checkout state
        appliedVoucher: null,
        pointsToApply: 0,
        maxApplicablePoints: 0,

        // Pagination
        transactionsPagination: {
          hasMore: true,
          isLoadingMore: false,
        },

        // Actions
        setLoyaltyStatus: (status) => {
          set({ loyaltyStatus: status }, false, "setLoyaltyStatus");
        },

        setPointsBalance: (balance) => {
          set({ pointsBalance: balance }, false, "setPointsBalance");
        },

        setUserVouchers: (vouchers) => {
          set({ userVouchers: vouchers }, false, "setUserVouchers");
        },

        setPointsTransactions: (transactions, append = false) => {
          set(
            (state) => ({
              pointsTransactions: append
                ? [...state.pointsTransactions, ...transactions]
                : transactions,
            }),
            false,
            "setPointsTransactions"
          );
        },

        setEarnRules: (rules) => {
          set({ earnRules: rules }, false, "setEarnRules");
        },

        setRedemptionOptions: (options) => {
          set({ redemptionOptions: options }, false, "setRedemptionOptions");
        },

        setLoading: (loading) => {
          set({ isLoading: loading }, false, "setLoading");
        },

        setError: (error) => {
          set({ error }, false, "setError");
        },

        // Checkout actions
        applyVoucher: (voucher) => {
          set({ appliedVoucher: voucher }, false, "applyVoucher");
        },

        removeAppliedVoucher: () => {
          set({ appliedVoucher: null }, false, "removeAppliedVoucher");
        },

        setPointsToApply: (points) => {
          const { maxApplicablePoints } = get();
          const validPoints = Math.min(points, maxApplicablePoints);
          set({ pointsToApply: validPoints }, false, "setPointsToApply");
        },

        setMaxApplicablePoints: (maxPoints) => {
          set(
            { maxApplicablePoints: maxPoints },
            false,
            "setMaxApplicablePoints"
          );
        },

        // Transaction actions
        addPointsTransaction: (transaction) => {
          set(
            (state) => ({
              pointsTransactions: [transaction, ...state.pointsTransactions],
            }),
            false,
            "addPointsTransaction"
          );
        },

        markVoucherAsUsed: (voucherId) => {
          set(
            (state) => ({
              userVouchers: state.userVouchers.map((voucher) =>
                voucher.id === voucherId
                  ? {
                      ...voucher,
                      isUsed: true,
                      usedAt: new Date().toISOString(),
                    }
                  : voucher
              ),
            }),
            false,
            "markVoucherAsUsed"
          );
        },

        updatePointsBalance: (newBalance) => {
          set(
            (state) => ({
              pointsBalance: state.pointsBalance
                ? { ...state.pointsBalance, ...newBalance }
                : null,
            }),
            false,
            "updatePointsBalance"
          );
        },

        // Pagination actions
        setTransactionsPagination: (pagination) => {
          set(
            (state) => ({
              transactionsPagination: {
                ...state.transactionsPagination,
                ...pagination,
              },
            }),
            false,
            "setTransactionsPagination"
          );
        },

        // Computed helpers
        getCurrentTier: () => {
          const { pointsBalance } = get();
          return pointsBalance ? getTierByPoints(pointsBalance.current) : null;
        },

        getNextTierInfo: () => {
          const { pointsBalance } = get();
          return pointsBalance ? getNextTierInfo(pointsBalance.current) : null;
        },

        getTierProgress: () => {
          const { pointsBalance } = get();
          if (!pointsBalance) return 0;

          const currentTier = getTierByPoints(pointsBalance.current);
          const tierConfig = TIER_CONFIGS[currentTier];
          const nextTierInfo = getNextTierInfo(pointsBalance.current);

          if (!nextTierInfo) return 100; // Already at max tier

          const progressPoints = pointsBalance.current - tierConfig.minPoints;
          const totalPointsNeeded =
            nextTierInfo.config.minPoints - tierConfig.minPoints;

          return Math.min((progressPoints / totalPointsNeeded) * 100, 100);
        },

        getAvailableVouchers: () => {
          const { userVouchers } = get();
          const now = new Date();
          return userVouchers.filter(
            (voucher) =>
              !voucher.isUsed && new Date(voucher.expirationDate) > now
          );
        },

        getUsedVouchers: () => {
          const { userVouchers } = get();
          return userVouchers.filter((voucher) => voucher.isUsed);
        },

        getExpiredVouchers: () => {
          const { userVouchers } = get();
          const now = new Date();
          return userVouchers.filter(
            (voucher) =>
              !voucher.isUsed && new Date(voucher.expirationDate) <= now
          );
        },

        // Reset actions
        clearRewardsData: () => {
          set(
            {
              loyaltyStatus: null,
              pointsBalance: null,
              userVouchers: [],
              pointsTransactions: [],
              earnRules: [],
              redemptionOptions: [],
              isLoading: false,
              error: null,
              appliedVoucher: null,
              pointsToApply: 0,
              maxApplicablePoints: 0,
              transactionsPagination: {
                hasMore: true,
                isLoadingMore: false,
              },
            },
            false,
            "clearRewardsData"
          );
        },

        resetCheckoutState: () => {
          set(
            {
              appliedVoucher: null,
              pointsToApply: 0,
              maxApplicablePoints: 0,
            },
            false,
            "resetCheckoutState"
          );
        },
      }),
      {
        name: "rewards-store",
        storage: asyncStorageAdapter,
        partialize: (state) => ({
          loyaltyStatus: state.loyaltyStatus,
          pointsBalance: state.pointsBalance,
          userVouchers: state.userVouchers,
          pointsTransactions: state.pointsTransactions.slice(0, 50), // Keep only recent 50 transactions
          earnRules: state.earnRules,
          redemptionOptions: state.redemptionOptions,
          // Don't persist loading states, errors, or checkout state
        }),
      }
    ),
    {
      name: "rewards-store",
    }
  )
);

// Selectors for better performance
export const usePointsBalance = () =>
  useRewardsStore((state) => state.pointsBalance);
export const useLoyaltyStatus = () =>
  useRewardsStore((state) => state.loyaltyStatus);
export const useUserVouchers = () =>
  useRewardsStore((state) => state.userVouchers);
export const useAvailableVouchers = () =>
  useRewardsStore((state) => state.getAvailableVouchers());
export const useUsedVouchers = () =>
  useRewardsStore((state) => state.getUsedVouchers());
export const useExpiredVouchers = () =>
  useRewardsStore((state) => state.getExpiredVouchers());
export const useCurrentTier = () =>
  useRewardsStore((state) => state.getCurrentTier());
export const useNextTierInfo = () =>
  useRewardsStore((state) => state.getNextTierInfo());
export const useTierProgress = () =>
  useRewardsStore((state) => state.getTierProgress());
export const usePointsTransactions = () =>
  useRewardsStore((state) => state.pointsTransactions);
export const useEarnRules = () => useRewardsStore((state) => state.earnRules);
export const useRedemptionOptions = () =>
  useRewardsStore((state) => state.redemptionOptions);
export const useRewardsLoading = () =>
  useRewardsStore((state) => state.isLoading);
export const useRewardsError = () => useRewardsStore((state) => state.error);

// Checkout-specific selectors
export const useAppliedVoucher = () =>
  useRewardsStore((state) => state.appliedVoucher);
export const usePointsToApply = () =>
  useRewardsStore((state) => state.pointsToApply);
export const useMaxApplicablePoints = () =>
  useRewardsStore((state) => state.maxApplicablePoints);

export default useRewardsStore;
