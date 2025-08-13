import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SmartImage } from "../components";
import { getProductImageUrl } from "../config/environment";
import i18n from "../services/i18n";
import sharingService from "../services/sharingService";
import referralService from "../services/referralService";
import ApiService from "../services";

const OrderConfirmationScreen = ({
  navigation,
  route,
}: any): React.JSX.Element => {
  const { order } = route.params;
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async (): Promise<void> => {
    try {
      // Get current user data
      const user = await ApiService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // Generate or get user's referral code
        const referralCode = await referralService.generateUserReferralCode(
          user.id,
          user.first_name || user.name || "User"
        );
        setUserReferralCode(referralCode);
      }
    } catch (error) {
      console.error("Error loading user data", error);
      // Continue without referral functionality
    }
  };

  const handleTrackOrder = () => {
    // TODO: Navigate to order tracking screen
    Alert.alert("Track Order", "Order tracking feature coming soon!");
  };

  const handleContinueShopping = () => {
    navigation.navigate("Products");
  };

  const handleShareOrder = async () => {
    if (!currentUser || !userReferralCode || !order) {
      Alert.alert("Share Order", "Unable to share order at this time.");
      return;
    }

    try {
      const success = await sharingService.shareOrderSuccess({
        orderId: order.id.toString(),
        totalAmount: order.total,
        userId: currentUser.id,
        referralCode: userReferralCode,
        itemCount: order.items?.length || 0,
      });

      if (success) {
        Alert.alert(
          "Shared!",
          "Your order has been shared with your referral link!"
        );
      }
    } catch (error) {
      console.error("Error sharing order:", error);
      Alert.alert(
        "Share Error",
        "Unable to share your order. Please try again."
      );
    }
  };

  const renderOrderHeader = (): React.JSX.Element => (
    <View style={styles.headerContainer}>
      <View style={styles.successIcon}>
        <Icon name="check-circle" size={60} color="#4CAF50" />
      </View>
      <Text style={styles.successTitle}>Order Placed Successfully!</Text>
      <Text style={styles.orderNumber}>Order #{order.id}</Text>
      <Text style={styles.successMessage}>
        Thank you for your purchase. We'll send you a confirmation email
        shortly.
      </Text>
    </View>
  );

  const renderOrderSummary = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>

      {order.items.map((item: any) => (
        <View key={item.id} style={styles.orderItem}>
          <SmartImage
            source={{ uri: getProductImageUrl(item.product) }}
            style={styles.itemImage}
            resizeMode="cover"
            fallbackText={item.product.name}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.product.name}
            </Text>
            <Text style={styles.itemDetails}>
              Qty: {item.quantity} × R{item.product.price.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.itemTotal}>R{item.subtotal.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.pricingBreakdown}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Subtotal</Text>
          <Text style={styles.priceValue}>R{order.subtotal.toFixed(2)}</Text>
        </View>

        {order.discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.discountLabel}>
              Discount {order.appliedPromo && `(${order.appliedPromo.code})`}
            </Text>
            <Text style={styles.discountValue}>
              -R{order.discount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Delivery Fee</Text>
          <Text style={styles.priceValue}>
            {order.deliveryFee === 0
              ? "Free"
              : `R${order.deliveryFee.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.priceDivider} />

        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>R{order.total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderDeliveryInfo = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Information</Text>

      <View style={styles.infoRow}>
        <Icon name="local-shipping" size={24} color="#007AFF" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            {order.deliveryOption === "express"
              ? "Express Delivery"
              : order.deliveryOption === "pickup"
              ? "Store Pickup"
              : "Standard Delivery"}
          </Text>
          <Text style={styles.infoDetails}>{order.estimatedDelivery}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Icon name="location-on" size={24} color="#007AFF" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{order.address.name}</Text>
          <Text style={styles.infoDetails}>{order.address.street}</Text>
          <Text style={styles.infoDetails}>
            {order.address.city}, {order.address.state} {order.address.zipCode}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPaymentInfo = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Information</Text>

      <View style={styles.infoRow}>
        <Icon name={order.paymentMethod.icon} size={24} color="#007AFF" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{order.paymentMethod.name}</Text>
          <Text style={styles.infoDetails}>{order.paymentMethod.details}</Text>
        </View>
      </View>
    </View>
  );

  const renderOrderNotes = (): React.JSX.Element => {
    if (!order.orderNotes) return <></>;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Notes</Text>
        <Text style={styles.notesText}>{order.orderNotes}</Text>
      </View>
    );
  };

  const renderNextSteps = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What's Next?</Text>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Order Confirmation</Text>
          <Text style={styles.stepDescription}>
            You'll receive an email confirmation with your order details.
          </Text>
        </View>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>2</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Preparation</Text>
          <Text style={styles.stepDescription}>
            Our team will prepare your order for shipping.
          </Text>
        </View>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>3</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>
            {order.deliveryOption === "pickup"
              ? "Ready for Pickup"
              : "Delivery"}
          </Text>
          <Text style={styles.stepDescription}>
            {order.deliveryOption === "pickup"
              ? "We'll notify you when your order is ready for pickup."
              : "Your order will be delivered to your specified address."}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Confirmation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderOrderHeader()}
        {renderOrderSummary()}
        {renderDeliveryInfo()}
        {renderPaymentInfo()}
        {renderOrderNotes()}
        {renderNextSteps()}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.trackButton} onPress={handleTrackOrder}>
          <Icon name="timeline" size={20} color="#007AFF" />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>

        {/* Share Button */}
        {currentUser && userReferralCode && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareOrder}
          >
            <Icon name="share" size={20} color="#4CAF50" />
            <Text style={styles.shareButtonText}>Share & Refer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueShopping}
        >
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: "#666",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  pricingBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: "#666",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  discountLabel: {
    fontSize: 16,
    color: "#4CAF50",
  },
  discountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  priceDivider: {
    height: 1,
    backgroundColor: "#E1E1E1",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  infoDetails: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  bottomContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
    flexDirection: "row",
    gap: 12,
  },
  trackButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  trackButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  continueButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#E8F5E8",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  shareButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default OrderConfirmationScreen;
