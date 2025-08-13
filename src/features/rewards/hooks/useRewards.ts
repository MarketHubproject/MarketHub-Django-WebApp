import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useCallback } from "react";
import rewardsApi from "../api/rewardsApi";
import { useRewardsStore } from "../../../shared/stores/rewardsStore";
import {
  RedeemPointsRequest,
  LoyaltyTier,
} from "../../../shared/types/rewards";

// Query Keys
export const REWARDS_QUERY_KEYS = {
  all: ["rewards"] as const,
  balance: () => [...REWARDS_QUERY_KEYS.all, "balance"] as const,
  loyaltyStatus: () => [...REWARDS_QUERY_KEYS.all, "loyalty-status"] as const,
  earnRules: () => [...REWARDS_QUERY_KEYS.all, "earn-rules"] as const,
  redemptionOptions: (tier?: string) =>
    [...REWARDS_QUERY_KEYS.all, "redemption-options", tier] as const,
  vouchers: (status?: string) =>
    [...REWARDS_QUERY_KEYS.all, "vouchers", status] as const,
  transactions: () => [...REWARDS_QUERY_KEYS.all, "transactions"] as const,
  tierBenefits: (tier?: string) =>
    [...REWARDS_QUERY_KEYS.all, "tier-benefits", tier] as const,
  referral: () => [...REWARDS_QUERY_KEYS.all, "referral"] as const,
  config: () => [...REWARDS_QUERY_KEYS.all, "config"] as const,
} as const;

// Points Balance Hook
export const usePointsBalance = () => {
  const setPointsBalance = useRewardsStore((state) => state.setPointsBalance);
  const setError = useRewardsStore((state) => state.setError);

  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.balance(),
    queryFn: async () => {
      const response = await rewardsApi.getPointsBalance();
      return response.data;
    },
    onSuccess: (data) => {
      setPointsBalance(data);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to load points balance");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Loyalty Status Hook
export const useLoyaltyStatus = () => {
  const setLoyaltyStatus = useRewardsStore((state) => state.setLoyaltyStatus);
  const setError = useRewardsStore((state) => state.setError);

  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.loyaltyStatus(),
    queryFn: async () => {
      const response = await rewardsApi.getLoyaltyStatus();
      return response.data;
    },
    onSuccess: (data) => {
      setLoyaltyStatus(data);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to load loyalty status");
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  });
};

// Earn Rules Hook
export const useEarnRules = () => {
  const setEarnRules = useRewardsStore((state) => state.setEarnRules);
  const setError = useRewardsStore((state) => state.setError);

  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.earnRules(),
    queryFn: async () => {
      const response = await rewardsApi.getEarnRules();
      return response.data;
    },
    onSuccess: (data) => {
      setEarnRules(data);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to load earning rules");
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60 * 2, // 2 hours
  });
};

// Redemption Options Hook
export const useRedemptionOptions = (tier?: LoyaltyTier) => {
  const setRedemptionOptions = useRewardsStore(
    (state) => state.setRedemptionOptions
  );
  const setError = useRewardsStore((state) => state.setError);

  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.redemptionOptions(tier),
    queryFn: async () => {
      const response = await rewardsApi.getRedemptionOptions(tier);
      return response.data;
    },
    onSuccess: (data) => {
      setRedemptionOptions(data);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to load redemption options");
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  });
};

// User Vouchers Hook
export const useUserVouchers = (status?: "available" | "used" | "expired") => {
  const setUserVouchers = useRewardsStore((state) => state.setUserVouchers);
  const setError = useRewardsStore((state) => state.setError);

  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.vouchers(status),
    queryFn: async () => {
      const response = await rewardsApi.getUserVouchers(status);
      return response.data;
    },
    onSuccess: (data) => {
      if (!status) {
        // If no status filter, this is all vouchers
        setUserVouchers(data);
      }
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to load vouchers");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Points Transactions Hook (with infinite loading)
export const usePointsTransactions = () => {
  const setPointsTransactions = useRewardsStore(
    (state) => state.setPointsTransactions
  );
  const setTransactionsPagination = useRewardsStore(
    (state) => state.setTransactionsPagination
  );
  const setError = useRewardsStore((state) => state.setError);

  return useInfiniteQuery({
    queryKey: REWARDS_QUERY_KEYS.transactions(),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await rewardsApi.getPointsTransactions(pageParam, 20);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.next ? lastPage.results.length / 20 + 1 : undefined;
    },
    onSuccess: (data) => {
      const allTransactions = data.pages.flatMap((page) => page.results);
      setPointsTransactions(allTransactions);
      setTransactionsPagination({
        hasMore: !!data.pages[data.pages.length - 1]?.next,
        isLoadingMore: false,
      });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to load transactions");
      setTransactionsPagination({ isLoadingMore: false });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
  });
};

// Redeem Points Mutation
export const useRedeemPoints = () => {
  const queryClient = useQueryClient();
  const addPointsTransaction = useRewardsStore(
    (state) => state.addPointsTransaction
  );
  const setUserVouchers = useRewardsStore((state) => state.setUserVouchers);
  const setPointsBalance = useRewardsStore((state) => state.setPointsBalance);
  const setError = useRewardsStore((state) => state.setError);

  return useMutation({
    mutationFn: async (request: RedeemPointsRequest) => {
      const response = await rewardsApi.redeemPoints(request);
      return response.data;
    },
    onSuccess: (data) => {
      // Update local state with new voucher and balance
      addPointsTransaction(data.transaction);
      setPointsBalance(data.newBalance);

      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEYS.balance() });
      queryClient.invalidateQueries({
        queryKey: REWARDS_QUERY_KEYS.vouchers(),
      });
      queryClient.invalidateQueries({
        queryKey: REWARDS_QUERY_KEYS.transactions(),
      });
      queryClient.invalidateQueries({
        queryKey: REWARDS_QUERY_KEYS.loyaltyStatus(),
      });

      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to redeem points");
    },
  });
};

// Calculate Earnable Points Hook
export const useCalculateEarnablePoints = () => {
  return useMutation({
    mutationFn: async ({
      orderAmount,
      orderItems,
    }: {
      orderAmount: number;
      orderItems?: any[];
    }) => {
      const response = await rewardsApi.calculateEarnablePoints(
        orderAmount,
        orderItems
      );
      return response.data;
    },
  });
};

// Calculate Points Discount Hook
export const useCalculatePointsDiscount = () => {
  return useMutation({
    mutationFn: async ({
      pointsToUse,
      orderAmount,
    }: {
      pointsToUse: number;
      orderAmount: number;
    }) => {
      const response = await rewardsApi.calculatePointsDiscount(
        pointsToUse,
        orderAmount
      );
      return response.data;
    },
  });
};

// Validate Voucher Hook
export const useValidateVoucher = () => {
  return useMutation({
    mutationFn: async ({
      voucherCode,
      orderAmount,
      orderItems,
    }: {
      voucherCode: string;
      orderAmount: number;
      orderItems?: any[];
    }) => {
      const response = await rewardsApi.validateVoucher(
        voucherCode,
        orderAmount,
        orderItems
      );
      return response.data;
    },
  });
};

// Use Voucher Hook
export const useUseVoucher = () => {
  const queryClient = useQueryClient();
  const markVoucherAsUsed = useRewardsStore((state) => state.markVoucherAsUsed);
  const setError = useRewardsStore((state) => state.setError);

  return useMutation({
    mutationFn: async ({
      voucherId,
      orderId,
    }: {
      voucherId: string;
      orderId: string;
    }) => {
      const response = await rewardsApi.useVoucher(voucherId, orderId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      markVoucherAsUsed(variables.voucherId);
      queryClient.invalidateQueries({
        queryKey: REWARDS_QUERY_KEYS.vouchers(),
      });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to use voucher");
    },
  });
};

// Tier Benefits Hook
export const useTierBenefits = (tier?: LoyaltyTier) => {
  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.tierBenefits(tier),
    queryFn: async () => {
      const response = await rewardsApi.getTierBenefits(tier);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 4, // 4 hours
  });
};

// Referral Info Hook
export const useReferralInfo = () => {
  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.referral(),
    queryFn: async () => {
      const response = await rewardsApi.getReferralInfo();
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60 * 2, // 2 hours
  });
};

// Send Referral Hook
export const useSendReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      message,
    }: {
      email: string;
      message?: string;
    }) => {
      const response = await rewardsApi.sendReferral(email, message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: REWARDS_QUERY_KEYS.referral(),
      });
    },
  });
};

// Rewards Config Hook
export const useRewardsConfig = () => {
  return useQuery({
    queryKey: REWARDS_QUERY_KEYS.config(),
    queryFn: async () => {
      const response = await rewardsApi.getRewardsConfig();
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

// Composite Hook for Initial Rewards Data
export const useInitialRewardsData = () => {
  const pointsBalanceQuery = usePointsBalance();
  const loyaltyStatusQuery = useLoyaltyStatus();
  const vouchersQuery = useUserVouchers();
  const earnRulesQuery = useEarnRules();

  const isLoading =
    pointsBalanceQuery.isLoading ||
    loyaltyStatusQuery.isLoading ||
    vouchersQuery.isLoading ||
    earnRulesQuery.isLoading;

  const isError =
    pointsBalanceQuery.isError ||
    loyaltyStatusQuery.isError ||
    vouchersQuery.isError ||
    earnRulesQuery.isError;

  const refetchAll = useCallback(() => {
    pointsBalanceQuery.refetch();
    loyaltyStatusQuery.refetch();
    vouchersQuery.refetch();
    earnRulesQuery.refetch();
  }, [pointsBalanceQuery, loyaltyStatusQuery, vouchersQuery, earnRulesQuery]);

  return {
    isLoading,
    isError,
    refetchAll,
    queries: {
      pointsBalance: pointsBalanceQuery,
      loyaltyStatus: loyaltyStatusQuery,
      vouchers: vouchersQuery,
      earnRules: earnRulesQuery,
    },
  };
};
