import { renderHook, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createMockQueryClient } from "@testing/utils/testUtils";
import * as authApi from "@/features/auth/api/authApi";

// Mock the auth API
jest.mock("@/features/auth/api/authApi");
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Create wrapper component
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAuth", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createMockQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("login", () => {
    it("should successfully login user", async () => {
      const mockUser = generateMockUser({ id: "1", email: "test@test.com" });
      const mockToken = "mock-token";

      mockAuthApi.login.mockResolvedValueOnce({
        user: mockUser,
        token: mockToken,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.login({
          email: "test@test.com",
          password: "password123",
        });
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle login error", async () => {
      const error = new Error("Invalid credentials");
      mockAuthApi.login.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login({
            email: "test@test.com",
            password: "wrong-password",
          });
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toEqual(error);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it("should set loading state during login", async () => {
      mockAuthApi.login.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.login({
          email: "test@test.com",
          password: "password123",
        });
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("logout", () => {
    it("should successfully logout user", async () => {
      mockAuthApi.logout.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      // First login
      const mockUser = generateMockUser();
      mockAuthApi.login.mockResolvedValueOnce({
        user: mockUser,
        token: "token",
      });

      await act(async () => {
        await result.current.login({
          email: "test@test.com",
          password: "password123",
        });
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should handle logout error gracefully", async () => {
      const error = new Error("Logout failed");
      mockAuthApi.logout.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.logout();
        } catch (err) {
          expect(err).toEqual(error);
        }
      });
    });
  });

  describe("register", () => {
    it("should successfully register user", async () => {
      const mockUser = generateMockUser({
        email: "newuser@test.com",
        firstName: "New",
        lastName: "User",
      });

      mockAuthApi.register.mockResolvedValueOnce({
        user: mockUser,
        token: "new-token",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.register({
          email: "newuser@test.com",
          password: "password123",
          firstName: "New",
          lastName: "User",
        });
      });

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: "newuser@test.com",
        password: "password123",
        firstName: "New",
        lastName: "User",
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle registration error", async () => {
      const error = new Error("Email already exists");
      mockAuthApi.register.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.register({
            email: "existing@test.com",
            password: "password123",
            firstName: "Test",
            lastName: "User",
          });
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toEqual(error);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("updateProfile", () => {
    it("should successfully update user profile", async () => {
      const originalUser = generateMockUser({
        firstName: "John",
        lastName: "Doe",
      });
      const updatedUser = generateMockUser({
        firstName: "Jane",
        lastName: "Smith",
      });

      mockAuthApi.login.mockResolvedValueOnce({
        user: originalUser,
        token: "token",
      });

      mockAuthApi.updateProfile.mockResolvedValueOnce(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      // First login
      await act(async () => {
        await result.current.login({
          email: "test@test.com",
          password: "password123",
        });
      });

      // Then update profile
      await act(async () => {
        await result.current.updateProfile({
          firstName: "Jane",
          lastName: "Smith",
        });
      });

      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
      });
      expect(result.current.user).toEqual(updatedUser);
    });
  });

  describe("changePassword", () => {
    it("should successfully change password", async () => {
      mockAuthApi.changePassword.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.changePassword({
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
        });
      });

      expect(mockAuthApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      });
    });

    it("should handle change password error", async () => {
      const error = new Error("Current password is incorrect");
      mockAuthApi.changePassword.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.changePassword({
            currentPassword: "wrongpassword",
            newPassword: "newpassword123",
          });
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toEqual(error);
    });
  });

  describe("forgotPassword", () => {
    it("should successfully send password reset email", async () => {
      mockAuthApi.forgotPassword.mockResolvedValueOnce({
        message: "Password reset email sent",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      const response = await act(async () => {
        return await result.current.forgotPassword("test@test.com");
      });

      expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith("test@test.com");
      expect(response.message).toBe("Password reset email sent");
    });
  });

  describe("resetPassword", () => {
    it("should successfully reset password with token", async () => {
      mockAuthApi.resetPassword.mockResolvedValueOnce({
        message: "Password reset successful",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      const response = await act(async () => {
        return await result.current.resetPassword({
          token: "reset-token",
          newPassword: "newpassword123",
        });
      });

      expect(mockAuthApi.resetPassword).toHaveBeenCalledWith({
        token: "reset-token",
        newPassword: "newpassword123",
      });
      expect(response.message).toBe("Password reset successful");
    });
  });

  describe("state management", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle concurrent requests properly", async () => {
      const mockUser1 = generateMockUser({ id: "1" });
      const mockUser2 = generateMockUser({ id: "2" });

      let resolveLogin1: any;
      let resolveLogin2: any;

      mockAuthApi.login
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveLogin1 = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveLogin2 = resolve;
            })
        );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      // Start two concurrent login requests
      const promise1 = act(async () => {
        return result.current.login({
          email: "user1@test.com",
          password: "password123",
        });
      });

      const promise2 = act(async () => {
        return result.current.login({
          email: "user2@test.com",
          password: "password123",
        });
      });

      // Resolve the second request first
      act(() => {
        resolveLogin2({ user: mockUser2, token: "token2" });
      });
      await promise2;

      // Then resolve the first request
      act(() => {
        resolveLogin1({ user: mockUser1, token: "token1" });
      });
      await promise1;

      // Should have the result from the last resolved request
      expect(result.current.user).toEqual(mockUser1);
    });
  });
});
