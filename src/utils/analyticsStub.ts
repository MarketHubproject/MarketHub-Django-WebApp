/**
 * Analytics Stub Module
 * 
 * Provides a lightweight stub implementation of analytics functionality
 * to prevent import errors and maintain application stability.
 * 
 * This module exports minimal implementations that:
 * - Return resolved promises for async methods
 * - Accept all parameters without processing
 * - Log to console in development for debugging
 */

const isDev = __DEV__ || process.env.NODE_ENV === 'development';

// Basic logging utility for development
const devLog = (method: string, ...args: any[]) => {
  if (isDev) {
    console.log(`[Analytics Stub] ${method}:`, ...args);
  }
};

export default {
  // Core tracking methods
  logEvent: (eventName: string, parameters?: Record<string, any>) => {
    devLog('logEvent', eventName, parameters);
    return Promise.resolve();
  },

  setUserId: (userId: string) => {
    devLog('setUserId', userId);
    return Promise.resolve();
  },

  setUserProperty: (property: string, value: any) => {
    devLog('setUserProperty', property, value);
    return Promise.resolve();
  },

  // Screen tracking
  logScreenView: (screenData: Record<string, any>) => {
    devLog('logScreenView', screenData);
    return Promise.resolve();
  },

  // Additional methods based on codebase usage
  trackEvent: (eventName: string, parameters?: Record<string, any>) => {
    devLog('trackEvent', eventName, parameters);
    return Promise.resolve();
  },

  trackScreenView: (screenName: string, screenClass?: string) => {
    devLog('trackScreenView', screenName, screenClass);
    return Promise.resolve();
  },

  trackProductBrowse: (params?: Record<string, any>) => {
    devLog('trackProductBrowse', params);
    return Promise.resolve();
  },

  trackProductView: (product: Record<string, any>) => {
    devLog('trackProductView', product);
    return Promise.resolve();
  },

  trackAddToCart: (product: Record<string, any>) => {
    devLog('trackAddToCart', product);
    return Promise.resolve();
  },

  trackCheckoutBegin: (params: Record<string, any>) => {
    devLog('trackCheckoutBegin', params);
    return Promise.resolve();
  },

  trackPurchase: (params: Record<string, any>) => {
    devLog('trackPurchase', params);
    return Promise.resolve();
  },

  // Property and user management
  setUserProperties: (properties: Record<string, any>) => {
    devLog('setUserProperties', properties);
    return Promise.resolve();
  },

  initialize: () => {
    devLog('initialize');
    return Promise.resolve();
  },

  // Feature flags and remote config methods
  getAllFeatureFlags: () => {
    devLog('getAllFeatureFlags');
    return Promise.resolve({
      ar_rollout_percentage: 10,
      enable_new_checkout_flow: false,
      enable_recommendations: true,
      enable_chat_support: true,
      enable_subscriptions: false,
      enable_advanced_filters: true,
      enable_dark_mode: false,
    });
  },

  refreshRemoteConfig: () => {
    devLog('refreshRemoteConfig');
    return Promise.resolve();
  },

  // Sync methods (for compatibility)
  getInstance: () => {
    return {
      logEvent: (eventName: string, parameters?: Record<string, any>) => {
        devLog('getInstance().logEvent', eventName, parameters);
        return Promise.resolve();
      },
      setUserId: (userId: string) => {
        devLog('getInstance().setUserId', userId);
        return Promise.resolve();
      },
      setUserProperty: (property: string, value: any) => {
        devLog('getInstance().setUserProperty', property, value);
        return Promise.resolve();
      },
    };
  },
};
