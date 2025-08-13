import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { CheckoutRewards } from "../index";

// Mock checkout data - replace with your actual checkout logic
interface CheckoutExampleProps {
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  navigation?: any;
}

const CheckoutExample: React.FC<CheckoutExampleProps> = ({
  cartItems,
  navigation,
}) => {
  const [rewardsData, setRewardsData] = useState<any>(null);

  // Calculate order total
  const orderSubtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const shipping = orderSubtotal > 50 ? 0 : 9.99;
  const tax = orderSubtotal * 0.08; // 8% tax

  // Apply rewards discounts
  const voucherDiscount =
    rewardsData?.appliedVoucher?.type === "discount"
      ? (orderSubtotal * rewardsData.appliedVoucher.value) / 100
      : rewardsData?.appliedVoucher?.value || 0;
  const pointsDiscount = rewardsData?.pointsDiscount || 0;

  const orderTotal = Math.max(
    0,
    orderSubtotal + shipping + tax - voucherDiscount - pointsDiscount
  );

  const handleRewardsChange = (rewards: any) => {
    setRewardsData(rewards);
    console.log("Rewards updated:", rewards);
  };

  const handlePlaceOrder = () => {
    // In a real app, this would create an order with:
    // - Applied voucher info
    // - Points used
    // - Points to be earned

    const orderData = {
      items: cartItems,
      subtotal: orderSubtotal,
      shipping,
      tax,
      total: orderTotal,
      rewards: {
        appliedVoucher: rewardsData?.appliedVoucher,
        pointsUsed: rewardsData?.pointsUsed || 0,
        earnablePoints: rewardsData?.earnablePoints || 0,
        totalSavings: rewardsData?.totalSavings || 0,
      },
    };

    Alert.alert(
      "Order Placed!",
      `Order total: $${orderTotal.toFixed(2)}\n` +
        `Points to earn: ${rewardsData?.earnablePoints || 0}\n` +
        `Total savings: $${rewardsData?.totalSavings?.toFixed(2) || "0.00"}`,
      [
        {
          text: "OK",
          onPress: () =>
            navigation?.navigate("OrderConfirmation", { orderData }),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>

        {cartItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <Text style={styles.itemName}>
              {item.name} x{item.quantity}
            </Text>
            <Text style={styles.itemPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.separator} />

        <View style={styles.orderItem}>
          <Text>Subtotal</Text>
          <Text>${orderSubtotal.toFixed(2)}</Text>
        </View>

        <View style={styles.orderItem}>
          <Text>Shipping</Text>
          <Text>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</Text>
        </View>

        <View style={styles.orderItem}>
          <Text>Tax</Text>
          <Text>${tax.toFixed(2)}</Text>
        </View>

        {/* Rewards Discounts */}
        {voucherDiscount > 0 && (
          <View style={styles.orderItem}>
            <Text style={styles.discountText}>Voucher Discount</Text>
            <Text style={styles.discountText}>
              -${voucherDiscount.toFixed(2)}
            </Text>
          </View>
        )}

        {pointsDiscount > 0 && (
          <View style={styles.orderItem}>
            <Text style={styles.discountText}>Points Discount</Text>
            <Text style={styles.discountText}>
              -${pointsDiscount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.separator} />

        <View style={[styles.orderItem, styles.totalRow]}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>${orderTotal.toFixed(2)}</Text>
        </View>

        {rewardsData?.totalSavings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              You saved ${rewardsData.totalSavings.toFixed(2)}!
            </Text>
          </View>
        )}
      </View>

      {/* Rewards Integration */}
      <CheckoutRewards
        orderAmount={orderSubtotal}
        orderItems={cartItems}
        onRewardsChange={handleRewardsChange}
      />

      {/* Points Preview */}
      {rewardsData?.earnablePoints > 0 && (
        <View style={styles.pointsPreview}>
          <Text style={styles.pointsPreviewText}>
            🌟 You'll earn {rewardsData.earnablePoints} points from this order!
          </Text>
        </View>
      )}

      {/* Place Order Button */}
      <Pressable style={styles.placeOrderButton} onPress={handlePlaceOrder}>
        <Text style={styles.placeOrderButtonText}>
          Place Order • ${orderTotal.toFixed(2)}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalRow: {
    marginTop: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  discountText: {
    color: "#10B981",
    fontWeight: "500",
  },
  savingsBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    alignItems: "center",
  },
  savingsText: {
    color: "#065F46",
    fontSize: 14,
    fontWeight: "600",
  },
  pointsPreview: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  pointsPreviewText: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "500",
  },
  placeOrderButton: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: "auto",
  },
  placeOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CheckoutExample;
