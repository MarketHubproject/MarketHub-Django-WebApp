import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";

// User interface (same as before but in shared types)
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  preferences: {
    notifications: boolean;
    emailMarketing: boolean;
    currency: string;
    language: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  clearAuth: () => void;
}

// AsyncStorage adapter for Zustand persist
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

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,

        // Actions
        setUser: (user) => {
          set({ user, isAuthenticated: true }, false, "setUser");
        },

        setTokens: (token, refreshToken) => {
          set({ token, refreshToken }, false, "setTokens");
        },

        setLoading: (isLoading) => {
          set({ isLoading }, false, "setLoading");
        },

        updateUser: (updates) => {
          const currentUser = get().user;
          if (currentUser) {
            set(
              {
                user: {
                  ...currentUser,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                },
              },
              false,
              "updateUser"
            );
          }
        },

        login: (user, token, refreshToken) => {
          set(
            {
              user,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            "login"
          );
        },

        logout: () => {
          set(
            {
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            },
            false,
            "logout"
          );
        },

        clearAuth: () => {
          set(
            {
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            },
            false,
            "clearAuth"
          );
        },
      }),
      {
        name: "auth-store",
        storage: asyncStorageAdapter,
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
          // Don't persist loading state
        }),
      }
    ),
    {
      name: "auth-store",
    }
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useToken = () => useAuthStore((state) => state.token);

export default useAuthStore;
