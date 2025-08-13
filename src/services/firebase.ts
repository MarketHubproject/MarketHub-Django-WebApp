import messaging from "@react-native-firebase/messaging";
import analytics from '../utils/analyticsStub';
import { AppState, Platform } from "react-native";

export class FirebaseService {
  private static instance: FirebaseService;

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Initialize Firebase services
   */
  async initialize(): Promise<void> {
    try {
      // Request permission for iOS
      if (Platform.OS === "ios") {
        await this.requestPermission();
      }

      // Get FCM token
      await this.getFCMToken();

      // Set up message handlers
      this.setupMessageHandlers();

      // Initialize Analytics service (stub)
      await analytics.initialize();

      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  }

  /**
   * Request notification permissions (iOS)
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log("Notification permission granted");
      } else {
        console.log("Notification permission denied");
      }

      return enabled;
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  }

  /**
   * Get FCM token for device
   */
  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log("FCM Token:", token);

      // Send token to your backend
      await this.sendTokenToServer(token);

      return token;
    } catch (error) {
      console.error("FCM Token error:", error);
      return null;
    }
  }

  /**
   * Send token to backend server
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // TODO: Replace with your API endpoint
      // await fetch('/api/user/fcm-token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token })
      // });
      console.log("Token would be sent to server:", token);
    } catch (error) {
      console.error("Error sending token to server:", error);
    }
  }

  /**
   * Setup message handlers for FCM
   */
  private setupMessageHandlers(): void {
    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log("FCM Token refreshed:", token);
      await this.sendTokenToServer(token);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground message:", remoteMessage);
      // This will be handled by NotificationService
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("Background message:", remoteMessage);
      // This will be handled by NotificationService
    });

    // Handle notification opened from quit state
    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "App opened from notification (quit state):",
            remoteMessage
          );
          // Handle deep link
          await this.handleNotificationOpen(remoteMessage);
        }
      });

    // Handle notification opened from background
    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      console.log("App opened from notification (background):", remoteMessage);
      // Handle deep link
      await this.handleNotificationOpen(remoteMessage);
    });
  }

  /**
   * Handle notification open and deep linking
   */
  private async handleNotificationOpen(remoteMessage: any): Promise<void> {
    try {
      // Track analytics
      await this.trackNotificationOpen(remoteMessage);

      // Handle deep link
      const deepLink = remoteMessage.data?.deepLink;
      if (deepLink) {
        // This will be handled by NavigationService
        console.log("Deep link to handle:", deepLink);
      }
    } catch (error) {
      console.error("Error handling notification open:", error);
    }
  }

  /**
   * Track notification analytics
   */
  async trackNotificationOpen(remoteMessage: any): Promise<void> {
    try {
      await analytics.logEvent("notification_opened", {
        notification_id: remoteMessage.messageId,
        campaign_id: remoteMessage.data?.campaignId,
        category: remoteMessage.data?.category,
        screen_name: remoteMessage.data?.targetScreen,
      });
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  }

  /**
   * Track notification conversion
   */
  async trackNotificationConversion(
    notificationId: string,
    conversionType: string,
    value?: number
  ): Promise<void> {
    try {
      await analytics.logEvent("notification_conversion", {
        notification_id: notificationId,
        conversion_type: conversionType,
        value: value || 0,
      });
    } catch (error) {
      console.error("Conversion tracking error:", error);
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }
}

export default FirebaseService.getInstance();
