import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import referralService, {
  ReferralStats as IReferralStats,
  ReferralCoupon,
  ReferralHistoryItem,
} from "../services/referralService";
import sharingService from "../services/sharingService";
import { logger } from "../utils";

const { width } = Dimensions.get("window");

interface Props {
  userId: number;
  userName: string;
  userReferralCode?: string;
}

const ReferralStats: React.FC<Props> = ({
  userId,
  userName,
  userReferralCode,
}) => {
  const [stats, setStats] = useState<IReferralStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCouponsModal, setShowCouponsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string | null>(
    userReferralCode || null
  );

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const loadReferralData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Generate or get referral code if not provided
      if (!referralCode) {
        const code = await referralService.generateUserReferralCode(
          userId,
          userName
        );
        setReferralCode(code);
      }

      // Get referral statistics
      const referralStats = await referralService.getReferralStats(userId);
      setStats(referralStats);
    } catch (error) {
      logger.error("Error loading referral data", error);
      // Set default stats
      setStats({
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        availableCoupons: [],
        referralHistory: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareReferralLink = async (): Promise<void> => {
    if (!referralCode) {
      Alert.alert("Error", "Referral code not available");
      return;
    }

    try {
      const success = await sharingService.shareReferralLink(
        userId,
        referralCode,
        userName
      );
      if (success) {
        Alert.alert(
          "Shared!",
          "Your referral link has been shared successfully!"
        );
      }
    } catch (error) {
      logger.error("Error sharing referral link", error);
      Alert.alert(
        "Share Error",
        "Unable to share referral link. Please try again."
      );
    }
  };

  const handleCopyReferralCode = async (): Promise<void> => {
    if (!referralCode) return;

    try {
      const shareData = await sharingService.createShareableContent(
        "referral",
        {
          userId,
          referralCode,
        }
      );
      await sharingService.copyToClipboard(shareData);
    } catch (error) {
      // Fallback to basic share
      try {
        await Share.share({
          message: `Join MarketHub with my referral code: ${referralCode}`,
          title: "Join MarketHub!",
        });
      } catch (shareError) {
        Alert.alert("Error", "Unable to copy referral code");
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return `R${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStatsCard = (
    title: string,
    value: string | number,
    color: string,
    icon: string
  ): React.ReactElement => (
    <View style={[styles.statsCard, { borderTopColor: color }]}>
      <View style={styles.statsCardHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statsCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.statsCardValue, { color }]}>{value}</Text>
    </View>
  );

  const renderCoupon = ({
    item,
  }: {
    item: ReferralCoupon;
  }): React.ReactElement => (
    <View style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <View
          style={[
            styles.couponBadge,
            {
              backgroundColor: item.type === "referrer" ? "#4CAF50" : "#2196F3",
            },
          ]}
        >
          <Text style={styles.couponBadgeText}>
            {item.type === "referrer" ? "REFERRER" : "REFEREE"}
          </Text>
        </View>
        <Text style={styles.couponStatus}>
          {item.isUsed ? "Used" : "Available"}
        </Text>
      </View>
      <Text style={styles.couponCode}>{item.code}</Text>
      <Text style={styles.couponValue}>
        {item.discountType === "percentage"
          ? `${item.discount}% OFF`
          : `${formatCurrency(item.discount)} OFF`}
      </Text>
      <Text style={styles.couponExpiry}>
        Expires: {formatDate(item.expiresAt)}
      </Text>
    </View>
  );

  const renderHistoryItem = ({
    item,
  }: {
    item: ReferralHistoryItem;
  }): React.ReactElement => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyUser}>
          <View style={styles.historyAvatar}>
            <Text style={styles.historyAvatarText}>
              {item.referredUserName?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View>
            <Text style={styles.historyUserName}>
              {item.referredUserName || "Anonymous User"}
            </Text>
            <Text style={styles.historyUserEmail}>
              {item.referredUserEmail || "Email not available"}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.historyStatus,
            {
              backgroundColor:
                item.status === "successful"
                  ? "#E8F5E8"
                  : item.status === "pending"
                  ? "#FFF3CD"
                  : "#FFEBEE",
            },
          ]}
        >
          <Text
            style={[
              styles.historyStatusText,
              {
                color:
                  item.status === "successful"
                    ? "#4CAF50"
                    : item.status === "pending"
                    ? "#FF8C00"
                    : "#F44336",
              },
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.historyDate}>
        Referred: {formatDate(item.createdAt)}
      </Text>
      {item.completedAt && (
        <Text style={styles.historyCompletedDate}>
          Completed: {formatDate(item.completedAt)}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading referral stats...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>Unable to load referral statistics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReferralData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Referral Code Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <View style={styles.referralCodeContainer}>
          <View style={styles.referralCodeCard}>
            <Text style={styles.referralCode}>
              {referralCode || "Loading..."}
            </Text>
            <Text style={styles.referralCodeDescription}>
              Share this code with friends to earn rewards!
            </Text>
          </View>
          <View style={styles.referralActions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareReferralLink}
            >
              <Icon name="share" size={20} color="#007AFF" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyReferralCode}
            >
              <Icon name="content-copy" size={20} color="#4CAF50" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Statistics Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Referral Statistics</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard(
            "Total Referrals",
            stats.totalReferrals,
            "#2196F3",
            "people"
          )}
          {renderStatsCard(
            "Successful",
            stats.successfulReferrals,
            "#4CAF50",
            "check-circle"
          )}
          {renderStatsCard(
            "Pending",
            stats.pendingReferrals,
            "#FF8C00",
            "hourglass-empty"
          )}
          {renderStatsCard(
            "Total Earnings",
            formatCurrency(stats.totalEarnings),
            "#9C27B0",
            "account-balance-wallet"
          )}
        </View>
      </View>

      {/* Available Coupons */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Available Coupons ({stats.availableCoupons.length})
          </Text>
          {stats.availableCoupons.length > 0 && (
            <TouchableOpacity onPress={() => setShowCouponsModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {stats.availableCoupons.length > 0 ? (
          <FlatList
            data={stats.availableCoupons.slice(0, 2)}
            renderItem={renderCoupon}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="card-giftcard" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No coupons available</Text>
            <Text style={styles.emptyStateSubtext}>
              Refer friends to earn rewards!
            </Text>
          </View>
        )}
      </View>

      {/* Recent Referrals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Referrals</Text>
          {stats.referralHistory.length > 0 && (
            <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {stats.referralHistory.length > 0 ? (
          <FlatList
            data={stats.referralHistory.slice(0, 3)}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="person-add" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No referrals yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start sharing your referral code!
            </Text>
          </View>
        )}
      </View>

      {/* Coupons Modal */}
      <Modal
        visible={showCouponsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCouponsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Coupons</Text>
            <TouchableOpacity onPress={() => setShowCouponsModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={stats.availableCoupons}
            renderItem={renderCoupon}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
          />
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Referral History</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={stats.referralHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
          />
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#333",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Referral Code Styles
  referralCodeContainer: {
    alignItems: "center",
  },
  referralCodeCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E1E1E1",
    borderStyle: "dashed",
  },
  referralCode: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    letterSpacing: 2,
    marginBottom: 8,
  },
  referralCodeDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  referralActions: {
    flexDirection: "row",
    gap: 12,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  shareButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  copyButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Stats Grid Styles
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statsCardTitle: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: "bold",
  },

  // Coupon Styles
  couponCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  couponBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  couponBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  couponStatus: {
    fontSize: 12,
    color: "#666",
  },
  couponCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  couponValue: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginBottom: 4,
  },
  couponExpiry: {
    fontSize: 12,
    color: "#666",
  },

  // History Styles
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyUser: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  historyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyAvatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  historyUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  historyUserEmail: {
    fontSize: 12,
    color: "#666",
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  historyDate: {
    fontSize: 12,
    color: "#666",
  },
  historyCompletedDate: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 2,
  },

  // Empty State Styles
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#333",
    marginTop: 12,
    fontWeight: "500",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
});

export default ReferralStats;
