import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { logger } from "../../utils";
import { mmkvQueryStorage } from "../../services/mmkvStorage";
import NetInfo from "@react-native-community/netinfo";

// Network state
let isOnline = true;

// Initialize network listener
NetInfo.addEventListener((state) => {
  isOnline = state.isConnected ?? false;
  if (isOnline) {
    // Resume paused mutations when back online
    queryClient.resumePausedMutations();
  }
});

// Query client configuration with offline support
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: data considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache time: data kept in cache for 30 minutes for offline support
      gcTime: 1000 * 60 * 30,
      // Retry failed requests with network awareness
      retry: (failureCount, error: any) => {
        // Don't retry if offline
        if (!isOnline) return false;
        // Retry up to 3 times for network errors
        if (error?.code === "NETWORK_ERROR" && failureCount < 3) return true;
        // Don't retry for 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return [408, 429].includes(error.response.status) && failureCount < 2;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for important data
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Enable background refetch for better UX
      refetchInterval: false,
      // Enable network mode for offline support
      networkMode: "offlineFirst",
    },
    mutations: {
      // Retry failed mutations once when online
      retry: (failureCount, error: any) => {
        if (!isOnline) return false;
        return failureCount < 1;
      },
      // Pause mutations when offline
      networkMode: "offlineFirst",
      // Log mutation errors
      onError: (error: any, variables, context) => {
        logger.error("Mutation failed", error, {
          component: "QueryClient",
          action: "mutation",
          isOnline,
          variables,
          context,
        });
      },
    },
  },
});

// Set up persistence
let persistor: any;

export const initializeQueryPersistence = async () => {
  try {
    persistor = persistQueryClient({
      queryClient,
      persister: {
        persistClient: async (client) => {
          try {
            mmkvQueryStorage.setItem(
              "react-query-client",
              JSON.stringify(client)
            );
          } catch (error) {
            logger.error("Failed to persist query client", error);
          }
        },
        restoreClient: async () => {
          try {
            const clientData = mmkvQueryStorage.getItem("react-query-client");
            return clientData ? JSON.parse(clientData) : undefined;
          } catch (error) {
            logger.error("Failed to restore query client", error);
            return undefined;
          }
        },
        removeClient: async () => {
          try {
            mmkvQueryStorage.removeItem("react-query-client");
          } catch (error) {
            logger.error("Failed to remove persisted client", error);
          }
        },
      },
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      hydrateOptions: {
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours for hydrated data
          },
        },
      },
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist important queries
          const queryKey = query.queryKey[0] as string;
          const persistableKeys = [
            "products",
            "categories",
            "cart",
            "favorites",
            "auth",
            "profile",
            "recommendations",
          ];
          return (
            persistableKeys.includes(queryKey) &&
            query.state.status === "success"
          );
        },
      },
    });

    logger.info("Query client persistence initialized");
  } catch (error) {
    logger.error("Failed to initialize query persistence", error);
  }
};

// Utility to check online status
export const getIsOnline = () => isOnline;

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth
  auth: {
    user: () => ["auth", "user"] as const,
    profile: () => ["auth", "profile"] as const,
  },
  // Products
  products: {
    all: () => ["products"] as const,
    lists: () => ["products", "list"] as const,
    list: (filters: Record<string, any>) =>
      ["products", "list", filters] as const,
    details: () => ["products", "detail"] as const,
    detail: (id: number | string) => ["products", "detail", id] as const,
    featured: () => ["products", "featured"] as const,
    categories: () => ["products", "categories"] as const,
    search: (query: string) => ["products", "search", query] as const,
  },
  // Cart
  cart: {
    items: () => ["cart", "items"] as const,
    count: () => ["cart", "count"] as const,
  },
  // Favorites
  favorites: {
    all: () => ["favorites"] as const,
    list: () => ["favorites", "list"] as const,
    status: (productId: number | string) =>
      ["favorites", "status", productId] as const,
  },
  // Orders
  orders: {
    all: () => ["orders"] as const,
    list: () => ["orders", "list"] as const,
    detail: (id: number | string) => ["orders", "detail", id] as const,
    history: () => ["orders", "history"] as const,
  },
  // Profile
  profile: {
    addresses: () => ["profile", "addresses"] as const,
    paymentMethods: () => ["profile", "paymentMethods"] as const,
    preferences: () => ["profile", "preferences"] as const,
  },
  // Recommendations
  recommendations: {
    all: () => ["recommendations"] as const,
    forUser: (userId?: string | number) =>
      ["recommendations", "user", userId] as const,
    context: (context: string, userId?: string | number) =>
      ["recommendations", "context", context, userId] as const,
    similar: (productId: number | string, userId?: string | number) =>
      ["recommendations", "similar", productId, userId] as const,
  },
} as const;

// Mutation keys for consistency
export const mutationKeys = {
  auth: {
    login: "auth.login",
    logout: "auth.logout",
    register: "auth.register",
    updateProfile: "auth.updateProfile",
  },
  products: {
    toggleFavorite: "products.toggleFavorite",
  },
  cart: {
    add: "cart.add",
    update: "cart.update",
    remove: "cart.remove",
    clear: "cart.clear",
  },
  orders: {
    create: "orders.create",
    cancel: "orders.cancel",
  },
  profile: {
    addAddress: "profile.addAddress",
    updateAddress: "profile.updateAddress",
    deleteAddress: "profile.deleteAddress",
    addPaymentMethod: "profile.addPaymentMethod",
    updatePaymentMethod: "profile.updatePaymentMethod",
    deletePaymentMethod: "profile.deletePaymentMethod",
  },
} as const;

// Helper function to invalidate related queries
export const invalidateQueries = {
  auth: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
  },
  products: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
  },
  cart: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.items() });
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.count() });
  },
  favorites: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all() });
  },
  orders: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
  },
  profile: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.addresses() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.profile.paymentMethods(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.profile.preferences(),
    });
  },
};

export default queryClient;
