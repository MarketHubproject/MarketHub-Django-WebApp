import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseService from "./firebase";
// import notificationService from "./notificationService"; // Temporarily disabled due to Notifee build issues
import deepLinkService from "./deepLinkService";
import backgroundSyncService from "./backgroundSyncService";
import performanceService from "./performanceService";
import { initializeQueryPersistence } from "../shared/api/queryClient";

export class AppInitService {
  private static instance: AppInitService;
  private isInitialized = false;

  public static getInstance(): AppInitService {
    if (!AppInitService.instance) {
      AppInitService.instance = new AppInitService();
    }
    return AppInitService.instance;
  }

  /**
   * Initialize all app services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("App services already initialized");
      return;
    }

    try {
      console.log("Initializing app services...");

      // Initialize performance monitoring first
      const initStartTime = performance.now();
      await performanceService.initialize();

      // Initialize React Query persistence with MMKV
      await initializeQueryPersistence();

      // Initialize Firebase (required for analytics and messaging)
      // // await firebaseService.initialize(); // Temporarily disabled due to Firebase build issues

      // Initialize background sync service
      await backgroundSyncService.initialize();

      // Initialize notification service
      // await notificationService.initialize(); // Temporarily disabled due to Notifee build issues

      // Initialize deep linking
      await deepLinkService.initialize();

      // Setup abandoned cart tracking
      this.setupAbandonedCartTracking();

      // Setup app state change handling
      this.setupAppStateHandling();

      // Load saved notification preferences
      await this.loadNotificationPreferences();

      // Measure and log app initialization time
      const initEndTime = performance.now();
      performanceService.measureScreenLoadTime(
        "AppInitialization",
        initStartTime
      );

      this.isInitialized = true;
      console.log("App services initialized successfully");
    } catch (error) {
      console.error("App initialization error:", error);
    }
  }

  /**
   * Setup abandoned cart tracking
   */
  private setupAbandonedCartTracking(): void {
    let cartCheckTimer: NodeJS.Timeout;
    const CART_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
    const ABANDON_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

    const checkAbandonedCart = async () => {
      try {
        // Get cart data from storage
        const cartData = await AsyncStorage.getItem("@cart_data");
        const lastActivity = await AsyncStorage.getItem("@last_cart_activity");

        if (cartData && lastActivity) {
          const cart = JSON.parse(cartData);
          const lastActivityTime = parseInt(lastActivity);
          const now = Date.now();

          // Check if cart has items and hasn't been active for threshold time
          if (
            cart.items &&
            cart.items.length > 0 &&
            now - lastActivityTime > ABANDON_THRESHOLD
          ) {
            const totalValue = cart.items.reduce(
              (sum: number, item: any) => sum + item.price * item.quantity,
              0
            );

            // Send abandoned cart notification
            // await // notificationService.sendAbandonedCartNotification(
            //   cart.items.length,
            //   totalValue
            // );

            // Schedule follow-up reminder
            // await // notificationService.scheduleAbandonedCartReminder(
            //   cart.items.length,
            //   totalValue,
            //   48 // 48 hours later
            // );

            // Mark as notified to avoid duplicate notifications
            await AsyncStorage.setItem("@cart_abandon_notified", "true");
          }
        }
      } catch (error) {
        console.error("Error checking abandoned cart:", error);
      }
    };

    // Start periodic checking
    cartCheckTimer = setInterval(checkAbandonedCart, CART_CHECK_INTERVAL);

    // Initial check
    setTimeout(checkAbandonedCart, 5000); // After 5 seconds
  }

  /**
   * Setup app state change handling
   */
  private setupAppStateHandling(): void {
    AppState.addEventListener("change", (nextAppState) => {
      console.log("App state changed to:", nextAppState);

      if (nextAppState === "background") {
        this.onAppBackground();
      } else if (nextAppState === "active") {
        this.onAppForeground();
      }
    });
  }

  /**
   * Handle app going to background
   */
  private async onAppBackground(): Promise<void> {
    try {
      // Save last activity time
      await AsyncStorage.setItem("@last_app_activity", Date.now().toString());

      // Reset cart abandon notification flag if user was active
      await AsyncStorage.removeItem("@cart_abandon_notified");

      // Save performance metrics
      await performanceService.saveMetricsToStorage();

      // Schedule immediate sync if needed
      await backgroundSyncService.scheduleImmediateSync();
    } catch (error) {
      console.error("Error handling app background:", error);
    }
  }

  /**
   * Handle app coming to foreground
   */
  private async onAppForeground(): Promise<void> {
    try {
      // Check for any pending deep links
      // This is handled by the deep link service

      // Update FCM token if needed
      // // await firebaseService.getFCMToken(); // Temporarily disabled due to Firebase build issues

      // Schedule immediate sync for fresh data
      await backgroundSyncService.scheduleImmediateSync();
    } catch (error) {
      console.error("Error handling app foreground:", error);
    }
  }

  /**
   * Load saved notification preferences
   */
  private async loadNotificationPreferences(): Promise<void> {
    try {
      const storedPreferences = await AsyncStorage.getItem(
        "@notification_preferences"
      );
      if (storedPreferences) {
        const preferences = JSON.parse(storedPreferences);
        // notificationService.setPreferences(preferences);

        // Update topic subscriptions
        for (const [category, enabled] of Object.entries(preferences)) {
          const topicName = category.replace("_", "-");
          if (enabled) {
            // await firebaseService.subscribeToTopic(topicName);
          } else {
            // await firebaseService.unsubscribeFromTopic(topicName);
          }
        }
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    }
  }

  /**
   * Handle order status update
   */
  async handleOrderStatusUpdate(
    orderId: string,
    status: string,
    trackingNumber?: string
  ): Promise<void> {
    try {
      // await notificationService.sendOrderStatusNotification(
      //   orderId,
      //   status,
      //   trackingNumber
      // );

      // Track analytics
      // await firebaseService.trackNotificationConversion(
      //   `order_${orderId}`,
      //   "order_status_notification"
      // );
    } catch (error) {
      console.error("Error handling order status update:", error);
    }
  }

  /**
   * Handle price drop alert
   */
  async handlePriceDrop(
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number
  ): Promise<void> {
    try {
      // await notificationService.sendPriceDropNotification(
      //   productId,
      //   productName,
      //   oldPrice,
      //   newPrice
      // );

      // Track analytics
      // await firebaseService.trackNotificationConversion(
      //   `price_drop_${productId}`,
      //   "price_drop_notification"
      // );
    } catch (error) {
      console.error("Error handling price drop:", error);
    }
  }

  /**
   * Handle promotional campaign
   */
  async handlePromotionalCampaign(
    title: string,
    message: string,
    promoCode?: string,
    deepLink?: string
  ): Promise<void> {
    try {
      // await notificationService.sendPromotionalNotification(
      //   title,
      //   message,
      //   promoCode,
      //   deepLink
      // );

      // Track analytics
      // await firebaseService.trackNotificationConversion(
      //   `promo_${promoCode || Date.now()}`,
      //   "promotional_notification"
      // );
    } catch (error) {
      console.error("Error handling promotional campaign:", error);
    }
  }

  /**
   * Track cart activity
   */
  async trackCartActivity(): Promise<void> {
    try {
      await AsyncStorage.setItem("@last_cart_activity", Date.now().toString());
      await AsyncStorage.removeItem("@cart_abandon_notified");
    } catch (error) {
      console.error("Error tracking cart activity:", error);
    }
  }

  /**
   * Create and share product link
   */
  async createProductShareLink(
    productId: string,
    productName: string,
    imageUrl?: string
  ): Promise<string> {
    try {
      return await deepLinkService.createProductShareLink(
        productId,
        productName,
        imageUrl
      );
    } catch (error) {
      console.error("Error creating product share link:", error);
      return "";
    }
  }

  /**
   * Create promotional campaign link
   */
  async createPromoCampaignLink(
    promoCode: string,
    title: string,
    description: string
  ): Promise<string> {
    try {
      return await deepLinkService.createPromoLink(
        promoCode,
        title,
        description
      );
    } catch (error) {
      console.error("Error creating promo campaign link:", error);
      return "";
    }
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences() {
    // return notificationService.getPreferences();
    return {};
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "@notification_preferences",
        JSON.stringify(preferences)
      );
      // notificationService.setPreferences(preferences);

      // Update topic subscriptions
      for (const [category, enabled] of Object.entries(preferences)) {
        const topicName = (category as string).replace("_", "-");
        if (enabled) {
          // await firebaseService.subscribeToTopic(topicName);
        } else {
          // await firebaseService.unsubscribeFromTopic(topicName);
        }
      }
    } catch (error) {
      console.error("Error updating notification preferences:", error);
    }
  }
}

export default AppInitService.getInstance();
