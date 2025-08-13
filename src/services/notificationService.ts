// Safely import Notifee with fallback
let notifee: any = null;
let AndroidImportance: any = {};
let AndroidVisibility: any = {};
let AndroidStyle: any = {};
let TriggerType: any = {};
let RepeatFrequency: any = {};
let AuthorizationStatus: any = {};
let Event: any = {};
let EventType: any = {};

try {
  const notifeeModule = require("@notifee/react-native");
  notifee = notifeeModule.default;
  AndroidImportance = notifeeModule.AndroidImportance || {};
  AndroidVisibility = notifeeModule.AndroidVisibility || {};
  AndroidStyle = notifeeModule.AndroidStyle || {};
  TriggerType = notifeeModule.TriggerType || {};
  RepeatFrequency = notifeeModule.RepeatFrequency || {};
  AuthorizationStatus = notifeeModule.AuthorizationStatus || {};
  Event = notifeeModule.Event || {};
  EventType = notifeeModule.EventType || {};
} catch (error) {
  console.warn('Notifee not available, notifications will be disabled:', error.message);
}

// Safely import Firebase messaging
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  console.warn('Firebase messaging not available:', error.message);
}

import { Platform } from "react-native";
import firebaseService from "./firebase";

export enum NotificationCategory {
  ORDER_STATUS = "order_status",
  PRICE_DROP = "price_drop",
  ABANDONED_CART = "abandoned_cart",
  PROMOTIONAL = "promotional",
  SUBSCRIPTION = "subscription",
  GENERAL = "general",
}

export interface NotificationPreferences {
  [NotificationCategory.ORDER_STATUS]: boolean;
  [NotificationCategory.PRICE_DROP]: boolean;
  [NotificationCategory.ABANDONED_CART]: boolean;
  [NotificationCategory.PROMOTIONAL]: boolean;
  [NotificationCategory.GENERAL]: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private channelId = "markethub-default";
  private preferences: NotificationPreferences = {
    [NotificationCategory.ORDER_STATUS]: true,
    [NotificationCategory.PRICE_DROP]: true,
    [NotificationCategory.ABANDONED_CART]: true,
    [NotificationCategory.PROMOTIONAL]: true,
    [NotificationCategory.GENERAL]: true,
  };

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize Notifee and setup channels
   */
  async initialize(): Promise<void> {
    try {
      if (!notifee) {
        console.warn('Notifee not available, skipping notification initialization');
        return;
      }
      
      // Create notification channels (Android)
      if (Platform.OS === "android") {
        await this.createChannels();
      }

      // Set up notification handlers
      this.setupNotificationHandlers();

      // Setup FCM message handler
      this.setupFCMHandler();

      // Request permissions
      await this.requestPermissions();

      console.log("Notification service initialized successfully");
    } catch (error) {
      console.error("Notification service initialization error:", error);
    }
  }

  /**
   * Create notification channels for Android
   */
  private async createChannels(): Promise<void> {
    const channels = [
      {
        id: "order-status",
        name: "Order Updates",
        description: "Notifications about order status changes",
        importance: AndroidImportance.HIGH,
      },
      {
        id: "price-drops",
        name: "Price Alerts",
        description: "Notifications about price drops on watched items",
        importance: AndroidImportance.DEFAULT,
      },
      {
        id: "abandoned-cart",
        name: "Cart Reminders",
        description: "Reminders about items left in your cart",
        importance: AndroidImportance.DEFAULT,
      },
      {
        id: "promotional",
        name: "Promotions",
        description: "Special offers and promotional notifications",
        importance: AndroidImportance.LOW,
      },
      {
        id: "general",
        name: "General",
        description: "General app notifications",
        importance: AndroidImportance.DEFAULT,
      },
    ];

    for (const channel of channels) {
      await notifee.createChannel(channel);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  }

  /**
   * Setup notification event handlers
   */
  private setupNotificationHandlers(): void {
    // Handle notification events
    notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log("Foreground notification event:", type, detail);

      switch (type) {
        case EventType.DISMISSED:
          console.log("User dismissed notification", detail.notification);
          break;
        case EventType.PRESS:
          console.log("User pressed notification", detail.notification);
          await this.handleNotificationPress(detail);
          break;
        case EventType.ACTION_PRESS:
          console.log(
            "User pressed action",
            detail.pressAction?.id,
            detail.notification
          );
          await this.handleActionPress(detail);
          break;
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log("Background notification event:", type, detail);

      if (type === EventType.PRESS) {
        await this.handleNotificationPress(detail);
      } else if (type === EventType.ACTION_PRESS) {
        await this.handleActionPress(detail);
      }
    });
  }

  /**
   * Setup FCM message handler to display local notifications
   */
  private setupFCMHandler(): void {
    messaging().onMessage(async (remoteMessage) => {
      console.log("FCM foreground message received:", remoteMessage);

      // Display local notification using Notifee
      await this.displayNotification({
        title: remoteMessage.notification?.title || "New Notification",
        body: remoteMessage.notification?.body || "",
        data: remoteMessage.data || {},
        category: remoteMessage.data?.category as NotificationCategory,
      });
    });
  }

  /**
   * Display a local notification
   */
  async displayNotification({
    title,
    body,
    data = {},
    category = NotificationCategory.GENERAL,
    actions,
  }: {
    title: string;
    body: string;
    data?: any;
    category?: NotificationCategory;
    actions?: Array<{ id: string; title: string }>;
  }): Promise<string> {
    // Check if category is enabled in preferences
    if (!this.preferences[category]) {
      console.log(`Notification blocked by user preferences: ${category}`);
      return "";
    }

    try {
      const notificationId = await notifee.displayNotification({
        title,
        body,
        data: {
          ...data,
          category,
          notificationId: `${category}_${Date.now()}`,
        },
        android: {
          channelId: this.getChannelId(category),
          importance: AndroidImportance.DEFAULT,
          visibility: AndroidVisibility.PUBLIC,
          pressAction: {
            id: "default",
          },
          actions: actions?.map((action) => ({
            title: action.title,
            pressAction: {
              id: action.id,
            },
          })),
        },
        ios: {
          categoryId: category,
          attachments: data.imageUrl ? [{ url: data.imageUrl }] : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Error displaying notification:", error);
      return "";
    }
  }

  /**
   * Handle notification press
   */
  private async handleNotificationPress(detail: any): Promise<void> {
    try {
      const data = detail.notification?.data;
      if (!data) return;

      // Track analytics
      await firebaseService.trackNotificationOpen({
        messageId: data.notificationId,
        data: data,
      });

      // Handle deep link navigation
      if (data.deepLink) {
        // NavigationService will handle this
        console.log("Deep link navigation:", data.deepLink);
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
    }
  }

  /**
   * Handle action press
   */
  private async handleActionPress(detail: any): Promise<void> {
    try {
      const { pressAction, notification } = detail;
      const data = notification?.data;

      console.log("Action pressed:", pressAction?.id, data);

      // Handle specific actions
      switch (pressAction?.id) {
        case "view_order":
          // Navigate to order details
          break;
        case "view_product":
          // Navigate to product details
          break;
        case "dismiss":
          // Just dismiss
          break;
        default:
          break;
      }

      // Track conversion
      if (data?.notificationId) {
        await firebaseService.trackNotificationConversion(
          data.notificationId,
          pressAction?.id || "action_press"
        );
      }
    } catch (error) {
      console.error("Error handling action press:", error);
    }
  }

  /**
   * Get channel ID based on category
   */
  private getChannelId(category: NotificationCategory): string {
    const channelMap = {
      [NotificationCategory.ORDER_STATUS]: "order-status",
      [NotificationCategory.PRICE_DROP]: "price-drops",
      [NotificationCategory.ABANDONED_CART]: "abandoned-cart",
      [NotificationCategory.PROMOTIONAL]: "promotional",
      [NotificationCategory.GENERAL]: "general",
    };

    return channelMap[category] || "general";
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification({
    title,
    body,
    data = {},
    category = NotificationCategory.GENERAL,
    triggerAt,
  }: {
    title: string;
    body: string;
    data?: any;
    category?: NotificationCategory;
    triggerAt: Date;
  }): Promise<string> {
    try {
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerAt.getTime(),
      };

      const notificationId = await notifee.createTriggerNotification(
        {
          title,
          body,
          data: {
            ...data,
            category,
            notificationId: `scheduled_${category}_${Date.now()}`,
          },
          android: {
            channelId: this.getChannelId(category),
          },
        },
        trigger
      );

      return notificationId;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return "";
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error("Error canceling all notifications:", error);
    }
  }

  /**
   * Update notification preferences
   */
  setPreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    console.log("Notification preferences updated:", this.preferences);
  }

  /**
   * Get current notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Send order status notification
   */
  async sendOrderStatusNotification(
    orderId: string,
    status: string,
    trackingNumber?: string
  ): Promise<void> {
    const statusMessages = {
      confirmed: "Your order has been confirmed!",
      processing: "Your order is being processed",
      shipped: "Your order has been shipped",
      delivered: "Your order has been delivered",
      cancelled: "Your order has been cancelled",
    };

    const message =
      statusMessages[status as keyof typeof statusMessages] ||
      `Order status: ${status}`;

    const actions =
      status === "shipped" && trackingNumber
        ? [
            { id: "track_order", title: "Track Package" },
            { id: "view_order", title: "View Order" },
          ]
        : [{ id: "view_order", title: "View Order" }];

    await this.displayNotification({
      title: `Order #${orderId}`,
      body: message,
      category: NotificationCategory.ORDER_STATUS,
      data: {
        orderId,
        status,
        trackingNumber,
        deepLink: `/order/${orderId}`,
      },
      actions,
    });
  }

  /**
   * Send price drop notification
   */
  async sendPriceDropNotification(
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number
  ): Promise<void> {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    await this.displayNotification({
      title: "Price Drop Alert! 🏷️",
      body: `${productName} is now $${newPrice} (${discount}% off!)`,
      category: NotificationCategory.PRICE_DROP,
      data: {
        productId,
        oldPrice,
        newPrice,
        discount,
        deepLink: `/product/${productId}`,
      },
      actions: [
        { id: "view_product", title: "View Product" },
        { id: "add_to_cart", title: "Add to Cart" },
      ],
    });
  }

  /**
   * Send abandoned cart notification
   */
  async sendAbandonedCartNotification(
    cartItems: number,
    totalValue: number
  ): Promise<void> {
    await this.displayNotification({
      title: "Don't forget your cart! 🛒",
      body: `You have ${cartItems} items worth $${totalValue.toFixed(
        2
      )} waiting for you`,
      category: NotificationCategory.ABANDONED_CART,
      data: {
        cartItems,
        totalValue,
        deepLink: "/cart",
      },
      actions: [
        { id: "view_cart", title: "View Cart" },
        { id: "checkout", title: "Checkout Now" },
      ],
    });
  }

  /**
   * Schedule abandoned cart reminder
   */
  async scheduleAbandonedCartReminder(
    cartItems: number,
    totalValue: number,
    hours: number = 24
  ): Promise<string> {
    const triggerAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    return this.scheduleNotification({
      title: "Still thinking about your cart? 🤔",
      body: `Complete your purchase of ${cartItems} items and save $${totalValue.toFixed(
        2
      )}`,
      category: NotificationCategory.ABANDONED_CART,
      data: {
        cartItems,
        totalValue,
        deepLink: "/cart",
      },
      triggerAt,
    });
  }

  /**
   * Send promotional notification
   */
  async sendPromotionalNotification(
    title: string,
    message: string,
    promoCode?: string,
    deepLink?: string
  ): Promise<void> {
    await this.displayNotification({
      title,
      body: message,
      category: NotificationCategory.PROMOTIONAL,
      data: {
        promoCode,
        deepLink: deepLink || "/home",
      },
      actions: promoCode
        ? [
            { id: "use_promo", title: "Use Code" },
            { id: "shop_now", title: "Shop Now" },
          ]
        : [{ id: "shop_now", title: "Shop Now" }],
    });
  }

  /**
   * Send subscription delivery reminder
   */
  async sendSubscriptionDeliveryReminder(
    subscriptionId: string,
    productName: string,
    deliveryDate: string
  ): Promise<void> {
    await this.displayNotification({
      title: "Subscription Delivery Tomorrow 📦",
      body: `Your ${productName} subscription will be delivered tomorrow`,
      category: NotificationCategory.SUBSCRIPTION,
      data: {
        subscriptionId,
        productName,
        deliveryDate,
        deepLink: "/subscriptions",
      },
      actions: [
        { id: "skip_delivery", title: "Skip This Delivery" },
        { id: "view_subscription", title: "View Subscription" },
      ],
    });
  }

  /**
   * Send subscription delivery confirmation
   */
  async sendSubscriptionDeliveryConfirmation(
    subscriptionId: string,
    productName: string,
    nextDeliveryDate: string
  ): Promise<void> {
    await this.displayNotification({
      title: "Subscription Delivered! ✅",
      body: `Your ${productName} has been delivered. Next delivery: ${nextDeliveryDate}`,
      category: NotificationCategory.SUBSCRIPTION,
      data: {
        subscriptionId,
        productName,
        nextDeliveryDate,
        deepLink: "/subscriptions",
      },
      actions: [
        { id: "view_subscription", title: "View Subscription" },
        { id: "rate_product", title: "Rate Product" },
      ],
    });
  }

  /**
   * Send subscription pause notification
   */
  async sendSubscriptionPausedNotification(
    subscriptionId: string,
    productName: string,
    resumeDate: string
  ): Promise<void> {
    await this.displayNotification({
      title: "Subscription Paused ⏸️",
      body: `Your ${productName} subscription has been paused until ${resumeDate}`,
      category: NotificationCategory.SUBSCRIPTION,
      data: {
        subscriptionId,
        productName,
        resumeDate,
        deepLink: "/subscriptions",
      },
      actions: [
        { id: "resume_subscription", title: "Resume Now" },
        { id: "view_subscription", title: "View Details" },
      ],
    });
  }
}

export default NotificationService.getInstance();
