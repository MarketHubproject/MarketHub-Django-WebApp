/**
 * Examples of how to use the new error handling system in your components
 *
 * IMPORTANT: These are examples only. Use these patterns in your actual components.
 * Don't import this file directly in your app.
 */

import { ApiErrorHandler, ErrorToast } from "./index";
import api from "../services/api";

// Example 1: Basic API call with error handling
export const exampleLoginFunction = async (email: string, password: string) => {
  try {
    const result = await api.login(email, password);
    ErrorToast.showSuccess("Welcome!", "Login successful");
    return result;
  } catch (error) {
    // The error is already formatted by api.handleError()
    ApiErrorHandler.handle(error);
    throw error; // Re-throw if component needs to handle it further
  }
};

// Example 2: Silent error handling (no toast)
export const exampleSilentFetch = async (productId: string) => {
  try {
    const product = await api.getProduct(productId);
    return product;
  } catch (error) {
    // Only log the error, don't show toast
    ApiErrorHandler.logOnly(error);
    return null; // Return fallback value
  }
};

// Example 3: Custom error message
export const exampleCustomMessage = async (userData: any) => {
  try {
    const result = await api.signup(userData);
    return result;
  } catch (error) {
    // Override the error message with a custom one
    ApiErrorHandler.handle(
      error,
      true,
      "Failed to create account. Please try again."
    );
    throw error;
  }
};

// Example 4: Authentication error with callback
export const exampleAuthError = async (onLogout: () => void) => {
  try {
    const profile = await api.getUserProfile();
    return profile;
  } catch (error) {
    // Handle auth errors with custom callback
    ApiErrorHandler.handleAuth(error, onLogout);
    throw error;
  }
};

// Example 5: Multiple API calls with centralized error handling
export const exampleMultipleAPICalls = async () => {
  try {
    const [products, categories] = await Promise.all([
      api.getProducts(),
      api.getCategories(),
    ]);

    return { products, categories };
  } catch (error) {
    ApiErrorHandler.handle(
      error,
      true,
      "Failed to load data. Please refresh and try again."
    );
    throw error;
  }
};

// Example 6: React component pattern (pseudo-code)
export const exampleComponentUsage = `
// In your React component:

import { ApiErrorHandler } from '../utils';
import api from '../services/api';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);
  
  const handleAddToCart = async (productId: string) => {
    try {
      setLoading(true);
      await api.addToCart(productId);
      ErrorToast.showSuccess('Success!', 'Item added to cart');
    } catch (error) {
      ApiErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async () => {
    try {
      const data = await api.getProducts();
      // Handle success...
    } catch (error) {
      // Show custom error message for this specific case
      ApiErrorHandler.handle(error, true, 'Unable to load products. Please try again.');
    }
  };

  // ... rest of component
};
`;

export default {
  exampleLoginFunction,
  exampleSilentFetch,
  exampleCustomMessage,
  exampleAuthError,
  exampleMultipleAPICalls,
  exampleComponentUsage,
};
