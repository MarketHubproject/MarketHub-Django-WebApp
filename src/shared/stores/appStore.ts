import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";

// App settings and preferences
export interface AppPreferences {
  theme: "light" | "dark" | "auto";
  language: "en" | "fr" | "es" | "zh";
  currency: string;
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    marketing: boolean;
  };
  accessibility: {
    fontSize: "small" | "medium" | "large";
    highContrast: boolean;
    reduceMotion: boolean;
  };
}

// Import loyalty types from rewards module
import type { LoyaltyTier, PointsBalance } from "../types/rewards";

// Loyalty program (simplified version for app store)
export interface LoyaltyProgram {
  points: number;
  tier: LoyaltyTier;
  nextTierPoints?: number;
  expiryDate?: string;
  earnedThisMonth: number;
  redeemedThisMonth: number;
}

// App-level notifications
export interface AppNotification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface AppState {
  // State
  preferences: AppPreferences;
  loyaltyProgram: LoyaltyProgram | null;
  notifications: AppNotification[];
  isOnline: boolean;
  lastSyncTime: string | null;
  appVersion: string;
  buildNumber: string;

  // Actions
  updatePreferences: (preferences: Partial<AppPreferences>) => void;
  setLoyaltyProgram: (loyalty: LoyaltyProgram) => void;
  updateLoyaltyPoints: (points: number) => void;
  addNotification: (
    notification: Omit<AppNotification, "id" | "timestamp" | "read">
  ) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  updateSyncTime: () => void;
  setAppInfo: (version: string, buildNumber: string) => void;
  resetApp: () => void;
}

// Default preferences
const defaultPreferences: AppPreferences = {
  theme: "auto",
  language: "en",
  currency: "USD",
  notifications: {
    push: true,
    email: true,
    sms: false,
    marketing: false,
  },
  accessibility: {
    fontSize: "medium",
    highContrast: false,
    reduceMotion: false,
  },
};

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

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        preferences: defaultPreferences,
        loyaltyProgram: null,
        notifications: [],
        isOnline: true,
        lastSyncTime: null,
        appVersion: "1.0.0",
        buildNumber: "1",

        // Actions
        updatePreferences: (newPreferences) => {
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                ...newPreferences,
              },
            }),
            false,
            "updatePreferences"
          );
        },

        setLoyaltyProgram: (loyalty) => {
          set({ loyaltyProgram: loyalty }, false, "setLoyaltyProgram");
        },

        updateLoyaltyPoints: (points) => {
          set(
            (state) => ({
              loyaltyProgram: state.loyaltyProgram
                ? { ...state.loyaltyProgram, points }
                : null,
            }),
            false,
            "updateLoyaltyPoints"
          );
        },

        addNotification: (notification) => {
          const newNotification: AppNotification = {
            ...notification,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            read: false,
          };

          set(
            (state) => ({
              notifications: [newNotification, ...state.notifications].slice(
                0,
                50
              ), // Keep only last 50 notifications
            }),
            false,
            "addNotification"
          );
        },

        markNotificationAsRead: (id) => {
          set(
            (state) => ({
              notifications: state.notifications.map((notification) =>
                notification.id === id
                  ? { ...notification, read: true }
                  : notification
              ),
            }),
            false,
            "markNotificationAsRead"
          );
        },

        clearNotification: (id) => {
          set(
            (state) => ({
              notifications: state.notifications.filter(
                (notification) => notification.id !== id
              ),
            }),
            false,
            "clearNotification"
          );
        },

        clearAllNotifications: () => {
          set({ notifications: [] }, false, "clearAllNotifications");
        },

        setOnlineStatus: (isOnline) => {
          set({ isOnline }, false, "setOnlineStatus");
        },

        updateSyncTime: () => {
          set(
            { lastSyncTime: new Date().toISOString() },
            false,
            "updateSyncTime"
          );
        },

        setAppInfo: (version, buildNumber) => {
          set({ appVersion: version, buildNumber }, false, "setAppInfo");
        },

        resetApp: () => {
          set(
            {
              preferences: defaultPreferences,
              loyaltyProgram: null,
              notifications: [],
              lastSyncTime: null,
            },
            false,
            "resetApp"
          );
        },
      }),
      {
        name: "app-store",
        storage: asyncStorageAdapter,
        partialize: (state) => ({
          preferences: state.preferences,
          loyaltyProgram: state.loyaltyProgram,
          notifications: state.notifications,
          lastSyncTime: state.lastSyncTime,
          appVersion: state.appVersion,
          buildNumber: state.buildNumber,
          // Don't persist isOnline
        }),
      }
    ),
    {
      name: "app-store",
    }
  )
);

// Selectors for better performance
export const usePreferences = () => useAppStore((state) => state.preferences);
export const useLoyaltyProgram = () =>
  useAppStore((state) => state.loyaltyProgram);
export const useNotifications = () =>
  useAppStore((state) => state.notifications);
export const useUnreadNotificationCount = () =>
  useAppStore((state) => state.notifications.filter((n) => !n.read).length);
export const useOnlineStatus = () => useAppStore((state) => state.isOnline);
export const useTheme = () => useAppStore((state) => state.preferences.theme);
export const useLanguage = () =>
  useAppStore((state) => state.preferences.language);

export default useAppStore;
