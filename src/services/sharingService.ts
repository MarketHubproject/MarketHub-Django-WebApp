import Share from "react-native-share";
import { Alert, Platform } from "react-native";
import referralService from "./referralService";
import { logger } from "../utils";

export interface ShareOptions {
  title: string;
  message: string;
  url: string;
  imageUrl?: string;
  subject?: string;
}

export interface ProductShareData {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  userId: number;
  referralCode: string;
}

export interface OrderShareData {
  orderId: string;
  totalAmount: number;
  userId: number;
  referralCode: string;
  itemCount: number;
}

class SharingService {
  private static instance: SharingService;

  public static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService();
    }
    return SharingService.instance;
  }

  /**
   * Share product with referral link
   */
  async shareProduct(data: ProductShareData): Promise<boolean> {
    try {
      // Create referral link for product
      const shareableLink = await referralService.createProductReferralLink(
        data.productId,
        data.productName,
        data.userId,
        data.referralCode,
        data.productImage
      );

      const shareOptions: Share.Options = {
        title: shareableLink.title,
        message: shareableLink.message,
        url: shareableLink.url,
        subject: `Check out ${data.productName} on MarketHub`,
        ...this.getPlatformSpecificOptions(),
      };

      // Add image if available
      if (data.productImage) {
        shareOptions.urls = [data.productImage];
      }

      const result = await Share.open(shareOptions);

      if (result.success) {
        // Track successful share
        await this.trackShare("product", {
          productId: data.productId,
          productName: data.productName,
          referralCode: data.referralCode,
          shareMethod: result.app || "unknown",
        });
        return true;
      }

      return false;
    } catch (error: any) {
      if (error?.message !== "User did not share") {
        logger.error("Error sharing product", error, {
          productId: data.productId,
        });
        Alert.alert(
          "Share Error",
          "Unable to share this product. Please try again."
        );
      }
      return false;
    }
  }

  /**
   * Share order success with referral link
   */
  async shareOrderSuccess(data: OrderShareData): Promise<boolean> {
    try {
      // Create referral link for order success
      const shareableLink =
        await referralService.createOrderSuccessReferralLink(
          data.orderId,
          data.userId,
          data.referralCode,
          data.totalAmount
        );

      const shareOptions: Share.Options = {
        title: shareableLink.title,
        message: shareableLink.message,
        url: shareableLink.url,
        subject: "Great shopping experience on MarketHub!",
        ...this.getPlatformSpecificOptions(),
      };

      const result = await Share.open(shareOptions);

      if (result.success) {
        // Track successful share
        await this.trackShare("order_success", {
          orderId: data.orderId,
          totalAmount: data.totalAmount,
          referralCode: data.referralCode,
          shareMethod: result.app || "unknown",
        });
        return true;
      }

      return false;
    } catch (error: any) {
      if (error?.message !== "User did not share") {
        logger.error("Error sharing order success", error, {
          orderId: data.orderId,
        });
        Alert.alert(
          "Share Error",
          "Unable to share your order. Please try again."
        );
      }
      return false;
    }
  }

  /**
   * Share general referral link
   */
  async shareReferralLink(
    userId: number,
    referralCode: string,
    userName: string
  ): Promise<boolean> {
    try {
      // Create general referral link
      const shareableLink = await referralService.createReferralLink(
        userId,
        referralCode,
        "general_share"
      );

      const shareOptions: Share.Options = {
        title: shareableLink.title,
        message: shareableLink.message,
        url: shareableLink.url,
        subject: "Join me on MarketHub!",
        ...this.getPlatformSpecificOptions(),
      };

      const result = await Share.open(shareOptions);

      if (result.success) {
        // Track successful share
        await this.trackShare("referral", {
          referralCode,
          userName,
          shareMethod: result.app || "unknown",
        });
        return true;
      }

      return false;
    } catch (error: any) {
      if (error?.message !== "User did not share") {
        logger.error("Error sharing referral link", error, {
          userId,
          referralCode,
        });
        Alert.alert(
          "Share Error",
          "Unable to share your referral link. Please try again."
        );
      }
      return false;
    }
  }

  /**
   * Share to specific platform
   */
  async shareToSpecificPlatform(
    platform:
      | "whatsapp"
      | "facebook"
      | "twitter"
      | "instagram"
      | "sms"
      | "email",
    shareOptions: ShareOptions
  ): Promise<boolean> {
    try {
      const options: Share.Options = {
        title: shareOptions.title,
        message: shareOptions.message,
        url: shareOptions.url,
        subject: shareOptions.subject,
      };

      let social: Share.Social | undefined;

      switch (platform) {
        case "whatsapp":
          social = Share.Social.WHATSAPP;
          break;
        case "facebook":
          social = Share.Social.FACEBOOK;
          break;
        case "twitter":
          social = Share.Social.TWITTER;
          break;
        case "instagram":
          social = Share.Social.INSTAGRAM;
          break;
        case "sms":
          social = Share.Social.SMS;
          break;
        case "email":
          social = Share.Social.EMAIL;
          break;
      }

      if (social) {
        const result = await Share.shareSingle({
          ...options,
          social,
        });
        return result.success || false;
      }

      return false;
    } catch (error: any) {
      if (error?.message !== "User did not share") {
        logger.error(`Error sharing to ${platform}`, error);
        Alert.alert(
          "Share Error",
          `Unable to share to ${platform}. Please try again.`
        );
      }
      return false;
    }
  }

  /**
   * Get available sharing apps
   */
  async getAvailableShareApps(): Promise<Share.ShareAsset[]> {
    try {
      const availableApps = await Share.isPackageInstalled();
      return availableApps || [];
    } catch (error) {
      logger.error("Error getting available share apps", error);
      return [];
    }
  }

  /**
   * Create shareable content for custom sharing
   */
  async createShareableContent(
    type: "product" | "order" | "referral",
    data: any
  ): Promise<ShareOptions> {
    try {
      let shareableLink;

      switch (type) {
        case "product":
          shareableLink = await referralService.createProductReferralLink(
            data.productId,
            data.productName,
            data.userId,
            data.referralCode,
            data.productImage
          );
          break;
        case "order":
          shareableLink = await referralService.createOrderSuccessReferralLink(
            data.orderId,
            data.userId,
            data.referralCode,
            data.totalAmount
          );
          break;
        case "referral":
          shareableLink = await referralService.createReferralLink(
            data.userId,
            data.referralCode,
            "custom_share"
          );
          break;
        default:
          throw new Error(`Unsupported share type: ${type}`);
      }

      return {
        title: shareableLink.title,
        message: shareableLink.message,
        url: shareableLink.url,
        subject: shareableLink.title,
        imageUrl: data.imageUrl,
      };
    } catch (error) {
      logger.error("Error creating shareable content", error);
      throw error;
    }
  }

  /**
   * Copy link to clipboard
   */
  async copyToClipboard(shareData: ShareOptions): Promise<boolean> {
    try {
      const { Clipboard } = await import("@react-native-clipboard/clipboard");
      const content = `${shareData.message}\n\n${shareData.url}`;
      await Clipboard.setString(content);

      Alert.alert("Copied!", "Link copied to clipboard");
      return true;
    } catch (error) {
      logger.error("Error copying to clipboard", error);
      Alert.alert("Error", "Unable to copy link to clipboard");
      return false;
    }
  }

  /**
   * Get platform-specific share options
   */
  private getPlatformSpecificOptions(): Partial<Share.Options> {
    if (Platform.OS === "ios") {
      return {
        activityItemSources: [
          {
            placeholderItem: { type: "text", content: "" },
            item: {
              default: { type: "text", content: "" },
            },
            linkMetadata: {
              title: "MarketHub",
            },
          },
        ],
      };
    }

    return {};
  }

  /**
   * Track successful share event
   */
  private async trackShare(type: string, metadata: any): Promise<void> {
    try {
      // Track with analytics service
      logger.info("Share completed", {
        type,
        ...metadata,
        timestamp: new Date().toISOString(),
      });

      // You could also send this to your analytics service
      // await analyticsService.trackEvent('share_completed', { type, ...metadata });
    } catch (error) {
      logger.error("Error tracking share", error);
    }
  }

  /**
   * Show share options menu
   */
  async showShareMenu(options: ShareOptions): Promise<boolean> {
    try {
      const shareOptions: Share.Options = {
        title: options.title,
        message: options.message,
        url: options.url,
        subject: options.subject,
        ...this.getPlatformSpecificOptions(),
      };

      const result = await Share.open(shareOptions);
      return result.success || false;
    } catch (error: any) {
      if (error?.message !== "User did not share") {
        logger.error("Error showing share menu", error);
      }
      return false;
    }
  }
}

export default SharingService.getInstance();
