import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import { ARCapabilities, ARSession, AR3DModel } from "../shared/types";
import { logger } from "../utils";
// import analytics from "@react-native-firebase/analytics";
const analytics = { logEvent: () => {}, setUserId: () => {}, setUserProperty: () => {} } as any;

class ARService {
  private arSessions: Map<string, ARSession> = new Map();

  /**
   * Check device AR capabilities
   */
  async checkARCapabilities(): Promise<ARCapabilities> {
    try {
      const systemVersion = await DeviceInfo.getSystemVersion();
      const deviceType = await DeviceInfo.getDeviceType();
      const brand = await DeviceInfo.getBrand();

      const capabilities: ARCapabilities = {
        isARSupported: false,
        hasARCore: false,
        hasARKit: false,
        hasWebXR: false,
      };

      if (Platform.OS === "ios") {
        // ARKit is available on iOS 11+ and newer devices
        const majorVersion = parseInt(systemVersion.split(".")[0], 10);
        capabilities.hasARKit = majorVersion >= 11;
        capabilities.isARSupported = capabilities.hasARKit;
      } else if (Platform.OS === "android") {
        // ARCore support varies by device and Android version
        const majorVersion = parseInt(systemVersion.split(".")[0], 10);
        const isARCoreDevice = this.isARCoreCompatibleDevice(brand, deviceType);
        capabilities.hasARCore = majorVersion >= 7 && isARCoreDevice;
        capabilities.isARSupported = capabilities.hasARCore;
      }

      // WebXR is available in modern browsers (fallback option)
      capabilities.hasWebXR = true;

      logger.info("AR capabilities checked", {
        capabilities,
        platform: Platform.OS,
        systemVersion,
        deviceType,
        brand,
      });

      return capabilities;
    } catch (error) {
      logger.error("Failed to check AR capabilities", error);
      return {
        isARSupported: false,
        hasARCore: false,
        hasARKit: false,
        hasWebXR: true, // WebXR fallback
      };
    }
  }

  /**
   * Check if device is ARCore compatible (simplified list)
   */
  private isARCoreCompatibleDevice(brand: string, deviceType: string): boolean {
    const compatibleBrands = [
      "samsung",
      "google",
      "oneplus",
      "huawei",
      "xiaomi",
      "lg",
      "sony",
      "motorola",
      "nokia",
      "oppo",
      "vivo",
    ];

    return compatibleBrands.some((b) =>
      brand.toLowerCase().includes(b.toLowerCase())
    );
  }

  /**
   * Start AR/3D viewing session
   */
  startARSession(productId: number, viewType: "3d" | "ar"): ARSession {
    const sessionId = `ar_${productId}_${Date.now()}`;
    const session: ARSession = {
      sessionId,
      productId,
      startTime: new Date().toISOString(),
      viewType,
      platform: Platform.OS as "ios" | "android",
      interactions: 0,
    };

    this.arSessions.set(sessionId, session);

    // Track session start
    analytics().logEvent("ar_session_start", {
      product_id: productId,
      view_type: viewType,
      platform: Platform.OS,
    });

    logger.info("AR session started", { sessionId, productId, viewType });

    return session;
  }

  /**
   * End AR/3D viewing session
   */
  endARSession(sessionId: string): ARSession | null {
    const session = this.arSessions.get(sessionId);
    if (!session) {
      logger.warn("AR session not found", { sessionId });
      return null;
    }

    const endTime = new Date().toISOString();
    const duration = Math.round(
      (new Date(endTime).getTime() - new Date(session.startTime).getTime()) /
        1000
    );

    const completedSession: ARSession = {
      ...session,
      endTime,
      duration,
    };

    // Track session end and analytics
    analytics().logEvent("ar_session_end", {
      product_id: session.productId,
      view_type: session.viewType,
      platform: session.platform,
      duration,
      interactions: session.interactions,
    });

    // Remove from active sessions
    this.arSessions.delete(sessionId);

    logger.info("AR session ended", {
      sessionId,
      duration,
      interactions: session.interactions,
    });

    return completedSession;
  }

  /**
   * Track interaction in AR session
   */
  trackARInteraction(sessionId: string, interactionType: string): void {
    const session = this.arSessions.get(sessionId);
    if (session) {
      session.interactions++;

      analytics().logEvent("ar_interaction", {
        product_id: session.productId,
        session_id: sessionId,
        interaction_type: interactionType,
        view_type: session.viewType,
      });

      logger.debug("AR interaction tracked", {
        sessionId,
        interactionType,
        totalInteractions: session.interactions,
      });
    }
  }

  /**
   * Generate AR Quick Look URL for iOS
   */
  generateARQuickLookURL(modelUrl: string): string {
    if (Platform.OS === "ios") {
      return modelUrl; // iOS can handle USDZ files directly
    }
    return modelUrl;
  }

  /**
   * Generate WebXR URL for fallback
   */
  generateWebXRURL(modelUrl: string, productName: string): string {
    // Using model-viewer web component as fallback
    const encodedModelUrl = encodeURIComponent(modelUrl);
    const encodedProductName = encodeURIComponent(productName);

    return `https://markethub-ar.vercel.app/viewer?model=${encodedModelUrl}&name=${encodedProductName}`;
  }

  /**
   * Validate 3D model format and size
   */
  validateARModel(model: AR3DModel): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    if (!model.modelUrl || !model.modelUrl.startsWith("http")) {
      errors.push("Invalid model URL");
    }

    if (!["gltf", "usdz", "obj"].includes(model.format)) {
      errors.push("Unsupported model format");
    }

    if (model.fileSize > MAX_FILE_SIZE) {
      errors.push("Model file too large (max 50MB)");
    }

    if (Platform.OS === "ios" && model.format !== "usdz") {
      errors.push("iOS requires USDZ format for AR Quick Look");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get optimal model format for current platform
   */
  getOptimalModelFormat(): string {
    if (Platform.OS === "ios") {
      return "usdz"; // AR Quick Look
    } else if (Platform.OS === "android") {
      return "gltf"; // Scene Viewer
    }
    return "gltf"; // Web fallback
  }

  /**
   * Get AR session analytics summary
   */
  getSessionAnalytics(sessions: ARSession[]): {
    totalSessions: number;
    averageDuration: number;
    totalInteractions: number;
    mostViewedProducts: number[];
    platformBreakdown: Record<string, number>;
  } {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.duration !== undefined);

    const averageDuration =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
          completedSessions.length
        : 0;

    const totalInteractions = sessions.reduce(
      (sum, s) => sum + s.interactions,
      0
    );

    const productCounts: Record<number, number> = {};
    const platformCounts: Record<string, number> = {};

    sessions.forEach((session) => {
      productCounts[session.productId] =
        (productCounts[session.productId] || 0) + 1;
      platformCounts[session.platform] =
        (platformCounts[session.platform] || 0) + 1;
    });

    const mostViewedProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId]) => parseInt(productId, 10));

    return {
      totalSessions,
      averageDuration,
      totalInteractions,
      mostViewedProducts,
      platformBreakdown: platformCounts,
    };
  }
}

export default new ARService();
