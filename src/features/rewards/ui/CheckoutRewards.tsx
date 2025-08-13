import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

import {
  useCalculateEarnablePoints,
  useCalculatePointsDiscount,
  useValidateVoucher,
} from "../hooks/useRewards";
import {
  useRewardsStore,
  usePointsBalance,
  useAvailableVouchers,
  useAppliedVoucher,
  usePointsToApply,
  useMaxApplicablePoints,
} from "../../../shared/stores/rewardsStore";

interface CheckoutRewardsProps {
  orderAmount: number;
  orderItems?: any[];
  onRewardsChange: (rewards: {
    appliedVoucher: any | null;
    pointsDiscount: number;
    pointsUsed: number;
    earnablePoints: number;
    totalSavings: number;
  }) => void;
}

const CheckoutRewards: React.FC<CheckoutRewardsProps> = ({
  orderAmount,
  orderItems,
  onRewardsChange,
}) => {
  const [voucherCode, setVoucherCode] = useState("");
  const [showPointsInput, setShowPointsInput] = useState(false);
  const [localPointsToUse, setLocalPointsToUse] = useState("");

  const pointsBalance = usePointsBalance();
  const availableVouchers = useAvailableVouchers();
  const appliedVoucher = useAppliedVoucher();
  const pointsToApply = usePointsToApply();
  const maxApplicablePoints = useMaxApplicablePoints();

  const {
    applyVoucher,
    removeAppliedVoucher,
    setPointsToApply,
    setMaxApplicablePoints,
  } = useRewardsStore();

  const calculateEarnablePoints = useCalculateEarnablePoints();
  const calculatePointsDiscount = useCalculatePointsDiscount();
  const validateVoucher = useValidateVoucher();

  // Calculate earnable points on component mount and amount changes
  useEffect(() => {
    if (orderAmount > 0) {
      calculateEarnablePoints.mutate(
        { orderAmount, orderItems },
        {
          onSuccess: (data) => {
            // Update max applicable points (typically 50% of order amount)
            const maxPoints = Math.min(
              pointsBalance?.current || 0,
              Math.floor(orderAmount * 0.5) // 50% of order value
            );
            setMaxApplicablePoints(maxPoints);
          },
        }
      );
    }
  }, [orderAmount, orderItems, pointsBalance]);

  // Calculate points discount when points to apply changes
  useEffect(() => {
    if (pointsToApply > 0) {
      calculatePointsDiscount.mutate(
        { pointsToUse: pointsToApply, orderAmount },
        {
          onSuccess: (data) => {
            // Update parent with rewards calculation
            updateRewardsCallback();
          },
        }
      );
    } else {
      updateRewardsCallback();
    }
  }, [pointsToApply, orderAmount]);

  const updateRewardsCallback = useCallback(() => {
    const voucherDiscount = appliedVoucher?.value || 0;
    const pointsDiscount = calculatePointsDiscount.data?.discount || 0;
    const earnablePoints = calculateEarnablePoints.data?.points || 0;

    onRewardsChange({
      appliedVoucher,
      pointsDiscount,
      pointsUsed: pointsToApply,
      earnablePoints,
      totalSavings: voucherDiscount + pointsDiscount,
    });
  }, [
    appliedVoucher,
    pointsToApply,
    calculatePointsDiscount.data,
    calculateEarnablePoints.data,
  ]);

  const handleVoucherSubmit = useCallback(() => {
    if (!voucherCode.trim()) return;

    validateVoucher.mutate(
      { voucherCode: voucherCode.trim(), orderAmount, orderItems },
      {
        onSuccess: (data) => {
          if (data.success) {
            const voucher = data.voucher;
            applyVoucher(voucher);
            setVoucherCode("");
            Alert.alert("Success", "Voucher applied successfully!");
          } else {
            Alert.alert(
              "Invalid Voucher",
              data.message || "This voucher cannot be applied to your order."
            );
          }
        },
        onError: (error: any) => {
          Alert.alert("Error", error.message || "Failed to validate voucher");
        },
      }
    );
  }, [voucherCode, orderAmount, orderItems]);

  const handleRemoveVoucher = useCallback(() => {
    removeAppliedVoucher();
    updateRewardsCallback();
  }, []);

  const handleApplyVoucher = useCallback(
    (voucher: any) => {
      validateVoucher.mutate(
        { voucherCode: voucher.voucherCode, orderAmount, orderItems },
        {
          onSuccess: (data) => {
            if (data.success) {
              applyVoucher(voucher);
              Alert.alert("Success", "Voucher applied successfully!");
            } else {
              Alert.alert(
                "Invalid Voucher",
                data.message || "This voucher cannot be applied to your order."
              );
            }
          },
          onError: (error: any) => {
            Alert.alert("Error", error.message || "Failed to validate voucher");
          },
        }
      );
    },
    [orderAmount, orderItems]
  );

  const handlePointsInputSubmit = useCallback(() => {
    const points = parseInt(localPointsToUse) || 0;
    if (points > 0 && points <= maxApplicablePoints) {
      setPointsToApply(points);
      setShowPointsInput(false);
      setLocalPointsToUse("");
    } else if (points > maxApplicablePoints) {
      Alert.alert(
        "Invalid Amount",
        `You can use up to ${maxApplicablePoints.toLocaleString()} points on this order.`
      );
    }
  }, [localPointsToUse, maxApplicablePoints]);

  const isVoucherLoading = validateVoucher.isPending;
  const isPointsCalculating =
    calculatePointsDiscount.isPending || calculateEarnablePoints.isPending;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Icon name="card-giftcard" size={24} color="#6366F1" />
        <Text style={styles.sectionTitle}>Rewards & Savings</Text>
      </View>

      {/* Voucher Code Input */}
      {!appliedVoucher && (
        <View style={styles.voucherSection}>
          <Text style={styles.subsectionTitle}>Apply Voucher Code</Text>
          <View style={styles.voucherInput}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter voucher code"
              value={voucherCode}
              onChangeText={setVoucherCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleVoucherSubmit}
            />
            <Pressable
              style={[
                styles.applyButton,
                !voucherCode.trim() && styles.applyButtonDisabled,
              ]}
              onPress={handleVoucherSubmit}
              disabled={!voucherCode.trim() || isVoucherLoading}
            >
              {isVoucherLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.applyButtonText}>Apply</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Applied Voucher */}
      {appliedVoucher && (
        <View style={styles.appliedVoucherCard}>
          <View style={styles.appliedVoucherContent}>
            <Icon name="local-offer" size={20} color="#10B981" />
            <View style={styles.appliedVoucherText}>
              <Text style={styles.appliedVoucherTitle}>
                {appliedVoucher.title}
              </Text>
              <Text style={styles.appliedVoucherValue}>
                Save{" "}
                {appliedVoucher.type === "discount"
                  ? `${appliedVoucher.value}%`
                  : `$${appliedVoucher.value}`}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleRemoveVoucher} style={styles.removeButton}>
            <Icon name="close" size={20} color="#EF4444" />
          </Pressable>
        </View>
      )}

      {/* Available Vouchers */}
      {!appliedVoucher && availableVouchers.length > 0 && (
        <View style={styles.availableVouchers}>
          <Text style={styles.subsectionTitle}>Available Vouchers</Text>
          {availableVouchers.slice(0, 2).map((voucher) => (
            <Pressable
              key={voucher.id}
              style={styles.voucherOption}
              onPress={() => handleApplyVoucher(voucher)}
            >
              <View style={styles.voucherOptionContent}>
                <Text style={styles.voucherOptionTitle}>{voucher.title}</Text>
                <Text style={styles.voucherOptionValue}>
                  {voucher.type === "discount"
                    ? `${voucher.value}% OFF`
                    : `$${voucher.value} OFF`}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#6B7280" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Points Section */}
      {(pointsBalance?.current || 0) > 0 && maxApplicablePoints > 0 && (
        <View style={styles.pointsSection}>
          <View style={styles.pointsHeader}>
            <Text style={styles.subsectionTitle}>Use Points</Text>
            <Text style={styles.pointsAvailable}>
              {pointsBalance?.current?.toLocaleString()} available
            </Text>
          </View>

          {pointsToApply > 0 ? (
            <View style={styles.appliedPointsCard}>
              <View style={styles.appliedPointsContent}>
                <Icon name="stars" size={20} color="#F59E0B" />
                <Text style={styles.appliedPointsText}>
                  Using {pointsToApply.toLocaleString()} points
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setPointsToApply(0);
                  setShowPointsInput(false);
                }}
                style={styles.removeButton}
              >
                <Icon name="close" size={20} color="#EF4444" />
              </Pressable>
            </View>
          ) : (
            <>
              {!showPointsInput ? (
                <Pressable
                  style={styles.usePointsButton}
                  onPress={() => setShowPointsInput(true)}
                >
                  <Text style={styles.usePointsButtonText}>
                    Use up to {maxApplicablePoints.toLocaleString()} points
                  </Text>
                  <Icon name="chevron-right" size={20} color="#6366F1" />
                </Pressable>
              ) : (
                <View style={styles.pointsInput}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={`Max ${maxApplicablePoints.toLocaleString()}`}
                    value={localPointsToUse}
                    onChangeText={setLocalPointsToUse}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={handlePointsInputSubmit}
                    autoFocus
                  />
                  <Pressable
                    style={[
                      styles.applyButton,
                      !localPointsToUse && styles.applyButtonDisabled,
                    ]}
                    onPress={handlePointsInputSubmit}
                    disabled={!localPointsToUse || isPointsCalculating}
                  >
                    {isPointsCalculating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.applyButtonText}>Apply</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Earnings Preview */}
      {calculateEarnablePoints.data?.points > 0 && (
        <View style={styles.earningsPreview}>
          <Icon name="trending-up" size={20} color="#10B981" />
          <Text style={styles.earningsText}>
            You'll earn {calculateEarnablePoints.data.points.toLocaleString()}{" "}
            points from this purchase
          </Text>
        </View>
      )}

      {/* Savings Summary */}
      {(appliedVoucher || pointsToApply > 0) && (
        <View style={styles.savingsSummary}>
          <Text style={styles.savingsTitle}>Your Savings</Text>
          {appliedVoucher && (
            <View style={styles.savingsItem}>
              <Text style={styles.savingsLabel}>Voucher Discount</Text>
              <Text style={styles.savingsValue}>
                -
                {appliedVoucher.type === "discount"
                  ? `$${((orderAmount * appliedVoucher.value) / 100).toFixed(
                      2
                    )}`
                  : `$${appliedVoucher.value.toFixed(2)}`}
              </Text>
            </View>
          )}
          {pointsToApply > 0 && calculatePointsDiscount.data && (
            <View style={styles.savingsItem}>
              <Text style={styles.savingsLabel}>Points Discount</Text>
              <Text style={styles.savingsValue}>
                -${calculatePointsDiscount.data.discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.savingsItem, styles.totalSavings]}>
            <Text style={styles.totalSavingsLabel}>Total Savings</Text>
            <Text style={styles.totalSavingsValue}>
              -$
              {(
                (appliedVoucher
                  ? appliedVoucher.type === "discount"
                    ? (orderAmount * appliedVoucher.value) / 100
                    : appliedVoucher.value
                  : 0) + (calculatePointsDiscount.data?.discount || 0)
              ).toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  voucherSection: {
    marginBottom: 16,
  },
  voucherInput: {
    flexDirection: "row",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  applyButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  appliedVoucherCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  appliedVoucherContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  appliedVoucherText: {
    marginLeft: 8,
    flex: 1,
  },
  appliedVoucherTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065F46",
  },
  appliedVoucherValue: {
    fontSize: 12,
    color: "#047857",
  },
  removeButton: {
    padding: 4,
  },
  availableVouchers: {
    marginBottom: 16,
  },
  voucherOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  voucherOptionContent: {
    flex: 1,
  },
  voucherOptionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  voucherOptionValue: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  pointsSection: {
    marginBottom: 16,
  },
  pointsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pointsAvailable: {
    fontSize: 12,
    color: "#6B7280",
  },
  appliedPointsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  appliedPointsContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  appliedPointsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginLeft: 8,
  },
  usePointsButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  usePointsButtonText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "500",
  },
  pointsInput: {
    flexDirection: "row",
    gap: 8,
  },
  earningsPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  earningsText: {
    fontSize: 14,
    color: "#065F46",
    marginLeft: 8,
    flex: 1,
  },
  savingsSummary: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  savingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  savingsLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  savingsValue: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },
  totalSavings: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  totalSavingsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  totalSavingsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },
});

export default CheckoutRewards;
