import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { render, createMockNavigationProps } from "@testing/utils/testUtils";
import LoginScreen from "@/screens/LoginScreen";
import { useAuth } from "@/features/auth/hooks/useAuth";
import Toast from "react-native-toast-message";

// Mock the useAuth hook
jest.mock("@/features/auth/hooks/useAuth");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Toast
jest.mock("react-native-toast-message");
const mockToast = Toast as jest.Mocked<typeof Toast>;

describe("LoginScreen", () => {
  const mockNavigation = createMockNavigationProps().navigation;
  const mockRoute = createMockNavigationProps().route;

  const mockAuthFunctions = {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    refetchUser: jest.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthFunctions);
  });

  it("renders login form correctly", () => {
    const { getByTestId, getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByTestId("email-input")).toBeTruthy();
    expect(getByTestId("password-input")).toBeTruthy();
    expect(getByTestId("login-button")).toBeTruthy();
    expect(getByText("Login")).toBeTruthy();
    expect(getByText("Forgot Password?")).toBeTruthy();
    expect(getByText("Sign Up")).toBeTruthy();
  });

  it("validates required fields", async () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const loginButton = getByTestId("login-button");

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByTestId("email-error")).toBeTruthy();
      expect(getByTestId("password-error")).toBeTruthy();
    });

    expect(mockAuthFunctions.login).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByTestId("email-input");
    const loginButton = getByTestId("login-button");

    fireEvent.changeText(emailInput, "invalid-email");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByTestId("email-error")).toBeTruthy();
    });

    expect(mockAuthFunctions.login).not.toHaveBeenCalled();
  });

  it("validates minimum password length", async () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByTestId("email-input");
    const passwordInput = getByTestId("password-input");
    const loginButton = getByTestId("login-button");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.changeText(passwordInput, "123"); // Too short
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByTestId("password-error")).toBeTruthy();
    });

    expect(mockAuthFunctions.login).not.toHaveBeenCalled();
  });

  it("successfully submits login form with valid data", async () => {
    mockAuthFunctions.login.mockResolvedValueOnce(undefined);

    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByTestId("email-input");
    const passwordInput = getByTestId("password-input");
    const loginButton = getByTestId("login-button");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockAuthFunctions.login).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      });
    });
  });

  it("displays loading state during login", async () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthFunctions,
      isLoading: true,
    });

    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const loginButton = getByTestId("login-button");
    expect(loginButton).toBeDisabled();
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("handles login error gracefully", async () => {
    const error = new Error("Invalid credentials");
    mockAuthFunctions.login.mockRejectedValueOnce(error);

    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByTestId("email-input");
    const passwordInput = getByTestId("password-input");
    const loginButton = getByTestId("login-button");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.changeText(passwordInput, "wrongpassword");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith({
        type: "error",
        text1: "Login Failed",
        text2: "Invalid credentials",
      });
    });
  });

  it("navigates to forgot password screen", () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const forgotPasswordButton = getByTestId("forgot-password-button");
    fireEvent.press(forgotPasswordButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("ForgotPassword");
  });

  it("navigates to signup screen", () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const signupButton = getByTestId("signup-button");
    fireEvent.press(signupButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("Signup");
  });

  it("toggles password visibility", () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const passwordInput = getByTestId("password-input");
    const toggleButton = getByTestId("password-toggle-button");

    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(false);

    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it("handles biometric login if available", async () => {
    const mockBiometricLogin = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      ...mockAuthFunctions,
      biometricLogin: mockBiometricLogin,
    });

    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const biometricButton = getByTestId("biometric-login-button");
    fireEvent.press(biometricButton);

    await waitFor(() => {
      expect(mockBiometricLogin).toHaveBeenCalled();
    });
  });

  it("clears form errors when user starts typing", async () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const loginButton = getByTestId("login-button");
    const emailInput = getByTestId("email-input");

    // Trigger validation error
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByTestId("email-error")).toBeTruthy();
    });

    // Start typing to clear error
    fireEvent.changeText(emailInput, "test@");

    await waitFor(() => {
      expect(() => getByTestId("email-error")).toThrow();
    });
  });

  it("redirects to home screen when already authenticated", () => {
    const mockUser = generateMockUser();
    mockUseAuth.mockReturnValue({
      ...mockAuthFunctions,
      user: mockUser,
      isAuthenticated: true,
    });

    render(<LoginScreen navigation={mockNavigation} route={mockRoute} />);

    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Home" }],
    });
  });

  it("handles deep link redirect after login", async () => {
    const redirectUrl = "/products/123";
    const routeWithRedirect = {
      ...mockRoute,
      params: { redirectUrl },
    };

    mockAuthFunctions.login.mockResolvedValueOnce(undefined);

    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={routeWithRedirect} />
    );

    const emailInput = getByTestId("email-input");
    const passwordInput = getByTestId("password-input");
    const loginButton = getByTestId("login-button");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(redirectUrl);
    });
  });

  it("supports keyboard navigation", () => {
    const { getByTestId } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByTestId("email-input");
    const passwordInput = getByTestId("password-input");

    expect(emailInput.props.returnKeyType).toBe("next");
    expect(passwordInput.props.returnKeyType).toBe("done");

    fireEvent(emailInput, "onSubmitEditing");
    // Should focus password input
    expect(passwordInput).toBeFocused();
  });

  it("maintains form state during component re-renders", () => {
    const { getByTestId, rerender } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByTestId("email-input");
    const passwordInput = getByTestId("password-input");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.changeText(passwordInput, "password123");

    rerender(<LoginScreen navigation={mockNavigation} route={mockRoute} />);

    expect(emailInput.props.value).toBe("test@test.com");
    expect(passwordInput.props.value).toBe("password123");
  });

  describe("Accessibility", () => {
    it("has proper accessibility labels", () => {
      const { getByTestId } = render(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByTestId("email-input")).toHaveAccessibilityLabel(
        "Email address"
      );
      expect(getByTestId("password-input")).toHaveAccessibilityLabel(
        "Password"
      );
      expect(getByTestId("login-button")).toHaveAccessibilityLabel(
        "Log in to your account"
      );
    });

    it("announces form errors to screen readers", async () => {
      const { getByTestId } = render(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const loginButton = getByTestId("login-button");
      fireEvent.press(loginButton);

      await waitFor(() => {
        const emailError = getByTestId("email-error");
        expect(emailError).toHaveAccessibilityRole("alert");
        expect(emailError).toHaveAccessibilityLiveRegion("assertive");
      });
    });

    it("supports high contrast mode", () => {
      const { getByTestId } = render(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const loginButton = getByTestId("login-button");
      expect(loginButton.props.style).toContainEqual(
        expect.objectContaining({
          borderWidth: expect.any(Number),
        })
      );
    });
  });
});
