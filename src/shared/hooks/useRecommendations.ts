import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RecommendationsResponse, RecommendationSection } from "../types";
import { queryKeys } from "../api/queryClient";
import apiService from "../../services/api";
import { logger } from "../../utils";

interface UseRecommendationsOptions {
  enabled?: boolean;
  context?: string;
  refreshInterval?: number;
}

/**
 * Hook for fetching personalized recommendations with offline caching
 */
export const useRecommendations = (
  userId?: string | number,
  options: UseRecommendationsOptions = {}
) => {
  const queryClient = useQueryClient();
  const { enabled = true, context = "general", refreshInterval } = options;

  // Main recommendations query
  const {
    data: recommendations,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.recommendations.forUser(userId),
    queryFn: async (): Promise<RecommendationsResponse> => {
      try {
        // Try to get current user ID if not provided
        const currentUserId = userId || (await apiService.getCurrentUserId());

        // Fetch recommendations from API
        const response = await apiService.getRecommendations(currentUserId);

        // Cache offline for fast load
        const cacheKey = `recommendations_${currentUserId || "anonymous"}`;
        try {
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: response,
              timestamp: new Date().toISOString(),
              userId: currentUserId,
            })
          );
        } catch (cacheError) {
          logger.warn("Failed to cache recommendations offline", cacheError, {
            component: "useRecommendations",
            userId: currentUserId,
          });
        }

        return response;
      } catch (error) {
        // Fallback to cached data if API fails
        const currentUserId = userId || (await apiService.getCurrentUserId());
        const cacheKey = `recommendations_${currentUserId || "anonymous"}`;

        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();

            // Use cached data if it's less than 1 hour old
            if (cacheAge < 60 * 60 * 1000) {
              logger.info("Using cached recommendations due to API failure", {
                component: "useRecommendations",
                cacheAge: Math.round(cacheAge / 1000 / 60),
                userId: currentUserId,
              });
              return parsed.data;
            }
          }
        } catch (cacheError) {
          logger.warn("Failed to load cached recommendations", cacheError, {
            component: "useRecommendations",
            userId: currentUserId,
          });
        }

        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: refreshInterval,
    retry: (failureCount, error: any) => {
      // Don't retry if it's a client error
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Mutation for logging product impressions
  const logImpressionMutation = useMutation({
    mutationFn: async ({
      productId,
      context: eventContext = context,
    }: {
      productId: number | string;
      context?: string;
    }) => {
      const currentUserId = userId || (await apiService.getCurrentUserId());
      await apiService.logProductImpression(
        productId,
        currentUserId,
        eventContext
      );
    },
    onError: (error) => {
      logger.warn("Failed to log product impression", error, {
        component: "useRecommendations",
        action: "logImpression",
      });
    },
  });

  // Mutation for logging product clicks
  const logClickMutation = useMutation({
    mutationFn: async ({
      productId,
      context: eventContext = context,
    }: {
      productId: number | string;
      context?: string;
    }) => {
      const currentUserId = userId || (await apiService.getCurrentUserId());
      await apiService.logProductClick(productId, currentUserId, eventContext);
    },
    onError: (error) => {
      logger.warn("Failed to log product click", error, {
        component: "useRecommendations",
        action: "logClick",
      });
    },
  });

  // Helper functions
  const logImpression = (productId: number | string, eventContext?: string) => {
    logImpressionMutation.mutate({ productId, context: eventContext });
  };

  const logClick = (productId: number | string, eventContext?: string) => {
    logClickMutation.mutate({ productId, context: eventContext });
  };

  const getSectionByType = (
    type: RecommendationSection["type"]
  ): RecommendationSection | undefined => {
    return recommendations?.sections.find((section) => section.type === type);
  };

  const getPersonalRecommendations = () => getSectionByType("personal");
  const getTrendingRecommendations = () => getSectionByType("trending");
  const getSimilarRecommendations = () => getSectionByType("similar");

  // Prefetch recommendations for better UX
  const prefetchRecommendations = (prefetchUserId?: string | number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.recommendations.forUser(prefetchUserId || userId),
      queryFn: async () => {
        const currentUserId =
          prefetchUserId || userId || (await apiService.getCurrentUserId());
        return apiService.getRecommendations(currentUserId);
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    // Data
    recommendations,
    sections: recommendations?.sections || [],

    // Loading states
    isLoading,
    isRefetching,
    error,

    // Actions
    refetch,
    logImpression,
    logClick,
    prefetchRecommendations,

    // Helpers
    getSectionByType,
    getPersonalRecommendations,
    getTrendingRecommendations,
    getSimilarRecommendations,

    // Metadata
    fallbackUsed: recommendations?.fallbackUsed || false,
    lastUpdated: recommendations?.timestamp,
  };
};

export default useRecommendations;
