import analytics from '../utils/analyticsStub';
// import remoteConfig from "@react-native-firebase/remote-config";
const remoteConfig = { setDefaults: () => {}, setConfigSettings: () => {}, fetchAndActivate: () => {}, fetch: () => {}, activate: () => {}, getBoolean: () => false, getNumber: () => 0, getString: () => '' } as any;
import { logger } from "../utils";

// Standardized event names for funnel tracking
export const ANALYTICS_EVENTS = {
  // Funnel Events: browse → add to cart → purchase
  BROWSE_PRODUCTS: "browse_products",
  VIEW_PRODUCT: "view_item",
  ADD_TO_CART: "add_to_cart",
  VIEW_CART: "view_cart",
  BEGIN_CHECKOUT: "begin_checkout",
  PURCHASE_COMPLETE: "purchase",

  // Additional engagement events
  SEARCH_PRODUCTS: "search",
  FILTER_PRODUCTS: "filter_products",
  SHARE_PRODUCT: "share",
  ADD_TO_WISHLIST: "add_to_wishlist",
  REMOVE_FROM_CART: "remove_from_cart",
  APPLY_COUPON: "apply_coupon",

  // App usage events
  APP_OPEN: "app_open",
  SCREEN_VIEW: "screen_view",
  BUTTON_CLICK: "button_click",
  FEATURE_USED: "feature_used",

  // AR-specific events
  AR_VIEW_START: "ar_view_start",
  AR_VIEW_END: "ar_view_end",
  AR_SCREENSHOT: "ar_screenshot",
  AR_SHARE: "ar_share",

  // Error tracking
  ERROR_OCCURRED: "error_occurred",
  API_ERROR: "api_error",
} as const;

// Remote Config keys for feature flags
export const FEATURE_FLAGS = {
  AR_ROLLOUT_PERCENTAGE: "ar_rollout_percentage",
  NEW_CHECKOUT_FLOW: "enable_new_checkout_flow",
  RECOMMENDATION_ENGINE: "enable_recommendations",
  CHAT_SUPPORT: "enable_chat_support",
  SUBSCRIPTION_FEATURE: "enable_subscriptions",
  ADVANCED_FILTERS: "enable_advanced_filters",
  DARK_MODE: "enable_dark_mode",
} as const;

// Product/Item parameters interface
interface ProductParams {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  currency?: string;
  quantity?: number;
}

// Purchase parameters interface
interface PurchaseParams {
  transaction_id: string;
  value: number;
  currency: string;
  items: ProductParams[];
  shipping?: number;
  tax?: number;
  coupon?: string;
  payment_method?: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;
  private userProperties: Record<string, any> = {};

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics and remote config
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Remote Config
      await this.initializeRemoteConfig();

      // Set default user properties
      await this.setDefaultUserProperties();

      this.isInitialized = true;
      logger.info("Analytics service initialized successfully");

      // Track app open
      await this.trackAppOpen();
    } catch (error) {
      logger.error("Analytics initialization error:", error);
    }
  }

  /**
   * Initialize Firebase Remote Config
   */
  private async initializeRemoteConfig(): Promise<void> {
    try {
      // Set default values
      const defaultConfig = {
        [FEATURE_FLAGS.AR_ROLLOUT_PERCENTAGE]: 10, // 10% rollout
        [FEATURE_FLAGS.NEW_CHECKOUT_FLOW]: false,
        [FEATURE_FLAGS.RECOMMENDATION_ENGINE]: true,
        [FEATURE_FLAGS.CHAT_SUPPORT]: true,
        [FEATURE_FLAGS.SUBSCRIPTION_FEATURE]: false,
        [FEATURE_FLAGS.ADVANCED_FILTERS]: true,
        [FEATURE_FLAGS.DARK_MODE]: false,
      };

      await remoteConfig().setDefaults(defaultConfig);

      // Configure fetch settings
      await remoteConfig().setConfigSettings({
        minimumFetchIntervalMillis: 300000, // 5 minutes
      });

      // Fetch and activate config
      await remoteConfig().fetchAndActivate();

      logger.info("Remote config initialized successfully");
    } catch (error) {
      logger.error("Remote config initialization error:", error);
    }
  }

  /**
   * Set default user properties
   */
  private async setDefaultUserProperties(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      await Promise.all([
        analytics.setUserProperty("first_open_time", timestamp),
        analytics.setUserProperty("app_version", "1.0.0"),
        analytics.setUserProperty("platform", "react_native"),
      ]);
    } catch (error) {
      logger.error("Error setting user properties:", error);
    }
  }

  /**
   * Track app open event
   */
  private async trackAppOpen(): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.APP_OPEN, {
      timestamp: Date.now(),
      app_version: "1.0.0",
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: Record<string, any>): Promise<void> {
    try {
      this.userProperties = { ...this.userProperties, ...properties };

      for (const [key, value] of Object.entries(properties)) {
        await analytics.setUserProperty(key, String(value));
      }
    } catch (error) {
      logger.error("Error setting user properties:", error);
    }
  }

  /**
   * Set user ID
   */
  async setUserId(userId: string): Promise<void> {
    try {
      await analytics.setUserId(userId);
      await this.setUserProperties({ user_id: userId });
    } catch (error) {
      logger.error("Error setting user ID:", error);
    }
  }

  /**
   * Track generic event
   */
  async trackEvent(
    eventName: string,
    parameters: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const enhancedParameters = {
        ...parameters,
        timestamp: Date.now(),
        platform: "react_native",
      };

      await analytics.logEvent(eventName, enhancedParameters);

      logger.info(`Analytics event tracked: ${eventName}`, enhancedParameters);
    } catch (error) {
      logger.error(`Error tracking event ${eventName}:`, error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(
    screenName: string,
    screenClass?: string
  ): Promise<void> {
    try {
      await analytics.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });

      await this.trackEvent(ANALYTICS_EVENTS.SCREEN_VIEW, {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      logger.error(`Error tracking screen view for ${screenName}:`, error);
    }
  }

  // ====== FUNNEL TRACKING METHODS ======

  /**
   * Track product browsing (funnel step 1)
   */
  async trackProductBrowse(
    params: {
      category?: string;
      search_term?: string;
      filter_applied?: string;
      results_count?: number;
    } = {}
  ): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.BROWSE_PRODUCTS, params);
  }

  /**
   * Track product view (funnel engagement)
   */
  async trackProductView(product: ProductParams): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.VIEW_PRODUCT, {
      currency: product.currency || "ZAR",
      value: product.price || 0,
      items: [product],
    });
  }

  /**
   * Track add to cart (funnel step 2)
   */
  async trackAddToCart(product: ProductParams): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.ADD_TO_CART, {
      currency: product.currency || "ZAR",
      value: (product.price || 0) * (product.quantity || 1),
      items: [product],
    });
  }

  /**
   * Track cart view
   */
  async trackCartView(params: {
    cart_value: number;
    items_count: number;
    currency?: string;
  }): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.VIEW_CART, {
      currency: params.currency || "ZAR",
      value: params.cart_value,
      items_count: params.items_count,
    });
  }

  /**
   * Track checkout begin (funnel step 3)
   */
  async trackCheckoutBegin(params: {
    value: number;
    currency?: string;
    items: ProductParams[];
    coupon?: string;
  }): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
      currency: params.currency || "ZAR",
      value: params.value,
      items: params.items,
      coupon: params.coupon,
    });
  }

  /**
   * Track purchase completion (funnel step 4)
   */
  async trackPurchase(params: PurchaseParams): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.PURCHASE_COMPLETE, {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: params.currency,
      items: params.items,
      shipping: params.shipping,
      tax: params.tax,
      coupon: params.coupon,
      payment_method: params.payment_method,
    });
  }

  // ====== AR TRACKING METHODS ======

  /**
   * Track AR feature usage
   */
  async trackARStart(productId: string): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.AR_VIEW_START, {
      product_id: productId,
    });
  }

  async trackAREnd(productId: string, duration: number): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.AR_VIEW_END, {
      product_id: productId,
      duration_seconds: Math.round(duration / 1000),
    });
  }

  async trackARScreenshot(productId: string): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.AR_SCREENSHOT, {
      product_id: productId,
    });
  }

  // ====== FEATURE FLAG METHODS ======

  /**
   * Get feature flag value
   */
  async getFeatureFlag<T = any>(key: string, defaultValue: T): Promise<T> {
    try {
      const config = remoteConfig();

      if (typeof defaultValue === "boolean") {
        return config.getBoolean(key) as T;
      } else if (typeof defaultValue === "number") {
        return config.getNumber(key) as T;
      } else {
        return config.getString(key) as T;
      }
    } catch (error) {
      logger.error(`Error getting feature flag ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Check if user is in AR rollout
   */
  async isAREnabled(): Promise<boolean> {
    try {
      const rolloutPercentage = await this.getFeatureFlag(
        FEATURE_FLAGS.AR_ROLLOUT_PERCENTAGE,
        10
      );

      // Use user ID hash for consistent rollout
      const userId = this.userProperties.user_id || "anonymous";
      const hash = this.simpleHash(userId) % 100;

      const isEnabled = hash < rolloutPercentage;

      // Track feature flag check
      await this.trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature_name: "ar_rollout_check",
        is_enabled: isEnabled,
        rollout_percentage: rolloutPercentage,
        user_hash: hash,
      });

      return isEnabled;
    } catch (error) {
      logger.error("Error checking AR rollout:", error);
      return false;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(): Promise<Record<string, any>> {
    try {
      const flags: Record<string, any> = {};

      for (const key of Object.values(FEATURE_FLAGS)) {
        if (key === FEATURE_FLAGS.AR_ROLLOUT_PERCENTAGE) {
          flags[key] = await this.getFeatureFlag(key, 10);
        } else {
          flags[key] = await this.getFeatureFlag(key, false);
        }
      }

      return flags;
    } catch (error) {
      logger.error("Error getting all feature flags:", error);
      return {};
    }
  }

  /**
   * Track error events
   */
  async trackError(
    error: Error,
    context: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 1000), // Limit stack trace length
      ...context,
    });
  }

  /**
   * Track API errors
   */
  async trackAPIError(params: {
    endpoint: string;
    method: string;
    status_code: number;
    error_message: string;
  }): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.API_ERROR, params);
  }

  /**
   * Force fetch remote config (for testing)
   */
  async refreshRemoteConfig(): Promise<void> {
    try {
      await remoteConfig().fetch(0); // Force fetch
      await remoteConfig().activate();
      logger.info("Remote config refreshed successfully");
    } catch (error) {
      logger.error("Error refreshing remote config:", error);
    }
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

export default AnalyticsService.getInstance();
