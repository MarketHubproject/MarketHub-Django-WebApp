import { Linking } from "react-native";
import branch from "react-native-branch";
import navigationService from "./navigationService";
import firebaseService from "./firebase";
import referralService from "./referralService";

export interface DeepLinkData {
  screen: string;
  params?: any;
  campaignId?: string;
  source?: string;
}

export class DeepLinkService {
  private static instance: DeepLinkService;

  public static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  /**
   * Initialize deep linking services
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Branch.io
      await this.initializeBranch();

      // Setup URL scheme handling
      this.setupURLSchemeHandling();

      console.log("Deep linking initialized successfully");
    } catch (error) {
      console.error("Deep linking initialization error:", error);
    }
  }

  /**
   * Initialize Branch.io
   */
  private async initializeBranch(): Promise<void> {
    try {
      // Subscribe to Branch.io link opens
      branch.subscribe(({ error, params, uri }) => {
        if (error) {
          console.error("Branch.io error:", error);
          return;
        }

        console.log("Branch.io link opened:", { params, uri });

        if (params) {
          this.handleBranchData(params);
        }
      });

      console.log("Branch.io initialized");
    } catch (error) {
      console.error("Branch.io initialization error:", error);
    }
  }

  /**
   * Setup URL scheme handling for custom URLs
   */
  private setupURLSchemeHandling(): void {
    // Handle URL when app is already running
    Linking.addEventListener("url", ({ url }) => {
      console.log("URL scheme opened:", url);
      this.handleCustomURL(url);
    });

    // Handle URL when app is launched from link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL:", url);
        this.handleCustomURL(url);
      }
    });
  }

  /**
   * Handle Branch.io deep link data
   */
  private async handleBranchData(params: any): Promise<void> {
    try {
      // Handle referral links
      if (params.referralCode && params.referrerUserId) {
        await this.handleReferralLink(params);
      }

      // Track analytics
      await firebaseService.trackNotificationOpen({
        messageId: params.campaignId || "branch_link",
        data: {
          source: "branch",
          ...params,
        },
      });

      // Extract navigation data
      const deepLinkData: DeepLinkData = {
        screen: params.screen || params.$deeplink_path || "Home",
        params: this.extractNavigationParams(params),
        campaignId: params.campaignId,
        source: "branch",
      };

      // Navigate to appropriate screen
      await this.navigateToScreen(deepLinkData);
    } catch (error) {
      console.error("Error handling Branch data:", error);
    }
  }

  /**
   * Handle custom URL scheme
   */
  private async handleCustomURL(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);

      let deepLinkData: DeepLinkData;

      // Parse different URL patterns
      if (pathSegments.length === 0) {
        deepLinkData = { screen: "Home" };
      } else {
        deepLinkData = this.parseURLPath(pathSegments, urlObj.searchParams);
      }

      // Track analytics
      await firebaseService.trackNotificationOpen({
        messageId: "custom_url",
        data: {
          source: "custom_url",
          url,
        },
      });

      // Navigate to appropriate screen
      await this.navigateToScreen(deepLinkData);
    } catch (error) {
      console.error("Error handling custom URL:", error);
      // Fallback to home screen
      navigationService.navigate("Home");
    }
  }

  /**
   * Parse URL path segments into navigation data
   */
  private parseURLPath(
    pathSegments: string[],
    searchParams: URLSearchParams
  ): DeepLinkData {
    const [firstSegment, secondSegment] = pathSegments;

    switch (firstSegment) {
      case "product":
        return {
          screen: "ProductDetail",
          params: { productId: secondSegment },
        };

      case "order":
        return {
          screen: "OrderDetails",
          params: { orderId: secondSegment },
        };

      case "category":
        return {
          screen: "ProductCategories",
          params: { categoryId: secondSegment },
        };

      case "cart":
        return { screen: "Cart" };

      case "profile":
        return { screen: "Profile" };

      case "favorites":
        return { screen: "Favorites" };

      case "search":
        return {
          screen: "ProductSearch",
          params: {
            query: searchParams.get("q") || searchParams.get("query"),
            category: searchParams.get("category"),
          },
        };

      default:
        return { screen: "Home" };
    }
  }

  /**
   * Extract navigation parameters from Branch.io params
   */
  private extractNavigationParams(params: any): any {
    const navigationParams: any = {};

    // Common parameters
    if (params.productId) navigationParams.productId = params.productId;
    if (params.orderId) navigationParams.orderId = params.orderId;
    if (params.categoryId) navigationParams.categoryId = params.categoryId;
    if (params.query) navigationParams.query = params.query;
    if (params.promoCode) navigationParams.promoCode = params.promoCode;
    if (params.referralCode)
      navigationParams.referralCode = params.referralCode;

    return navigationParams;
  }

  /**
   * Navigate to specific screen based on deep link data
   */
  private async navigateToScreen(deepLinkData: DeepLinkData): Promise<void> {
    try {
      // Add delay to ensure navigation is ready
      setTimeout(() => {
        const { screen, params } = deepLinkData;

        switch (screen) {
          case "ProductDetail":
            navigationService.navigate("Products", {
              screen: "ProductDetail",
              params: params,
            });
            break;

          case "OrderDetails":
            navigationService.navigate("Profile", {
              screen: "OrderDetails",
              params: params,
            });
            break;

          case "ProductCategories":
            navigationService.navigate("Products", {
              screen: "ProductCategories",
              params: params,
            });
            break;

          case "ProductSearch":
            navigationService.navigate("Products", {
              screen: "ProductSearch",
              params: params,
            });
            break;

          case "Cart":
            navigationService.navigate("Cart");
            break;

          case "Profile":
            navigationService.navigate("Profile");
            break;

          case "Favorites":
            navigationService.navigate("Favorites");
            break;

          case "Settings":
            navigationService.navigate("Profile", {
              screen: "Settings",
            });
            break;

          default:
            navigationService.navigate("Home");
            break;
        }
      }, 1000); // 1 second delay
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }

  /**
   * Create Branch.io deep link
   */
  async createBranchLink(data: {
    screen: string;
    params?: any;
    title?: string;
    description?: string;
    imageUrl?: string;
    campaignId?: string;
  }): Promise<string> {
    try {
      const branchUniversalObject = await branch.createBranchUniversalObject(
        `${data.screen}_${Date.now()}`,
        {
          locallyIndex: true,
          title: data.title || "MarketHub",
          contentDescription:
            data.description || "Check this out on MarketHub!",
          contentImageUrl: data.imageUrl,
          contentMetadata: {
            customMetadata: {
              screen: data.screen,
              campaignId: data.campaignId,
              ...data.params,
            },
          },
        }
      );

      const linkProperties = {
        feature: "sharing",
        channel: "app",
        campaign: data.campaignId || "general",
      };

      const controlParams = {
        $desktop_url: "https://your-website.com",
        $fallback_url: "https://your-website.com",
        screen: data.screen,
        ...data.params,
      };

      const { url } = await branchUniversalObject.generateShortUrl(
        linkProperties,
        controlParams
      );

      console.log("Branch link created:", url);
      return url;
    } catch (error) {
      console.error("Error creating Branch link:", error);
      return "";
    }
  }

  /**
   * Handle deep link from notification
   */
  async handleNotificationDeepLink(
    deepLink: string,
    data?: any
  ): Promise<void> {
    try {
      console.log("Handling notification deep link:", deepLink, data);

      // Track analytics
      if (data?.notificationId) {
        await firebaseService.trackNotificationConversion(
          data.notificationId,
          "deep_link_navigation"
        );
      }

      // Handle different deep link formats
      if (deepLink.startsWith("/")) {
        // Custom URL format
        await this.handleCustomURL(`markethub://${deepLink.substring(1)}`);
      } else if (deepLink.startsWith("http")) {
        // Branch.io or other web link
        Linking.openURL(deepLink);
      } else {
        // Direct screen navigation
        const segments = deepLink.split("/");
        const deepLinkData = this.parseURLPath(segments, new URLSearchParams());
        await this.navigateToScreen(deepLinkData);
      }
    } catch (error) {
      console.error("Error handling notification deep link:", error);
    }
  }

  /**
   * Create shareable product link
   */
  async createProductShareLink(
    productId: string,
    productName: string,
    imageUrl?: string
  ): Promise<string> {
    return this.createBranchLink({
      screen: "ProductDetail",
      params: { productId },
      title: productName,
      description: `Check out ${productName} on MarketHub!`,
      imageUrl,
      campaignId: "product_share",
    });
  }

  /**
   * Create promotional campaign link
   */
  async createPromoLink(
    promoCode: string,
    title: string,
    description: string
  ): Promise<string> {
    return this.createBranchLink({
      screen: "Home",
      params: { promoCode },
      title,
      description,
      campaignId: "promo_campaign",
    });
  }

  /**
   * Handle referral link data
   */
  private async handleReferralLink(params: any): Promise<void> {
    try {
      const referralData = {
        referralCode: params.referralCode,
        userId: parseInt(params.referrerUserId),
        referrerName: params.referrerName,
        campaign: params.campaign || "general",
      };

      // Store referral data for when user registers/logs in
      await referralService.storeIncomingReferral(referralData);

      // Track referral click
      await referralService.trackReferralClick(
        referralData.referralCode,
        "branch_link"
      );

      console.log("Referral link handled:", referralData);
    } catch (error) {
      console.error("Error handling referral link:", error);
    }
  }
}

export default DeepLinkService.getInstance();
