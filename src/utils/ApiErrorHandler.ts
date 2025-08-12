import ErrorToast, { ApiError } from './ErrorToast';
import logger from './logger';

/**
 * Centralized API error handler utility
 * Use this in catch blocks throughout the app for consistent error handling
 */
export class ApiErrorHandler {
  /**
   * Handle and display API errors
   * @param error - The error object thrown by API calls
   * @param showToast - Whether to show a toast message (default: true)
   * @param customMessage - Optional custom message to override the error message
   */
  static handle(error: any, showToast: boolean = true, customMessage?: string): void {
    // Check if error is already in the ApiError format
    if (error && typeof error === 'object' && error.title && error.message) {
      const apiError: ApiError = {
        title: error.title,
        message: customMessage || error.message
      };
      
      if (showToast) {
        ErrorToast.show(apiError);
      }
      
      // Log error for debugging using centralized logger
      logger.warn('API Error handled', null, {
        component: 'ApiErrorHandler',
        action: 'handle',
        metadata: {
          title: apiError.title,
          message: apiError.message,
          showToast
        }
      });
      return;
    }

    // Handle other error types (fallback)
    const message = customMessage || error?.message || 'An unexpected error occurred';
    
    if (showToast) {
      ErrorToast.showGeneric(message);
    }
    
    logger.warn('Unhandled error in ApiErrorHandler', error, {
      component: 'ApiErrorHandler',
      action: 'handle',
      metadata: {
        message,
        showToast,
        customMessage
      }
    });
  }

  /**
   * Handle network-specific errors
   */
  static handleNetwork(showToast: boolean = true): void {
    if (showToast) {
      ErrorToast.showNetwork();
    }
    logger.networkError('Network error handled by ApiErrorHandler', null, {
      component: 'ApiErrorHandler',
      action: 'handleNetwork',
      metadata: { showToast }
    });
  }

  /**
   * Handle authentication errors with custom actions
   */
  static handleAuth(error: any, onAuthFailure?: () => void): void {
    ApiErrorHandler.handle(error, true);
    
    // Execute custom auth failure callback (e.g., redirect to login)
    if (onAuthFailure) {
      onAuthFailure();
    }
  }

  /**
   * Silent error handling (no toast, just logging)
   */
  static logOnly(error: any): void {
    ApiErrorHandler.handle(error, false);
  }
}

export default ApiErrorHandler;
