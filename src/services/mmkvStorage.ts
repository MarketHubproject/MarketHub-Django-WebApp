import { MMKV } from "react-native-mmkv";
import type { PersistedClient } from "@tanstack/query-persist-client-core";
import { logger } from "../utils/logger";

// Initialize MMKV storage instances
export const mmkvStorage = new MMKV({
  id: "app-storage",
  encryptionKey: "markethub-encryption-key-2024", // Use a secure key in production
});

export const mmkvCacheStorage = new MMKV({
  id: "react-query-cache",
  encryptionKey: "markethub-cache-key-2024", // Use a secure key in production
});

// Storage interface for React Query persistence
export const mmkvQueryStorage = {
  getItem: (key: string): string | null => {
    try {
      const value = mmkvCacheStorage.getString(key);
      return value || null;
    } catch (error) {
      logger.error("Failed to get item from MMKV storage", error, {
        component: "MMKVStorage",
        key,
      });
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      mmkvCacheStorage.set(key, value);
    } catch (error) {
      logger.error("Failed to set item in MMKV storage", error, {
        component: "MMKVStorage",
        key,
      });
    }
  },
  removeItem: (key: string): void => {
    try {
      mmkvCacheStorage.delete(key);
    } catch (error) {
      logger.error("Failed to remove item from MMKV storage", error, {
        component: "MMKVStorage",
        key,
      });
    }
  },
};

// Offline storage utilities
export const offlineStorage = {
  // Cart persistence
  saveCart: (cartData: any) => {
    try {
      mmkvStorage.set("offline_cart", JSON.stringify(cartData));
    } catch (error) {
      logger.error("Failed to save cart to offline storage", error);
    }
  },

  getCart: () => {
    try {
      const cartData = mmkvStorage.getString("offline_cart");
      return cartData ? JSON.parse(cartData) : null;
    } catch (error) {
      logger.error("Failed to get cart from offline storage", error);
      return null;
    }
  },

  clearCart: () => {
    try {
      mmkvStorage.delete("offline_cart");
    } catch (error) {
      logger.error("Failed to clear cart from offline storage", error);
    }
  },

  // Favorites persistence
  saveFavorites: (favorites: any[]) => {
    try {
      mmkvStorage.set("offline_favorites", JSON.stringify(favorites));
    } catch (error) {
      logger.error("Failed to save favorites to offline storage", error);
    }
  },

  getFavorites: (): any[] => {
    try {
      const favorites = mmkvStorage.getString("offline_favorites");
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      logger.error("Failed to get favorites from offline storage", error);
      return [];
    }
  },

  // Browsing history persistence
  saveBrowsingHistory: (history: any[]) => {
    try {
      const maxHistoryItems = 100;
      const trimmedHistory = history.slice(0, maxHistoryItems);
      mmkvStorage.set("browsing_history", JSON.stringify(trimmedHistory));
    } catch (error) {
      logger.error("Failed to save browsing history", error);
    }
  },

  getBrowsingHistory: (): any[] => {
    try {
      const history = mmkvStorage.getString("browsing_history");
      return history ? JSON.parse(history) : [];
    } catch (error) {
      logger.error("Failed to get browsing history", error);
      return [];
    }
  },

  addToBrowsingHistory: (item: any) => {
    try {
      const history = offlineStorage.getBrowsingHistory();
      const existingIndex = history.findIndex((h) => h.id === item.id);

      if (existingIndex >= 0) {
        history.splice(existingIndex, 1);
      }

      history.unshift({ ...item, timestamp: Date.now() });
      offlineStorage.saveBrowsingHistory(history);
    } catch (error) {
      logger.error("Failed to add item to browsing history", error);
    }
  },

  // Sync queue for offline actions
  addToSyncQueue: (action: { type: string; data: any; timestamp: number }) => {
    try {
      const queue = offlineStorage.getSyncQueue();
      queue.push(action);
      mmkvStorage.set("sync_queue", JSON.stringify(queue));
    } catch (error) {
      logger.error("Failed to add action to sync queue", error);
    }
  },

  getSyncQueue: (): any[] => {
    try {
      const queue = mmkvStorage.getString("sync_queue");
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      logger.error("Failed to get sync queue", error);
      return [];
    }
  },

  clearSyncQueue: () => {
    try {
      mmkvStorage.delete("sync_queue");
    } catch (error) {
      logger.error("Failed to clear sync queue", error);
    }
  },

  removeSyncQueueItem: (index: number) => {
    try {
      const queue = offlineStorage.getSyncQueue();
      queue.splice(index, 1);
      mmkvStorage.set("sync_queue", JSON.stringify(queue));
    } catch (error) {
      logger.error("Failed to remove sync queue item", error);
    }
  },

  // Settings and preferences
  setAppSetting: (key: string, value: any) => {
    try {
      mmkvStorage.set(`setting_${key}`, JSON.stringify(value));
    } catch (error) {
      logger.error("Failed to save app setting", error, { key });
    }
  },

  getAppSetting: (key: string, defaultValue: any = null) => {
    try {
      const value = mmkvStorage.getString(`setting_${key}`);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      logger.error("Failed to get app setting", error, { key });
      return defaultValue;
    }
  },

  // Clear all offline data
  clearAllOfflineData: () => {
    try {
      mmkvStorage.clearAll();
      mmkvCacheStorage.clearAll();
      logger.info("Cleared all offline data");
    } catch (error) {
      logger.error("Failed to clear all offline data", error);
    }
  },
};

export default mmkvStorage;
