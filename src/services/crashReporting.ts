import crashlytics from "@react-native-firebase/crashlytics";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import Config from "react-native-config";
import DeviceInfo from "react-native-device-info";

export interface CrashReportingConfig {
  enableCrashlytics: boolean;
  enableSentry: boolean;
  environment: string;
  userId?: string;
  userMetadata?: Record<string, any>;
}

export interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class CrashReportingService {
  private initialized = false;
  private config: CrashReportingConfig = {
    enableCrashlytics: false,
    enableSentry: false,
    environment: "development",
  };

  /**
   * Initialize crash reporting services
   */
  async initialize(config: Partial<CrashReportingConfig> = {}): Promise<void> {
    if (this.initialized) {
      console.warn("CrashReportingService already initialized");
      return;
    }

    this.config = {
      enableCrashlytics: Config.ENABLE_CRASHLYTICS === "true",
      enableSentry: Config.ENABLE_SENTRY === "true",
      environment: Config.ENVIRONMENT || "development",
      ...config,
    };

    // Only enable in production or when explicitly enabled
    const shouldEnable =
      this.config.environment === "production" || __DEV__ === false;

    try {
      // Initialize Firebase Crashlytics
      if (this.config.enableCrashlytics && shouldEnable) {
        await this.initializeCrashlytics();
      }

      // Initialize Sentry
      if (this.config.enableSentry && Config.SENTRY_DSN) {
        await this.initializeSentry();
      }

      // Set common device information
      await this.setDeviceContext();

      this.initialized = true;
      console.log("CrashReportingService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize crash reporting:", error);
    }
  }

  /**
   * Initialize Firebase Crashlytics
   */
  private async initializeCrashlytics(): Promise<void> {
    try {
      // Enable collection in production
      await crashlytics().setCrashlyticsCollectionEnabled(true);

      // Set custom attributes
      await crashlytics().setAttributes({
        environment: this.config.environment,
        platform: Platform.OS,
        version: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
      });

      console.log("Crashlytics initialized");
    } catch (error) {
      console.error("Crashlytics initialization failed:", error);
    }
  }

  /**
   * Initialize Sentry
   */
  private async initializeSentry(): Promise<void> {
    try {
      Sentry.init({
        dsn: Config.SENTRY_DSN,
        environment: this.config.environment,
        enabled: this.config.environment === "production",
        debug: __DEV__,
        attachStacktrace: true,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        beforeSend: (event) => {
          // Filter out non-critical errors in development
          if (__DEV__ && event.level === "warning") {
            return null;
          }
          return event;
        },
        integrations: [
          new Sentry.ReactNativeTracing({
            routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
          }),
        ],
        tracesSampleRate: this.config.environment === "production" ? 0.1 : 1.0,
      });

      console.log("Sentry initialized");
    } catch (error) {
      console.error("Sentry initialization failed:", error);
    }
  }

  /**
   * Set device and app context information
   */
  private async setDeviceContext(): Promise<void> {
    try {
      const deviceInfo = {
        brand: DeviceInfo.getBrand(),
        model: DeviceInfo.getModel(),
        systemVersion: DeviceInfo.getSystemVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        version: DeviceInfo.getVersion(),
        bundleId: DeviceInfo.getBundleId(),
        deviceId: await DeviceInfo.getDeviceId(),
        isTablet: DeviceInfo.isTablet(),
        hasNotch: DeviceInfo.hasNotch(),
      };

      // Set Crashlytics attributes
      if (this.config.enableCrashlytics) {
        await crashlytics().setAttributes(deviceInfo);
      }

      // Set Sentry context
      if (this.config.enableSentry) {
        Sentry.setContext("device", deviceInfo);
      }
    } catch (error) {
      console.error("Failed to set device context:", error);
    }
  }

  /**
   * Set user information for crash reporting
   */
  async setUser(
    userId: string,
    userInfo: Record<string, any> = {}
  ): Promise<void> {
    if (!this.initialized) {
      console.warn("CrashReportingService not initialized");
      return;
    }

    try {
      this.config.userId = userId;
      this.config.userMetadata = userInfo;

      // Set user in Crashlytics
      if (this.config.enableCrashlytics) {
        await crashlytics().setUserId(userId);
        await crashlytics().setAttributes({
          userEmail: userInfo.email || "",
          userName: userInfo.name || "",
          userTier: userInfo.tier || "free",
        });
      }

      // Set user in Sentry
      if (this.config.enableSentry) {
        Sentry.setUser({
          id: userId,
          email: userInfo.email,
          username: userInfo.name,
          ...userInfo,
        });
      }
    } catch (error) {
      console.error("Failed to set user information:", error);
    }
  }

  /**
   * Clear user information
   */
  async clearUser(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.config.userId = undefined;
      this.config.userMetadata = undefined;

      // Clear user in Crashlytics
      if (this.config.enableCrashlytics) {
        await crashlytics().setUserId("");
      }

      // Clear user in Sentry
      if (this.config.enableSentry) {
        Sentry.setUser(null);
      }
    } catch (error) {
      console.error("Failed to clear user information:", error);
    }
  }

  /**
   * Record a non-fatal error
   */
  recordError(error: Error, context: ErrorContext = {}): void {
    if (!this.initialized) return;

    try {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context,
      };

      // Record in Crashlytics
      if (this.config.enableCrashlytics) {
        crashlytics().recordError(error);

        if (context.screen) {
          crashlytics().setAttribute("currentScreen", context.screen);
        }
        if (context.action) {
          crashlytics().setAttribute("lastAction", context.action);
        }
        if (context.metadata) {
          Object.entries(context.metadata).forEach(([key, value]) => {
            crashlytics().setAttribute(key, String(value));
          });
        }
      }

      // Record in Sentry
      if (this.config.enableSentry) {
        Sentry.withScope((scope) => {
          if (context.screen) {
            scope.setTag("screen", context.screen);
          }
          if (context.action) {
            scope.setTag("action", context.action);
          }
          if (context.metadata) {
            scope.setContext("metadata", context.metadata);
          }
          Sentry.captureException(error);
        });
      }

      // Log in development
      if (__DEV__) {
        console.error("Recorded error:", errorInfo);
      }
    } catch (recordError) {
      console.error("Failed to record error:", recordError);
    }
  }

  /**
   * Log a custom message/event
   */
  logMessage(
    message: string,
    level: "debug" | "info" | "warning" | "error" = "info"
  ): void {
    if (!this.initialized) return;

    try {
      // Log in Crashlytics
      if (this.config.enableCrashlytics) {
        crashlytics().log(message);
      }

      // Log in Sentry
      if (this.config.enableSentry) {
        Sentry.addBreadcrumb({
          message,
          level: level as any,
          timestamp: Date.now(),
        });
      }

      // Log in development
      if (__DEV__) {
        console.log(`[${level.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error("Failed to log message:", error);
    }
  }

  /**
   * Set a custom key-value pair
   */
  setAttribute(key: string, value: string | number | boolean): void {
    if (!this.initialized) return;

    try {
      // Set in Crashlytics
      if (this.config.enableCrashlytics) {
        crashlytics().setAttribute(key, String(value));
      }

      // Set in Sentry
      if (this.config.enableSentry) {
        Sentry.setTag(key, String(value));
      }
    } catch (error) {
      console.error("Failed to set attribute:", error);
    }
  }

  /**
   * Track a screen view
   */
  trackScreen(screenName: string, properties: Record<string, any> = {}): void {
    if (!this.initialized) return;

    try {
      this.setAttribute("currentScreen", screenName);
      this.logMessage(`Screen viewed: ${screenName}`, "info");

      // Add screen properties
      Object.entries(properties).forEach(([key, value]) => {
        this.setAttribute(`screen_${key}`, value);
      });
    } catch (error) {
      console.error("Failed to track screen:", error);
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.initialized) return;

    try {
      this.logMessage(`Event: ${eventName}`, "info");

      // Add event properties as attributes
      Object.entries(properties).forEach(([key, value]) => {
        this.setAttribute(`event_${key}`, value);
      });

      // Add as breadcrumb in Sentry
      if (this.config.enableSentry) {
        Sentry.addBreadcrumb({
          message: `Event: ${eventName}`,
          category: "custom",
          data: properties,
          level: "info",
        });
      }
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }

  /**
   * Force a crash (for testing purposes only)
   */
  forceCrash(): void {
    if (__DEV__ && this.config.enableCrashlytics) {
      crashlytics().crash();
    } else {
      console.warn("Force crash is only available in development mode");
    }
  }

  /**
   * Check if crash reporting is initialized and enabled
   */
  isEnabled(): boolean {
    return (
      this.initialized &&
      (this.config.enableCrashlytics || this.config.enableSentry)
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): CrashReportingConfig {
    return { ...this.config };
  }
}

// Create and export singleton instance
export const crashReportingService = new CrashReportingService();

// Export convenience functions
export const recordError = (error: Error, context?: ErrorContext) =>
  crashReportingService.recordError(error, context);

export const logMessage = (
  message: string,
  level?: "debug" | "info" | "warning" | "error"
) => crashReportingService.logMessage(message, level);

export const trackScreen = (
  screenName: string,
  properties?: Record<string, any>
) => crashReportingService.trackScreen(screenName, properties);

export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => crashReportingService.trackEvent(eventName, properties);

export const setUser = (userId: string, userInfo?: Record<string, any>) =>
  crashReportingService.setUser(userId, userInfo);

export const clearUser = () => crashReportingService.clearUser();

export default crashReportingService;
