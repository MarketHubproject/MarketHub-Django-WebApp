import AsyncStorage from "@react-native-async-storage/async-storage";
import branch from "react-native-branch";
import apiService from "./api";
import { logger } from "../utils";

export interface ReferralData {
  referralCode: string;
  userId: number;
  referrerName?: string;
  campaign?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  availableCoupons: ReferralCoupon[];
  referralHistory: ReferralHistoryItem[];
}

export interface ReferralCoupon {
  id: string;
  code: string;
  type: "referrer" | "referee";
  discount: number;
  discountType: "percentage" | "fixed";
  expiresAt: string;
  isUsed: boolean;
  orderId?: string;
  createdAt: string;
}

export interface ReferralHistoryItem {
  id: string;
  referredUserId?: number;
  referredUserName?: string;
  referredUserEmail?: string;
  status: "pending" | "successful" | "expired";
  reward?: ReferralCoupon;
  createdAt: string;
  completedAt?: string;
}

export interface ShareableLink {
  url: string;
  title: string;
  message: string;
}

class ReferralService {
  private static instance: ReferralService;
  private readonly REFERRAL_STORAGE_KEY = "@MarketHub:referralCode";
  private readonly USER_REFERRAL_CODE_KEY = "@MarketHub:userReferralCode";

  public static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  /**
   * Generate user's unique referral code
   */
  async generateUserReferralCode(
    userId: number,
    userName: string
  ): Promise<string> {
    try {
      // Check if user already has a referral code
      let referralCode = await AsyncStorage.getItem(
        `${this.USER_REFERRAL_CODE_KEY}:${userId}`
      );

      if (!referralCode) {
        // Generate new referral code (combination of username and random characters)
        const cleanUserName = userName
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();
        referralCode = `${cleanUserName.substring(0, 6)}${randomSuffix}`;

        // Store referral code
        await AsyncStorage.setItem(
          `${this.USER_REFERRAL_CODE_KEY}:${userId}`,
          referralCode
        );

        // Register referral code with backend
        await apiService.post("/referrals/register-code", {
          userId,
          referralCode,
        });
      }

      return referralCode;
    } catch (error) {
      logger.error("Error generating referral code", error);
      throw error;
    }
  }

  /**
   * Create shareable referral link with Branch.io
   */
  async createReferralLink(
    userId: number,
    referralCode: string,
    campaign: string = "general"
  ): Promise<ShareableLink> {
    try {
      const branchUniversalObject = await branch.createBranchUniversalObject(
        `referral_${referralCode}_${Date.now()}`,
        {
          locallyIndex: true,
          title: "Join MarketHub with my referral!",
          contentDescription:
            "Get exclusive deals and rewards when you join MarketHub with my referral link.",
          contentImageUrl: "https://your-app-logo-url.com/logo.png", // Replace with actual logo URL
          contentMetadata: {
            customMetadata: {
              screen: "Referral",
              referralCode,
              referrerUserId: userId.toString(),
              campaign,
              type: "referral",
            },
          },
        }
      );

      const linkProperties = {
        feature: "referral",
        channel: "app_share",
        campaign: `referral_${campaign}`,
        tags: ["referral", "social_sharing"],
      };

      const controlParams = {
        $desktop_url: "https://your-website.com/signup",
        $fallback_url: "https://your-website.com/signup",
        $ios_url: "https://apps.apple.com/app/markethub",
        $android_url:
          "https://play.google.com/store/apps/details?id=com.markethub",
        referralCode,
        referrerUserId: userId.toString(),
        campaign,
      };

      const { url } = await branchUniversalObject.generateShortUrl(
        linkProperties,
        controlParams
      );

      return {
        url,
        title: "Join MarketHub!",
        message: `Hey! I'm using MarketHub for amazing deals and thought you'd love it too. Join with my referral code ${referralCode} and we both get exclusive rewards! ${url}`,
      };
    } catch (error) {
      logger.error("Error creating referral link", error);
      throw error;
    }
  }

  /**
   * Create shareable product link with referral
   */
  async createProductReferralLink(
    productId: string,
    productName: string,
    userId: number,
    referralCode: string,
    productImageUrl?: string
  ): Promise<ShareableLink> {
    try {
      const branchUniversalObject = await branch.createBranchUniversalObject(
        `product_referral_${productId}_${referralCode}_${Date.now()}`,
        {
          locallyIndex: true,
          title: `Check out ${productName} on MarketHub!`,
          contentDescription: `I found this amazing product on MarketHub. Use my referral code ${referralCode} to get special deals!`,
          contentImageUrl: productImageUrl,
          contentMetadata: {
            customMetadata: {
              screen: "ProductDetail",
              productId,
              referralCode,
              referrerUserId: userId.toString(),
              campaign: "product_referral",
              type: "product_referral",
            },
          },
        }
      );

      const linkProperties = {
        feature: "product_referral",
        channel: "app_share",
        campaign: "product_referral",
        tags: ["referral", "product", "social_sharing"],
      };

      const controlParams = {
        $desktop_url: `https://your-website.com/product/${productId}`,
        $fallback_url: `https://your-website.com/product/${productId}`,
        productId,
        referralCode,
        referrerUserId: userId.toString(),
      };

      const { url } = await branchUniversalObject.generateShortUrl(
        linkProperties,
        controlParams
      );

      return {
        url,
        title: `${productName} - MarketHub`,
        message: `Check out ${productName} on MarketHub! Use my referral code ${referralCode} for special deals. ${url}`,
      };
    } catch (error) {
      logger.error("Error creating product referral link", error);
      throw error;
    }
  }

  /**
   * Create shareable order success link with referral
   */
  async createOrderSuccessReferralLink(
    orderId: string,
    userId: number,
    referralCode: string,
    totalAmount: number
  ): Promise<ShareableLink> {
    try {
      const branchUniversalObject = await branch.createBranchUniversalObject(
        `order_success_referral_${orderId}_${Date.now()}`,
        {
          locallyIndex: true,
          title: "Just made a great purchase on MarketHub!",
          contentDescription: `I just saved money shopping on MarketHub! Use my referral code ${referralCode} to get exclusive deals.`,
          contentMetadata: {
            customMetadata: {
              screen: "Home",
              referralCode,
              referrerUserId: userId.toString(),
              campaign: "order_success_referral",
              type: "order_success_referral",
              orderId,
              orderAmount: totalAmount.toString(),
            },
          },
        }
      );

      const linkProperties = {
        feature: "order_success_referral",
        channel: "app_share",
        campaign: "order_success_referral",
        tags: ["referral", "order_success", "social_sharing"],
      };

      const controlParams = {
        $desktop_url: "https://your-website.com/signup",
        $fallback_url: "https://your-website.com/signup",
        referralCode,
        referrerUserId: userId.toString(),
        campaign: "order_success",
      };

      const { url } = await branchUniversalObject.generateShortUrl(
        linkProperties,
        controlParams
      );

      return {
        url,
        title: "Shop smart with MarketHub!",
        message: `Just saved R${totalAmount.toFixed(
          2
        )} shopping on MarketHub! 🛍️ You can save too with my referral code ${referralCode}. ${url}`,
      };
    } catch (error) {
      logger.error("Error creating order success referral link", error);
      throw error;
    }
  }

  /**
   * Store incoming referral code when app is opened via referral link
   */
  async storeIncomingReferral(referralData: ReferralData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.REFERRAL_STORAGE_KEY,
        JSON.stringify(referralData)
      );
      logger.info("Stored incoming referral data", { referralData });
    } catch (error) {
      logger.error("Error storing referral data", error);
    }
  }

  /**
   * Get stored referral code for new user registration
   */
  async getStoredReferral(): Promise<ReferralData | null> {
    try {
      const stored = await AsyncStorage.getItem(this.REFERRAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      logger.error("Error getting stored referral", error);
      return null;
    }
  }

  /**
   * Clear stored referral after successful registration
   */
  async clearStoredReferral(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.REFERRAL_STORAGE_KEY);
    } catch (error) {
      logger.error("Error clearing stored referral", error);
    }
  }

  /**
   * Apply referral code during registration
   */
  async applyReferralCode(
    referralCode: string,
    newUserId: number
  ): Promise<{ success: boolean; rewards?: any }> {
    try {
      const response = await apiService.post("/referrals/apply", {
        referralCode,
        newUserId,
      });

      // Clear stored referral after successful application
      await this.clearStoredReferral();

      return response.data;
    } catch (error) {
      logger.error("Error applying referral code", error);
      throw error;
    }
  }

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: number): Promise<ReferralStats> {
    try {
      const response = await apiService.get(`/referrals/stats/${userId}`);
      return response.data;
    } catch (error) {
      logger.error("Error getting referral stats", error);
      // Return default stats in case of error
      return {
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        availableCoupons: [],
        referralHistory: [],
      };
    }
  }

  /**
   * Track referral link click
   */
  async trackReferralClick(
    referralCode: string,
    source: string
  ): Promise<void> {
    try {
      await apiService.post("/referrals/track-click", {
        referralCode,
        source,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error tracking referral click", error);
    }
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(
    referralCode: string
  ): Promise<{ valid: boolean; referrer?: any }> {
    try {
      const response = await apiService.get(
        `/referrals/validate/${referralCode}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error validating referral code", error);
      return { valid: false };
    }
  }

  /**
   * Use referral coupon
   */
  async useReferralCoupon(
    couponId: string,
    orderId: string
  ): Promise<{ success: boolean; discount?: number }> {
    try {
      const response = await apiService.post(
        `/referrals/coupons/${couponId}/use`,
        {
          orderId,
        }
      );
      return response.data;
    } catch (error) {
      logger.error("Error using referral coupon", error);
      throw error;
    }
  }
}

export default ReferralService.getInstance();
