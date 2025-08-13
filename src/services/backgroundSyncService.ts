import BackgroundFetch from "react-native-background-fetch";
import { logger } from "../utils/logger";
import { offlineStorage } from "./mmkvStorage";
import { queryClient, getIsOnline } from "../shared/api/queryClient";
import { API_ENDPOINTS } from "../shared/api/config";
import axios from "axios";

// Background sync configuration
const BACKGROUND_SYNC_CONFIG = {
  minimumFetchInterval: 15000, // 15 seconds
  stopOnTerminate: false,
  startOnBoot: true,
  enableHeadless: true,
  requiredNetworkType: "CONNECTED",
  requiresCharging: false,
  requiresDeviceIdle: false,
};

class BackgroundSyncService {
  private isInitialized = false;
  private syncInProgress = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await BackgroundFetch.configure(
        BACKGROUND_SYNC_CONFIG,
        this.performBackgroundSync.bind(this),
        (error) => {
          logger.error("Background fetch failed to start", error, {
            component: "BackgroundSyncService",
          });
        }
      );

      this.isInitialized = true;
      logger.info("Background sync service initialized");
    } catch (error) {
      logger.error("Failed to initialize background sync", error, {
        component: "BackgroundSyncService",
      });
    }
  }

  private async performBackgroundSync(taskId: string) {
    logger.info("Background sync started", { taskId });

    try {
      if (this.syncInProgress) {
        logger.info("Sync already in progress, skipping", { taskId });
        BackgroundFetch.finish(taskId);
        return;
      }

      this.syncInProgress = true;

      // Check if we're online
      if (!getIsOnline()) {
        logger.info("Device offline, skipping background sync", { taskId });
        BackgroundFetch.finish(taskId);
        this.syncInProgress = false;
        return;
      }

      // Perform various sync operations
      await Promise.allSettled([
        this.syncOfflineActions(),
        this.refreshCriticalData(),
        this.syncCart(),
        this.syncFavorites(),
        this.cleanupOldData(),
      ]);

      logger.info("Background sync completed successfully", { taskId });
    } catch (error) {
      logger.error("Background sync failed", error, {
        component: "BackgroundSyncService",
        taskId,
      });
    } finally {
      this.syncInProgress = false;
      BackgroundFetch.finish(taskId);
    }
  }

  private async syncOfflineActions() {
    try {
      const syncQueue = offlineStorage.getSyncQueue();
      if (syncQueue.length === 0) return;

      logger.info("Syncing offline actions", { count: syncQueue.length });

      for (let i = syncQueue.length - 1; i >= 0; i--) {
        const action = syncQueue[i];

        try {
          await this.processOfflineAction(action);
          offlineStorage.removeSyncQueueItem(i);
          logger.info("Synced offline action", { type: action.type });
        } catch (error) {
          logger.error("Failed to sync offline action", error, {
            action: action.type,
            timestamp: action.timestamp,
          });

          // Remove old failed actions (older than 7 days)
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (action.timestamp < weekAgo) {
            offlineStorage.removeSyncQueueItem(i);
            logger.info("Removed old failed action", { type: action.type });
          }
        }
      }
    } catch (error) {
      logger.error("Failed to sync offline actions", error);
    }
  }

  private async processOfflineAction(action: {
    type: string;
    data: any;
    timestamp: number;
  }) {
    switch (action.type) {
      case "ADD_TO_CART":
        await axios.post(`${API_ENDPOINTS.CART}/add`, action.data);
        break;
      case "REMOVE_FROM_CART":
        await axios.delete(`${API_ENDPOINTS.CART}/item/${action.data.itemId}`);
        break;
      case "UPDATE_CART_QUANTITY":
        await axios.put(`${API_ENDPOINTS.CART}/item/${action.data.itemId}`, {
          quantity: action.data.quantity,
        });
        break;
      case "ADD_TO_FAVORITES":
        await axios.post(`${API_ENDPOINTS.FAVORITES}/add`, {
          productId: action.data.productId,
        });
        break;
      case "REMOVE_FROM_FAVORITES":
        await axios.delete(
          `${API_ENDPOINTS.FAVORITES}/${action.data.productId}`
        );
        break;
      case "UPDATE_PROFILE":
        await axios.put(`${API_ENDPOINTS.PROFILE}`, action.data);
        break;
      default:
        logger.warn("Unknown offline action type", { type: action.type });
    }
  }

  private async refreshCriticalData() {
    try {
      // Invalidate and refetch critical data
      await queryClient.invalidateQueries({
        queryKey: ["products", "featured"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["cart"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["favorites"],
      });

      logger.info("Refreshed critical data in background");
    } catch (error) {
      logger.error("Failed to refresh critical data", error);
    }
  }

  private async syncCart() {
    try {
      const offlineCart = offlineStorage.getCart();
      if (!offlineCart) return;

      // Try to sync local cart changes with server
      const response = await axios.get(`${API_ENDPOINTS.CART}`);
      const serverCart = response.data;

      // Compare and sync differences
      if (JSON.stringify(offlineCart) !== JSON.stringify(serverCart)) {
        logger.info("Cart sync needed", {
          localItems: offlineCart.items?.length || 0,
          serverItems: serverCart.items?.length || 0,
        });

        // Invalidate cart queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
    } catch (error) {
      logger.error("Failed to sync cart", error);
    }
  }

  private async syncFavorites() {
    try {
      const localFavorites = offlineStorage.getFavorites();
      if (localFavorites.length === 0) return;

      const response = await axios.get(`${API_ENDPOINTS.FAVORITES}`);
      const serverFavorites = response.data;

      // Compare and sync differences
      const localIds = new Set(localFavorites.map((f) => f.id));
      const serverIds = new Set(serverFavorites.map((f) => f.id));

      const hasChanges =
        localIds.size !== serverIds.size ||
        [...localIds].some((id) => !serverIds.has(id));

      if (hasChanges) {
        logger.info("Favorites sync needed");
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
      }
    } catch (error) {
      logger.error("Failed to sync favorites", error);
    }
  }

  private async cleanupOldData() {
    try {
      // Clean up old browsing history
      const history = offlineStorage.getBrowsingHistory();
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const cleanHistory = history.filter(
        (item) => item.timestamp && item.timestamp > weekAgo
      );

      if (cleanHistory.length !== history.length) {
        offlineStorage.saveBrowsingHistory(cleanHistory);
        logger.info("Cleaned up old browsing history", {
          before: history.length,
          after: cleanHistory.length,
        });
      }

      // Clean up old cached queries
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => {
          const dataUpdatedAt = query.state.dataUpdatedAt;
          if (
            dataUpdatedAt &&
            Date.now() - dataUpdatedAt > 24 * 60 * 60 * 1000
          ) {
            // Remove queries older than 24 hours that are not critical
            const queryKey = query.queryKey[0] as string;
            const criticalKeys = ["cart", "favorites", "auth", "profile"];

            if (!criticalKeys.includes(queryKey)) {
              queryClient.removeQueries({ queryKey: query.queryKey });
            }
          }
        });

      logger.info("Cleaned up old cached data");
    } catch (error) {
      logger.error("Failed to cleanup old data", error);
    }
  }

  async scheduleImmediateSync() {
    if (!this.isInitialized) return;

    try {
      await BackgroundFetch.start();
      logger.info("Immediate background sync scheduled");
    } catch (error) {
      logger.error("Failed to schedule immediate sync", error);
    }
  }

  async stop() {
    if (!this.isInitialized) return;

    try {
      await BackgroundFetch.stop();
      this.isInitialized = false;
      logger.info("Background sync service stopped");
    } catch (error) {
      logger.error("Failed to stop background sync", error);
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
    };
  }
}

export const backgroundSyncService = new BackgroundSyncService();
export default backgroundSyncService;
