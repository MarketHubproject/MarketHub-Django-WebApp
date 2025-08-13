import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { offlineStorage } from "../services/mmkvStorage";
import { logger } from "../utils/logger";
import backgroundSyncService from "../services/backgroundSyncService";

// Hook for network state
export const useNetworkState = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>("unknown");

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setConnectionType(state.type);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected,
    connectionType,
    isOnline: isConnected,
    isOffline: !isConnected,
  };
};

// Hook for offline-first mutations with queue
export const useOfflineMutation = <TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    mutationKey: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
    onSettled?: (
      data: TData | undefined,
      error: TError | null,
      variables: TVariables
    ) => void;
  }
) => {
  const { isOnline } = useNetworkState();
  const queryClient = useQueryClient();

  const mutation = useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: options.onSuccess,
    onError: (error, variables, context) => {
      // If offline, queue the action for later sync
      if (!isOnline) {
        offlineStorage.addToSyncQueue({
          type: options.mutationKey,
          data: variables,
          timestamp: Date.now(),
        });

        logger.info("Mutation queued for offline sync", {
          mutationKey: options.mutationKey,
          variables,
        });
      }

      options.onError?.(error, variables);
    },
    onSettled: options.onSettled,
  });

  return {
    ...mutation,
    mutateOffline: (variables: TVariables) => {
      if (isOnline) {
        return mutation.mutate(variables);
      } else {
        // Queue for offline sync
        offlineStorage.addToSyncQueue({
          type: options.mutationKey,
          data: variables,
          timestamp: Date.now(),
        });

        // Simulate success for optimistic UI
        const fakeData = {} as TData;
        options.onSuccess?.(fakeData, variables);

        logger.info("Mutation queued for offline execution", {
          mutationKey: options.mutationKey,
        });
      }
    },
  };
};

// Hook for offline cart management
export const useOfflineCart = () => {
  const { isOnline } = useNetworkState();
  const queryClient = useQueryClient();

  const addToCart = (item: { productId: string; quantity: number }) => {
    // Update local cart immediately
    const currentCart = offlineStorage.getCart() || { items: [], total: 0 };
    const existingItemIndex = currentCart.items.findIndex(
      (cartItem: any) => cartItem.productId === item.productId
    );

    if (existingItemIndex >= 0) {
      currentCart.items[existingItemIndex].quantity += item.quantity;
    } else {
      currentCart.items.push(item);
    }

    // Save to offline storage
    offlineStorage.saveCart(currentCart);

    // Queue for sync if offline
    if (!isOnline) {
      offlineStorage.addToSyncQueue({
        type: "ADD_TO_CART",
        data: item,
        timestamp: Date.now(),
      });
    }

    // Invalidate cart queries
    queryClient.invalidateQueries({ queryKey: ["cart"] });

    return currentCart;
  };

  const removeFromCart = (itemId: string) => {
    const currentCart = offlineStorage.getCart() || { items: [], total: 0 };
    currentCart.items = currentCart.items.filter(
      (item: any) => item.id !== itemId
    );

    offlineStorage.saveCart(currentCart);

    if (!isOnline) {
      offlineStorage.addToSyncQueue({
        type: "REMOVE_FROM_CART",
        data: { itemId },
        timestamp: Date.now(),
      });
    }

    queryClient.invalidateQueries({ queryKey: ["cart"] });
    return currentCart;
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    const currentCart = offlineStorage.getCart() || { items: [], total: 0 };
    const itemIndex = currentCart.items.findIndex(
      (item: any) => item.id === itemId
    );

    if (itemIndex >= 0) {
      currentCart.items[itemIndex].quantity = quantity;
      offlineStorage.saveCart(currentCart);

      if (!isOnline) {
        offlineStorage.addToSyncQueue({
          type: "UPDATE_CART_QUANTITY",
          data: { itemId, quantity },
          timestamp: Date.now(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }

    return currentCart;
  };

  const getCart = () => {
    return offlineStorage.getCart();
  };

  const clearCart = () => {
    offlineStorage.clearCart();
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  };

  return {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    getCart,
    clearCart,
    isOnline,
  };
};

// Hook for offline favorites management
export const useOfflineFavorites = () => {
  const { isOnline } = useNetworkState();
  const queryClient = useQueryClient();

  const addToFavorites = (productId: string) => {
    const currentFavorites = offlineStorage.getFavorites();
    const isAlreadyFavorite = currentFavorites.some(
      (fav: any) => fav.id === productId
    );

    if (!isAlreadyFavorite) {
      const newFavorite = { id: productId, timestamp: Date.now() };
      currentFavorites.push(newFavorite);
      offlineStorage.saveFavorites(currentFavorites);

      if (!isOnline) {
        offlineStorage.addToSyncQueue({
          type: "ADD_TO_FAVORITES",
          data: { productId },
          timestamp: Date.now(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    }

    return currentFavorites;
  };

  const removeFromFavorites = (productId: string) => {
    const currentFavorites = offlineStorage.getFavorites();
    const updatedFavorites = currentFavorites.filter(
      (fav: any) => fav.id !== productId
    );

    offlineStorage.saveFavorites(updatedFavorites);

    if (!isOnline) {
      offlineStorage.addToSyncQueue({
        type: "REMOVE_FROM_FAVORITES",
        data: { productId },
        timestamp: Date.now(),
      });
    }

    queryClient.invalidateQueries({ queryKey: ["favorites"] });
    return updatedFavorites;
  };

  const isFavorite = (productId: string) => {
    const favorites = offlineStorage.getFavorites();
    return favorites.some((fav: any) => fav.id === productId);
  };

  const getFavorites = () => {
    return offlineStorage.getFavorites();
  };

  return {
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getFavorites,
    isOnline,
  };
};

// Hook for offline browsing history
export const useOfflineBrowsing = () => {
  const addToBrowsingHistory = (item: {
    id: string;
    name: string;
    image?: string;
    price?: number;
    category?: string;
  }) => {
    offlineStorage.addToBrowsingHistory(item);
  };

  const getBrowsingHistory = () => {
    return offlineStorage.getBrowsingHistory();
  };

  const clearBrowsingHistory = () => {
    offlineStorage.saveBrowsingHistory([]);
  };

  return {
    addToBrowsingHistory,
    getBrowsingHistory,
    clearBrowsingHistory,
  };
};

// Hook for sync status and management
export const useSyncStatus = () => {
  const { isOnline } = useNetworkState();
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateSyncQueue = () => {
      setSyncQueue(offlineStorage.getSyncQueue());
    };

    updateSyncQueue();
    const interval = setInterval(updateSyncQueue, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const forcSync = async () => {
    if (isOnline && !isSyncing) {
      setIsSyncing(true);
      try {
        await backgroundSyncService.scheduleImmediateSync();
        // Wait a bit for sync to complete
        setTimeout(() => {
          setSyncQueue(offlineStorage.getSyncQueue());
          setIsSyncing(false);
        }, 2000);
      } catch (error) {
        logger.error("Manual sync failed", error);
        setIsSyncing(false);
      }
    }
  };

  const clearSyncQueue = () => {
    offlineStorage.clearSyncQueue();
    setSyncQueue([]);
  };

  return {
    syncQueue,
    pendingActions: syncQueue.length,
    isSyncing,
    isOnline,
    canSync: isOnline && syncQueue.length > 0,
    forcSync,
    clearSyncQueue,
  };
};

// Hook for offline-first queries with fallback data
export const useOfflineQuery = <TData>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  options: {
    fallbackData?: TData;
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  } = {}
) => {
  const { isOnline } = useNetworkState();

  const query = useQuery<TData>({
    queryKey,
    queryFn,
    staleTime: options.staleTime || 1000 * 60 * 5, // 5 minutes
    gcTime: options.gcTime || 1000 * 60 * 30, // 30 minutes
    enabled: options.enabled !== false,
    networkMode: "offlineFirst",
    placeholderData: options.fallbackData,
  });

  return {
    ...query,
    isOnline,
    isOffline: !isOnline,
    hasOfflineData: !!query.data && !isOnline,
  };
};

// Hook for device storage management
export const useStorageInfo = () => {
  const [storageInfo, setStorageInfo] = useState({
    cacheSize: 0,
    offlineDataSize: 0,
    totalSize: 0,
  });

  useEffect(() => {
    // Calculate storage sizes (simplified)
    // In a real app, you'd use native modules for accurate storage info
    const calculateStorageInfo = () => {
      try {
        // This is a simplified calculation
        const favorites = offlineStorage.getFavorites();
        const cart = offlineStorage.getCart();
        const history = offlineStorage.getBrowsingHistory();
        const syncQueue = offlineStorage.getSyncQueue();

        const estimatedSize =
          JSON.stringify(favorites).length * 2 +
          JSON.stringify(cart).length * 2 +
          JSON.stringify(history).length * 2 +
          JSON.stringify(syncQueue).length * 2;

        setStorageInfo({
          cacheSize: estimatedSize * 0.6,
          offlineDataSize: estimatedSize * 0.4,
          totalSize: estimatedSize,
        });
      } catch (error) {
        logger.error("Failed to calculate storage info", error);
      }
    };

    calculateStorageInfo();
    const interval = setInterval(calculateStorageInfo, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const clearAllOfflineData = () => {
    offlineStorage.clearAllOfflineData();
    setStorageInfo({ cacheSize: 0, offlineDataSize: 0, totalSize: 0 });
  };

  return {
    ...storageInfo,
    clearAllOfflineData,
  };
};

export default {
  useNetworkState,
  useOfflineMutation,
  useOfflineCart,
  useOfflineFavorites,
  useOfflineBrowsing,
  useSyncStatus,
  useOfflineQuery,
  useStorageInfo,
};
