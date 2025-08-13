import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  queryKeys,
  mutationKeys,
  invalidateQueries,
  queryClient,
} from "../../../shared/api/queryClient";
import { useAuthStore, User } from "../../../shared/stores/authStore";
import ApiService from "../../../services";
import { logger } from "../../../utils";
import { LoginForm, SignupForm } from "../../../shared/types";

// Auth API functions
const authApi = {
  login: async (
    credentials: LoginForm
  ): Promise<{ user: User; token: string; refreshToken: string }> => {
    const response = await ApiService.login(
      credentials.email,
      credentials.password
    );
    return {
      user: response.user,
      token: response.token,
      refreshToken: response.refresh_token || response.token, // Fallback if no refresh token
    };
  },

  register: async (
    userData: SignupForm
  ): Promise<{ user: User; token: string; refreshToken: string }> => {
    const response = await ApiService.signup(userData);
    return {
      user: response.user,
      token: response.token,
      refreshToken: response.refresh_token || response.token,
    };
  },

  logout: async (): Promise<void> => {
    await ApiService.logout();
  },

  refreshToken: async (
    refreshToken: string
  ): Promise<{ token: string; refreshToken: string }> => {
    // This would be implemented when the API supports refresh tokens
    throw new Error("Refresh token not implemented");
  },

  getCurrentUser: async (): Promise<User> => {
    // This would fetch current user data from the API
    const response = await ApiService.getUser();
    return response;
  },
};

// Hook for login mutation
export const useLogin = () => {
  const authStore = useAuthStore();

  return useMutation({
    mutationKey: [mutationKeys.auth.login],
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Update Zustand store
      authStore.login(data.user, data.token, data.refreshToken);

      // Invalidate and refetch user-related queries
      invalidateQueries.auth();

      logger.info("User logged in successfully", {
        component: "useLogin",
        action: "login",
        metadata: { userId: data.user.id, email: data.user.email },
      });
    },
    onError: (error) => {
      authStore.setLoading(false);
      logger.error("Login failed", error, {
        component: "useLogin",
        action: "login",
      });
    },
    onMutate: () => {
      authStore.setLoading(true);
    },
  });
};

// Hook for signup mutation
export const useSignup = () => {
  const authStore = useAuthStore();

  return useMutation({
    mutationKey: [mutationKeys.auth.register],
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Update Zustand store
      authStore.login(data.user, data.token, data.refreshToken);

      // Invalidate and refetch user-related queries
      invalidateQueries.auth();

      logger.info("User registered successfully", {
        component: "useSignup",
        action: "register",
        metadata: { userId: data.user.id, email: data.user.email },
      });
    },
    onError: (error) => {
      authStore.setLoading(false);
      logger.error("Registration failed", error, {
        component: "useSignup",
        action: "register",
      });
    },
    onMutate: () => {
      authStore.setLoading(true);
    },
  });
};

// Hook for logout mutation
export const useLogout = () => {
  const authStore = useAuthStore();

  return useMutation({
    mutationKey: [mutationKeys.auth.logout],
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear Zustand store
      authStore.logout();

      // Clear all queries
      queryClient.clear();

      logger.info("User logged out successfully", {
        component: "useLogout",
        action: "logout",
      });
    },
    onError: (error) => {
      // Even if logout API call fails, clear local state
      authStore.logout();
      queryClient.clear();

      logger.error("Logout API call failed, but cleared local state", error, {
        component: "useLogout",
        action: "logout",
      });
    },
  });
};

// Hook for getting current user (from server)
export const useCurrentUser = (options?: UseQueryOptions<User>) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized
      if (error?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
    ...options,
  });
};

// Hook for updating user profile
export const useUpdateProfile = () => {
  const authStore = useAuthStore();

  return useMutation({
    mutationKey: [mutationKeys.auth.updateProfile],
    mutationFn: async (updates: Partial<User>) => {
      // This would call the API to update user profile
      // For now, we'll simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return updates;
    },
    onSuccess: (updates) => {
      // Update Zustand store
      authStore.updateUser(updates);

      // Invalidate user queries
      invalidateQueries.auth();

      logger.info("Profile updated successfully", {
        component: "useUpdateProfile",
        action: "updateProfile",
        metadata: { updates },
      });
    },
    onError: (error) => {
      logger.error("Profile update failed", error, {
        component: "useUpdateProfile",
        action: "updateProfile",
      });
    },
  });
};

// Hook for token refresh
export const useRefreshToken = () => {
  const authStore = useAuthStore();

  return useMutation({
    mutationKey: ["auth.refreshToken"],
    mutationFn: (refreshToken: string) => authApi.refreshToken(refreshToken),
    onSuccess: (data) => {
      authStore.setTokens(data.token, data.refreshToken);

      logger.info("Token refreshed successfully", {
        component: "useRefreshToken",
        action: "refreshToken",
      });
    },
    onError: (error) => {
      // If refresh fails, logout user
      authStore.logout();
      queryClient.clear();

      logger.error("Token refresh failed, logging out user", error, {
        component: "useRefreshToken",
        action: "refreshToken",
      });
    },
  });
};

// Custom hook that combines Zustand selectors with useful auth functions
export const useAuth = () => {
  const authStore = useAuthStore();
  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const logoutMutation = useLogout();
  const updateProfileMutation = useUpdateProfile();

  return {
    // State from Zustand
    user: authStore.user,
    token: authStore.token,
    refreshToken: authStore.refreshToken,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,

    // Actions from mutations
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutate,

    // Mutation states
    isLoginLoading: loginMutation.isPending,
    isSignupLoading: signupMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isUpdateProfileLoading: updateProfileMutation.isPending,

    loginError: loginMutation.error,
    signupError: signupMutation.error,
    logoutError: logoutMutation.error,
    updateProfileError: updateProfileMutation.error,

    // Utility functions
    clearAuth: authStore.clearAuth,
    setLoading: authStore.setLoading,
  };
};

// Hook for checking if user has specific permissions/roles
export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const isAdmin = (): boolean => {
    return hasRole("admin");
  };

  const isModerator = (): boolean => {
    return hasRole("moderator");
  };

  return {
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    user,
  };
};

// Hook for auth status monitoring
export const useAuthStatus = () => {
  const { isAuthenticated, token, user } = useAuthStore();

  const isTokenExpired = (): boolean => {
    if (!token) return true;

    // This would check if the JWT token is expired
    // For now, we'll return false
    return false;
  };

  const needsRefresh = (): boolean => {
    return isAuthenticated && isTokenExpired();
  };

  return {
    isAuthenticated,
    isTokenExpired: isTokenExpired(),
    needsRefresh: needsRefresh(),
    hasUser: !!user,
    hasToken: !!token,
  };
};
