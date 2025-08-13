import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";

import { useInitialRewardsData, useRedeemPoints } from "../hooks/useRewards";
import {
  usePointsBalance,
  useCurrentTier,
  useNextTierInfo,
  useTierProgress,
  useAvailableVouchers,
} from "../../../shared/stores/rewardsStore";
import { TIER_CONFIGS } from "../../../shared/types/rewards";

interface RewardsScreenProps {
  navigation: any;
}

const RewardsScreen: React.FC<RewardsScreenProps> = ({ navigation }) => {
  const { isLoading, isError, refetchAll } = useInitialRewardsData();

  const pointsBalance = usePointsBalance();
  const currentTier = useCurrentTier();
  const nextTierInfo = useNextTierInfo();
  const tierProgress = useTierProgress();
  const availableVouchers = useAvailableVouchers();

  const redeemPointsMutation = useRedeemPoints();

  const currentTierConfig = currentTier ? TIER_CONFIGS[currentTier] : null;

  // Calculate progress bar width
  const progressWidth = useMemo(() => {
    return Math.max(10, Math.min(tierProgress, 100));
  }, [tierProgress]);

  const handleRefresh = useCallback(() => {
    refetchAll();
  }, [refetchAll]);

  const handleViewVouchers = useCallback(() => {
    navigation.navigate("VouchersScreen");
  }, [navigation]);

  const handleViewTransactions = useCallback(() => {
    navigation.navigate("TransactionsScreen");
  }, [navigation]);

  const handleRedeemRewards = useCallback(() => {
    navigation.navigate("RedeemRewardsScreen");
  }, [navigation]);

  const handleTierDetails = useCallback(() => {
    navigation.navigate("TierBenefitsScreen", { tier: currentTier });
  }, [navigation, currentTier]);

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Failed to load rewards data</Text>
          <Pressable style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards</Text>
          <Pressable onPress={handleViewTransactions}>
            <Icon name="history" size={24} color="#333" />
          </Pressable>
        </View>

        {/* Points Balance Card */}
        <LinearGradient
          colors={
            currentTierConfig
              ? [currentTierConfig.color, `${currentTierConfig.color}CC`]
              : ["#6366F1", "#8B5CF6"]
          }
          style={styles.pointsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>Available Points</Text>
              <Text style={styles.pointsValue}>
                {pointsBalance?.current?.toLocaleString() || "0"}
              </Text>
            </View>
            <View style={styles.tierBadge}>
              <Icon
                name={currentTierConfig?.icon || "stars"}
                size={20}
                color="#FFF"
              />
              <Text style={styles.tierText}>{currentTier || "Silver"}</Text>
            </View>
          </View>

          {nextTierInfo && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                {nextTierInfo.pointsNeeded} points to {nextTierInfo.tier}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progressWidth}%` }]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round(tierProgress)}% complete
              </Text>
            </View>
          )}

          <Pressable
            style={styles.tierDetailsButton}
            onPress={handleTierDetails}
          >
            <Text style={styles.tierDetailsText}>View Benefits</Text>
            <Icon name="chevron-right" size={20} color="#FFF" />
          </Pressable>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={styles.actionButton} onPress={handleRedeemRewards}>
            <Icon name="card-giftcard" size={24} color="#6366F1" />
            <Text style={styles.actionText}>Redeem</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleViewVouchers}>
            <Icon name="local-offer" size={24} color="#10B981" />
            <Text style={styles.actionText}>Vouchers</Text>
            {availableVouchers.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{availableVouchers.length}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate("EarnPointsScreen")}
          >
            <Icon name="trending-up" size={24} color="#F59E0B" />
            <Text style={styles.actionText}>Earn</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate("ReferralScreen")}
          >
            <Icon name="share" size={24} color="#8B5CF6" />
            <Text style={styles.actionText}>Refer</Text>
          </Pressable>
        </View>

        {/* Current Tier Benefits */}
        {currentTierConfig && (
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>
              Your {currentTier} Benefits
            </Text>
            {currentTierConfig.perks.slice(0, 3).map((perk, index) => (
              <View key={index} style={styles.benefitItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.benefitText}>{perk}</Text>
              </View>
            ))}
            {currentTierConfig.perks.length > 3 && (
              <Pressable onPress={handleTierDetails}>
                <Text style={styles.viewAllBenefits}>
                  View all {currentTierConfig.perks.length} benefits
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Recent Vouchers */}
        {availableVouchers.length > 0 && (
          <View style={styles.vouchersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Vouchers</Text>
              <Pressable onPress={handleViewVouchers}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>

            {availableVouchers.slice(0, 2).map((voucher) => (
              <View key={voucher.id} style={styles.voucherCard}>
                <View style={styles.voucherContent}>
                  <Text style={styles.voucherTitle}>{voucher.title}</Text>
                  <Text style={styles.voucherDescription}>
                    {voucher.description}
                  </Text>
                  <Text style={styles.voucherExpiry}>
                    Expires:{" "}
                    {new Date(voucher.expirationDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.voucherValue}>
                  <Text style={styles.voucherValueText}>
                    {voucher.type === "discount"
                      ? `${voucher.value}%`
                      : `$${voucher.value}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Points Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Points Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {pointsBalance?.lifetime?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.statLabel}>Lifetime Earned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {pointsBalance?.pendingExpiration?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.statLabel}>Expiring Soon</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  pointsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  pointsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  pointsLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.9,
  },
  pointsValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  progressPercentage: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  tierDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tierDetailsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  actionButton: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  benefitsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
  },
  viewAllBenefits: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
    marginTop: 8,
  },
  vouchersSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  viewAllText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
  },
  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  voucherContent: {
    flex: 1,
    marginRight: 12,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  voucherExpiry: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  voucherValue: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voucherValueText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6366F1",
  },
  statsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RewardsScreen;
