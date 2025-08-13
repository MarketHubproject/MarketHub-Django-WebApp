import { renderHook, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useRewards } from "@/features/rewards/hooks/useRewards";
import { createMockQueryClient } from "@testing/utils/testUtils";
import * as rewardsApi from "@/features/rewards/api/rewardsApi";

// Mock the rewards API
jest.mock("@/features/rewards/api/rewardsApi");
const mockRewardsApi = rewardsApi as jest.Mocked<typeof rewardsApi>;

// Create wrapper component
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useRewards", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createMockQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("getRewardsBalance", () => {
    it("should fetch user rewards balance", async () => {
      const mockBalance = { points: 1500, tier: "gold", nextTierPoints: 2000 };
      mockRewardsApi.getRewardsBalance.mockResolvedValueOnce(mockBalance);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.refetchBalance();
      });

      expect(mockRewardsApi.getRewardsBalance).toHaveBeenCalled();
      expect(result.current.balance).toEqual(mockBalance);
      expect(result.current.isLoadingBalance).toBe(false);
    });

    it("should handle balance fetch error", async () => {
      const error = new Error("Failed to fetch balance");
      mockRewardsApi.getRewardsBalance.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.refetchBalance();
        } catch (err) {
          expect(err).toEqual(error);
        }
      });

      expect(result.current.balanceError).toBeTruthy();
      expect(result.current.balance).toBeNull();
    });
  });

  describe("earnPoints", () => {
    it("should successfully earn points", async () => {
      const earnRequest = {
        action: "purchase" as const,
        orderId: "order-123",
        points: 100,
      };

      const mockResponse = {
        pointsEarned: 100,
        newBalance: 1600,
        transactionId: "txn-123",
      };

      mockRewardsApi.earnPoints.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      let response: any;
      await act(async () => {
        response = await result.current.earnPoints(earnRequest);
      });

      expect(mockRewardsApi.earnPoints).toHaveBeenCalledWith(earnRequest);
      expect(response).toEqual(mockResponse);
      expect(result.current.isEarningPoints).toBe(false);
    });

    it("should handle earn points error", async () => {
      const error = new Error("Failed to earn points");
      mockRewardsApi.earnPoints.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.earnPoints({
            action: "purchase",
            orderId: "order-123",
            points: 100,
          });
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toEqual(error);
    });

    it("should set loading state during earn points", () => {
      let resolveEarnPoints: any;
      mockRewardsApi.earnPoints.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveEarnPoints = resolve;
          })
      );

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.earnPoints({
          action: "purchase",
          orderId: "order-123",
          points: 100,
        });
      });

      expect(result.current.isEarningPoints).toBe(true);

      act(() => {
        resolveEarnPoints({
          pointsEarned: 100,
          newBalance: 1600,
          transactionId: "txn-123",
        });
      });

      expect(result.current.isEarningPoints).toBe(false);
    });
  });

  describe("redeemReward", () => {
    it("should successfully redeem a reward", async () => {
      const redeemRequest = {
        rewardId: "reward-123",
        pointsCost: 500,
      };

      const mockResponse = {
        success: true,
        newBalance: 1000,
        redemptionCode: "REDEEM123",
        transactionId: "txn-456",
      };

      mockRewardsApi.redeemReward.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      let response: any;
      await act(async () => {
        response = await result.current.redeemReward(redeemRequest);
      });

      expect(mockRewardsApi.redeemReward).toHaveBeenCalledWith(redeemRequest);
      expect(response).toEqual(mockResponse);
      expect(result.current.isRedeeming).toBe(false);
    });

    it("should handle insufficient points error", async () => {
      const error = new Error("Insufficient points");
      error.response = { status: 400, data: { code: "INSUFFICIENT_POINTS" } };
      mockRewardsApi.redeemReward.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      let thrownError: any = null;
      await act(async () => {
        try {
          await result.current.redeemReward({
            rewardId: "reward-123",
            pointsCost: 2000, // More than available
          });
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toEqual(error);
      expect(thrownError.response.data.code).toBe("INSUFFICIENT_POINTS");
    });
  });

  describe("getRewardsHistory", () => {
    it("should fetch rewards transaction history", async () => {
      const mockHistory = [
        {
          id: "txn-1",
          type: "earn",
          points: 100,
          description: "Purchase reward",
          date: "2024-01-15T10:00:00Z",
          orderId: "order-123",
        },
        {
          id: "txn-2",
          type: "redeem",
          points: -500,
          description: "Free coffee",
          date: "2024-01-14T15:30:00Z",
          rewardId: "reward-456",
        },
      ];

      mockRewardsApi.getRewardsHistory.mockResolvedValueOnce({
        transactions: mockHistory,
        pagination: { page: 1, limit: 10, total: 2 },
      });

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.fetchHistory();
      });

      expect(mockRewardsApi.getRewardsHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result.current.history).toEqual(mockHistory);
      expect(result.current.isLoadingHistory).toBe(false);
    });

    it("should handle pagination correctly", async () => {
      const page1History = [{ id: "txn-1", type: "earn", points: 100 }];
      const page2History = [{ id: "txn-2", type: "redeem", points: -50 }];

      mockRewardsApi.getRewardsHistory
        .mockResolvedValueOnce({
          transactions: page1History,
          pagination: { page: 1, limit: 1, total: 2, hasMore: true },
        })
        .mockResolvedValueOnce({
          transactions: page2History,
          pagination: { page: 2, limit: 1, total: 2, hasMore: false },
        });

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      // Fetch first page
      await act(async () => {
        await result.current.fetchHistory({ page: 1, limit: 1 });
      });

      expect(result.current.history).toEqual(page1History);
      expect(result.current.pagination?.hasMore).toBe(true);

      // Fetch second page
      await act(async () => {
        await result.current.fetchHistory({ page: 2, limit: 1 });
      });

      expect(result.current.history).toEqual([
        ...page1History,
        ...page2History,
      ]);
      expect(result.current.pagination?.hasMore).toBe(false);
    });
  });

  describe("getAvailableRewards", () => {
    it("should fetch available rewards catalog", async () => {
      const mockRewards = [
        {
          id: "reward-1",
          name: "Free Coffee",
          description: "12oz coffee of your choice",
          pointsCost: 500,
          category: "beverages",
          imageUrl: "https://example.com/coffee.jpg",
          isAvailable: true,
          expiryDate: "2024-12-31",
        },
        {
          id: "reward-2",
          name: "20% Discount",
          description: "20% off your next purchase",
          pointsCost: 300,
          category: "discounts",
          isAvailable: true,
          minOrderValue: 50,
        },
      ];

      mockRewardsApi.getAvailableRewards.mockResolvedValueOnce(mockRewards);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.fetchAvailableRewards();
      });

      expect(mockRewardsApi.getAvailableRewards).toHaveBeenCalled();
      expect(result.current.availableRewards).toEqual(mockRewards);
      expect(result.current.isLoadingRewards).toBe(false);
    });

    it("should filter rewards by category", async () => {
      const allRewards = [
        { id: "1", category: "beverages", pointsCost: 500 },
        { id: "2", category: "discounts", pointsCost: 300 },
        { id: "3", category: "beverages", pointsCost: 400 },
      ];

      mockRewardsApi.getAvailableRewards.mockResolvedValueOnce(allRewards);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.fetchAvailableRewards({ category: "beverages" });
      });

      expect(mockRewardsApi.getAvailableRewards).toHaveBeenCalledWith({
        category: "beverages",
      });
    });
  });

  describe("validateRedemption", () => {
    it("should validate redemption eligibility", async () => {
      const validationRequest = {
        rewardId: "reward-123",
        pointsCost: 500,
      };

      const mockValidation = {
        isEligible: true,
        currentBalance: 1000,
        remainingBalance: 500,
      };

      mockRewardsApi.validateRedemption.mockResolvedValueOnce(mockValidation);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      let validation: any;
      await act(async () => {
        validation = await result.current.validateRedemption(validationRequest);
      });

      expect(mockRewardsApi.validateRedemption).toHaveBeenCalledWith(
        validationRequest
      );
      expect(validation).toEqual(mockValidation);
    });

    it("should handle validation for insufficient points", async () => {
      const validationRequest = {
        rewardId: "reward-123",
        pointsCost: 2000,
      };

      const mockValidation = {
        isEligible: false,
        currentBalance: 500,
        requiredPoints: 2000,
        shortfall: 1500,
        reason: "INSUFFICIENT_POINTS",
      };

      mockRewardsApi.validateRedemption.mockResolvedValueOnce(mockValidation);

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      let validation: any;
      await act(async () => {
        validation = await result.current.validateRedemption(validationRequest);
      });

      expect(validation.isEligible).toBe(false);
      expect(validation.reason).toBe("INSUFFICIENT_POINTS");
      expect(validation.shortfall).toBe(1500);
    });
  });

  describe("state management", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.balance).toBeNull();
      expect(result.current.history).toEqual([]);
      expect(result.current.availableRewards).toEqual([]);
      expect(result.current.isLoadingBalance).toBe(false);
      expect(result.current.isLoadingHistory).toBe(false);
      expect(result.current.isLoadingRewards).toBe(false);
      expect(result.current.isEarningPoints).toBe(false);
      expect(result.current.isRedeeming).toBe(false);
    });

    it("should handle multiple concurrent operations", async () => {
      let resolveBalance: any;
      let resolveHistory: any;

      mockRewardsApi.getRewardsBalance.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveBalance = resolve;
          })
      );

      mockRewardsApi.getRewardsHistory.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveHistory = resolve;
          })
      );

      const { result } = renderHook(() => useRewards(), {
        wrapper: createWrapper(queryClient),
      });

      // Start concurrent operations
      const balancePromise = act(async () => {
        return result.current.refetchBalance();
      });

      const historyPromise = act(async () => {
        return result.current.fetchHistory();
      });

      expect(result.current.isLoadingBalance).toBe(true);
      expect(result.current.isLoadingHistory).toBe(true);

      // Resolve balance first
      act(() => {
        resolveBalance({ points: 1500, tier: "gold" });
      });
      await balancePromise;

      expect(result.current.balance).toEqual({ points: 1500, tier: "gold" });
      expect(result.current.isLoadingBalance).toBe(false);
      expect(result.current.isLoadingHistory).toBe(true); // Still loading

      // Resolve history
      act(() => {
        resolveHistory({
          transactions: [{ id: "txn-1", type: "earn", points: 100 }],
          pagination: { page: 1, limit: 10, total: 1 },
        });
      });
      await historyPromise;

      expect(result.current.history).toEqual([
        { id: "txn-1", type: "earn", points: 100 },
      ]);
      expect(result.current.isLoadingHistory).toBe(false);
    });
  });
});
