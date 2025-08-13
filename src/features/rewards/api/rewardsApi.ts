import apiService from "../../../services/api";
import {
  PointsBalanceResponse,
  EarnRulesResponse,
  RedemptionOptionsResponse,
  UserVouchersResponse,
  PointsTransactionsResponse,
  LoyaltyStatusResponse,
  RedeemPointsRequest,
  RedeemPointsResponse,
  RewardsApiResponse,
} from "../../../shared/types/rewards";

class RewardsApiService {
  // Get user's current points balance
  async getPointsBalance(): Promise<PointsBalanceResponse> {
    try {
      const response = await (apiService as any).api.get("/rewards/balance/");
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get loyalty program status and tier information
  async getLoyaltyStatus(): Promise<LoyaltyStatusResponse> {
    try {
      const response = await (apiService as any).api.get(
        "/rewards/loyalty-status/"
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get active earning rules
  async getEarnRules(): Promise<EarnRulesResponse> {
    try {
      const response = await (apiService as any).api.get(
        "/rewards/earn-rules/"
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get available redemption options
  async getRedemptionOptions(
    tier?: string
  ): Promise<RedemptionOptionsResponse> {
    try {
      const params: any = {};
      if (tier) params.tier = tier;

      const response = await (apiService as any).api.get(
        "/rewards/redemption-options/",
        { params }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get user's vouchers
  async getUserVouchers(
    status?: "available" | "used" | "expired"
  ): Promise<UserVouchersResponse> {
    try {
      const params: any = {};
      if (status) params.status = status;

      const response = await (apiService as any).api.get("/rewards/vouchers/", {
        params,
      });
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get points transaction history
  async getPointsTransactions(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PointsTransactionsResponse> {
    try {
      const response = await (apiService as any).api.get(
        "/rewards/transactions/",
        {
          params: { page, page_size: pageSize },
        }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Redeem points for a reward
  async redeemPoints(
    request: RedeemPointsRequest
  ): Promise<RedeemPointsResponse> {
    try {
      const response = await (apiService as any).api.post(
        "/rewards/redeem/",
        request
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Apply voucher to order (validate)
  async validateVoucher(
    voucherCode: string,
    orderAmount: number,
    orderItems?: any[]
  ): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.post(
        "/rewards/validate-voucher/",
        {
          voucher_code: voucherCode,
          order_amount: orderAmount,
          order_items: orderItems,
        }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Calculate points that would be earned from an order
  async calculateEarnablePoints(
    orderAmount: number,
    orderItems?: any[]
  ): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.post(
        "/rewards/calculate-points/",
        {
          order_amount: orderAmount,
          order_items: orderItems,
        }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Apply points to order (calculate discount)
  async calculatePointsDiscount(
    pointsToUse: number,
    orderAmount: number
  ): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.post(
        "/rewards/calculate-points-discount/",
        {
          points_to_use: pointsToUse,
          order_amount: orderAmount,
        }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Use voucher in order
  async useVoucher(
    voucherId: string,
    orderId: string
  ): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.post(
        `/rewards/vouchers/${voucherId}/use/`,
        {
          order_id: orderId,
        }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get tier benefits and perks
  async getTierBenefits(tier?: string): Promise<RewardsApiResponse> {
    try {
      const params: any = {};
      if (tier) params.tier = tier;

      const response = await (apiService as any).api.get(
        "/rewards/tier-benefits/",
        { params }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Track points earning events (for analytics)
  async trackPointsEarned(
    eventType: string,
    points: number,
    orderId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await (apiService as any).api.post("/rewards/track-earned/", {
        event_type: eventType,
        points,
        order_id: orderId,
        metadata,
      });
    } catch (error) {
      // Don't throw error for tracking - just log it
      console.warn("Failed to track points earned event:", error);
    }
  }

  // Track points redemption events (for analytics)
  async trackPointsRedeemed(
    eventType: string,
    points: number,
    voucherId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await (apiService as any).api.post("/rewards/track-redeemed/", {
        event_type: eventType,
        points,
        voucher_id: voucherId,
        metadata,
      });
    } catch (error) {
      // Don't throw error for tracking - just log it
      console.warn("Failed to track points redeemed event:", error);
    }
  }

  // Get referral program information
  async getReferralInfo(): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.get("/rewards/referral/");
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Send referral invitation
  async sendReferral(
    email: string,
    message?: string
  ): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.post(
        "/rewards/referral/send/",
        {
          email,
          message,
        }
      );
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }

  // Get rewards program configuration
  async getRewardsConfig(): Promise<RewardsApiResponse> {
    try {
      const response = await (apiService as any).api.get("/rewards/config/");
      return response.data;
    } catch (error) {
      throw (apiService as any).handleError(error);
    }
  }
}

export default new RewardsApiService();
