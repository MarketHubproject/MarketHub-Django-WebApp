import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils";

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
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  type: "home" | "work" | "other";
  name: string;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "apple_pay" | "google_pay";
  name: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingAddress?: Address;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  refreshToken: string | null;
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | {
      type: "LOGIN_SUCCESS";
      payload: { user: User; token: string; refreshToken: string };
    }
  | { type: "LOGIN_FAILURE" }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "ADD_ADDRESS"; payload: Address }
  | { type: "UPDATE_ADDRESS"; payload: Address }
  | { type: "DELETE_ADDRESS"; payload: string }
  | { type: "ADD_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "UPDATE_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "DELETE_PAYMENT_METHOD"; payload: string };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  token: null,
  refreshToken: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        loading: false,
      };

    case "LOGIN_FAILURE":
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
      };

    case "LOGOUT":
      return {
        ...initialState,
        loading: false,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case "ADD_ADDRESS":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              addresses: [...state.user.addresses, action.payload],
            }
          : null,
      };

    case "UPDATE_ADDRESS":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              addresses: state.user.addresses.map((addr) =>
                addr.id === action.payload.id ? action.payload : addr
              ),
            }
          : null,
      };

    case "DELETE_ADDRESS":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              addresses: state.user.addresses.filter(
                (addr) => addr.id !== action.payload
              ),
            }
          : null,
      };

    case "ADD_PAYMENT_METHOD":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              paymentMethods: [...state.user.paymentMethods, action.payload],
            }
          : null,
      };

    case "UPDATE_PAYMENT_METHOD":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              paymentMethods: state.user.paymentMethods.map((pm) =>
                pm.id === action.payload.id ? action.payload : pm
              ),
            }
          : null,
      };

    case "DELETE_PAYMENT_METHOD":
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              paymentMethods: state.user.paymentMethods.filter(
                (pm) => pm.id !== action.payload
              ),
            }
          : null,
      };

    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  addAddress: (address: Omit<Address, "id">) => Promise<boolean>;
  updateAddress: (address: Address) => Promise<boolean>;
  deleteAddress: (addressId: string) => Promise<boolean>;
  addPaymentMethod: (
    paymentMethod: Omit<PaymentMethod, "id">
  ) => Promise<boolean>;
  updatePaymentMethod: (paymentMethod: PaymentMethod) => Promise<boolean>;
  deletePaymentMethod: (paymentMethodId: string) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      const userData = await AsyncStorage.getItem("userData");

      if (token && refreshToken && userData) {
        const user = JSON.parse(userData);
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user, token, refreshToken },
        });
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      logger.error("Error checking auth status", error, {
        component: "AuthContext",
        action: "checkAuthStatus",
      });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock successful login
      const mockUser: User = {
        id: "1",
        email,
        firstName: "John",
        lastName: "Doe",
        phone: "+27 11 123 4567",
        avatar: "https://via.placeholder.com/150",
        dateOfBirth: "1990-01-01",
        gender: "male",
        preferences: {
          notifications: true,
          emailMarketing: false,
          currency: "ZAR",
          language: "en",
        },
        addresses: [
          {
            id: "1",
            type: "home",
            name: "Home Address",
            firstName: "John",
            lastName: "Doe",
            street: "123 Main Street, Apt 4B",
            city: "Johannesburg",
            state: "Gauteng",
            zipCode: "2001",
            country: "South Africa",
            phone: "+27 11 123 4567",
            isDefault: true,
          },
        ],
        paymentMethods: [
          {
            id: "1",
            type: "card",
            name: "Primary Card",
            last4: "1234",
            brand: "Visa",
            expiryMonth: 12,
            expiryYear: 2025,
            isDefault: true,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const token = "mock-auth-token-" + Date.now();
      const refreshToken = "mock-refresh-token-" + Date.now();

      // Store in AsyncStorage
      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("refreshToken", refreshToken);
      await AsyncStorage.setItem("userData", JSON.stringify(mockUser));

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: mockUser, token, refreshToken },
      });

      logger.info("User logged in successfully", {
        component: "AuthContext",
        action: "login",
        metadata: { userId: mockUser.id, email: mockUser.email },
      });

      return true;
    } catch (error) {
      logger.error("Login failed", error, {
        component: "AuthContext",
        action: "login",
        metadata: { email },
      });
      dispatch({ type: "LOGIN_FAILURE" });
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful registration
      const newUser: User = {
        id: Date.now().toString(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        preferences: {
          notifications: true,
          emailMarketing: false,
          currency: "ZAR",
          language: "en",
        },
        addresses: [],
        paymentMethods: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const token = "mock-auth-token-" + Date.now();
      const refreshToken = "mock-refresh-token-" + Date.now();

      // Store in AsyncStorage
      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("refreshToken", refreshToken);
      await AsyncStorage.setItem("userData", JSON.stringify(newUser));

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: newUser, token, refreshToken },
      });

      logger.info("User registered successfully", {
        component: "AuthContext",
        action: "register",
        metadata: { userId: newUser.id, email: newUser.email },
      });

      return true;
    } catch (error) {
      logger.error("Registration failed", error, {
        component: "AuthContext",
        action: "register",
        metadata: { email: userData.email },
      });
      dispatch({ type: "LOGIN_FAILURE" });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(["authToken", "refreshToken", "userData"]);

      dispatch({ type: "LOGOUT" });

      logger.info("User logged out successfully", {
        component: "AuthContext",
        action: "logout",
      });
    } catch (error) {
      logger.error("Logout failed", error, {
        component: "AuthContext",
        action: "logout",
      });
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      if (!state.user) return false;

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedUser = {
        ...state.user,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      dispatch({ type: "UPDATE_USER", payload: data });

      logger.info("Profile updated successfully", {
        component: "AuthContext",
        action: "updateProfile",
        metadata: { userId: state.user.id },
      });

      return true;
    } catch (error) {
      logger.error("Profile update failed", error, {
        component: "AuthContext",
        action: "updateProfile",
      });
      return false;
    }
  };

  const addAddress = async (address: Omit<Address, "id">): Promise<boolean> => {
    try {
      if (!state.user) return false;

      const newAddress: Address = {
        ...address,
        id: Date.now().toString(),
      };

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch({ type: "ADD_ADDRESS", payload: newAddress });

      // Update AsyncStorage
      const updatedUser = {
        ...state.user,
        addresses: [...state.user.addresses, newAddress],
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      logger.error("Add address failed", error, {
        component: "AuthContext",
        action: "addAddress",
      });
      return false;
    }
  };

  const updateAddress = async (address: Address): Promise<boolean> => {
    try {
      if (!state.user) return false;

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch({ type: "UPDATE_ADDRESS", payload: address });

      // Update AsyncStorage
      const updatedUser = {
        ...state.user,
        addresses: state.user.addresses.map((addr) =>
          addr.id === address.id ? address : addr
        ),
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      logger.error("Update address failed", error, {
        component: "AuthContext",
        action: "updateAddress",
      });
      return false;
    }
  };

  const deleteAddress = async (addressId: string): Promise<boolean> => {
    try {
      if (!state.user) return false;

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch({ type: "DELETE_ADDRESS", payload: addressId });

      // Update AsyncStorage
      const updatedUser = {
        ...state.user,
        addresses: state.user.addresses.filter((addr) => addr.id !== addressId),
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      logger.error("Delete address failed", error, {
        component: "AuthContext",
        action: "deleteAddress",
      });
      return false;
    }
  };

  const addPaymentMethod = async (
    paymentMethod: Omit<PaymentMethod, "id">
  ): Promise<boolean> => {
    try {
      if (!state.user) return false;

      const newPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        id: Date.now().toString(),
      };

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch({ type: "ADD_PAYMENT_METHOD", payload: newPaymentMethod });

      // Update AsyncStorage
      const updatedUser = {
        ...state.user,
        paymentMethods: [...state.user.paymentMethods, newPaymentMethod],
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      logger.error("Add payment method failed", error, {
        component: "AuthContext",
        action: "addPaymentMethod",
      });
      return false;
    }
  };

  const updatePaymentMethod = async (
    paymentMethod: PaymentMethod
  ): Promise<boolean> => {
    try {
      if (!state.user) return false;

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch({ type: "UPDATE_PAYMENT_METHOD", payload: paymentMethod });

      // Update AsyncStorage
      const updatedUser = {
        ...state.user,
        paymentMethods: state.user.paymentMethods.map((pm) =>
          pm.id === paymentMethod.id ? paymentMethod : pm
        ),
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      logger.error("Update payment method failed", error, {
        component: "AuthContext",
        action: "updatePaymentMethod",
      });
      return false;
    }
  };

  const deletePaymentMethod = async (
    paymentMethodId: string
  ): Promise<boolean> => {
    try {
      if (!state.user) return false;

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch({ type: "DELETE_PAYMENT_METHOD", payload: paymentMethodId });

      // Update AsyncStorage
      const updatedUser = {
        ...state.user,
        paymentMethods: state.user.paymentMethods.filter(
          (pm) => pm.id !== paymentMethodId
        ),
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      logger.error("Delete payment method failed", error, {
        component: "AuthContext",
        action: "deletePaymentMethod",
      });
      return false;
    }
  };

  const refreshUserData = async (): Promise<void> => {
    try {
      if (!state.user) return;

      // TODO: Replace with actual API call to fetch fresh user data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info("User data refreshed", {
        component: "AuthContext",
        action: "refreshUserData",
        metadata: { userId: state.user.id },
      });
    } catch (error) {
      logger.error("Refresh user data failed", error, {
        component: "AuthContext",
        action: "refreshUserData",
      });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
