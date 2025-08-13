import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useCart } from "../contexts/CartContext";
import { SmartImage } from "../components";
import { getProductImageUrl } from "../config/environment";
import i18n from "../services/i18n";
import { logger, ErrorToast } from "../utils";
// import AnalyticsService from "../services/analytics";
const AnalyticsService = { trackCheckoutBegin: () => {}, trackScreenView: () => {}, trackPurchase: () => {} } as any;

interface Address {
  id: string;
  type: "home" | "work" | "other";
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "apple_pay" | "google_pay" | "cash_on_delivery";
  name: string;
  details: string;
  icon: string;
  isDefault: boolean;
}

const CheckoutScreen = ({ navigation, route }: any): React.JSX.Element => {
  const { items, total, itemsCount, clearCart } = useCart();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(
    null
  );
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [deliveryOption, setDeliveryOption] = useState<
    "standard" | "express" | "pickup"
  >("standard");
  const [subscriptionEnabled, setSubscriptionEnabled] =
    useState<boolean>(false);
  const [selectedFrequency, setSelectedFrequency] = useState<
    "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly"
  >("monthly");
  const [showFrequencyModal, setShowFrequencyModal] = useState<boolean>(false);

  // Sample addresses - in real app, these would come from user profile
  const [addresses] = useState<Address[]>([
    {
      id: "1",
      type: "home",
      name: "Home Address",
      street: "123 Main Street, Apt 4B",
      city: "Johannesburg",
      state: "Gauteng",
      zipCode: "2001",
      isDefault: true,
    },
    {
      id: "2",
      type: "work",
      name: "Work Address",
      street: "456 Business Park, Suite 200",
      city: "Sandton",
      state: "Gauteng",
      zipCode: "2196",
      isDefault: false,
    },
  ]);

  // Sample payment methods
  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: "card",
      name: "Credit Card",
      details: "**** **** **** 1234",
      icon: "credit-card",
      isDefault: true,
    },
    {
      id: "2",
      type: "paypal",
      name: "PayPal",
      details: "user@example.com",
      icon: "account-balance-wallet",
      isDefault: false,
    },
    {
      id: "3",
      type: "cash_on_delivery",
      name: "Cash on Delivery",
      details: "Pay when you receive",
      icon: "local-shipping",
      isDefault: false,
    },
  ]);

  useEffect(() => {
    // Set default selections
    const defaultAddress = addresses.find((addr) => addr.isDefault);
    const defaultPayment = paymentMethods.find((pm) => pm.isDefault);

    if (defaultAddress) setSelectedAddress(defaultAddress);
    if (defaultPayment) setSelectedPayment(defaultPayment);

    // Track checkout begin (funnel step 3)
    const trackCheckoutBegin = () => {
      const itemsForAnalytics = items.map((item) => ({
        item_id: item.product.id.toString(),
        item_name: item.product.name,
        item_category: item.product.category,
        price: item.product.price,
        currency: "ZAR",
        quantity: item.quantity,
      }));

      AnalyticsService.trackCheckoutBegin({
        value: total,
        currency: "ZAR",
        items: itemsForAnalytics,
        coupon: appliedPromo?.code,
      });

      // Track screen view
      AnalyticsService.trackScreenView("CheckoutScreen", "CheckoutScreen");
    };

    trackCheckoutBegin();
  }, []);

  // Check if any items are subscribable
  const hasSubscribableItems = items.some(
    (item) => item.product.is_subscribable
  );

  // Get applied promo from route params if available
  const appliedPromo = route?.params?.appliedPromo || null;
  const subtotal = total;
  const discount = appliedPromo ? (subtotal * appliedPromo.discount) / 100 : 0;
  const subscriptionDiscount =
    subscriptionEnabled && hasSubscribableItems ? subtotal * 0.15 : 0; // 15% subscription discount
  const deliveryFee =
    deliveryOption === "express" ? 50 : deliveryOption === "standard" ? 25 : 0;
  const finalTotal = subtotal - discount - subscriptionDiscount + deliveryFee;

  const handlePlaceOrder = async (): Promise<void> => {
    if (!selectedAddress) {
      Alert.alert("Address Required", "Please select a delivery address.");
      return;
    }

    if (!selectedPayment) {
      Alert.alert("Payment Required", "Please select a payment method.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty.");
      return;
    }

    try {
      setLoading(true);

      // Simulate order processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create order object
      const order = {
        id: `ORD-${Date.now()}`,
        items: items,
        subtotal,
        discount,
        deliveryFee,
        total: finalTotal,
        address: selectedAddress,
        paymentMethod: selectedPayment,
        deliveryOption,
        orderNotes,
        appliedPromo,
        status: "confirmed",
        estimatedDelivery: getEstimatedDelivery(),
        createdAt: new Date().toISOString(),
      };

      // Track purchase completion (funnel step 4)
      const itemsForPurchaseAnalytics = items.map((item) => ({
        item_id: item.product.id.toString(),
        item_name: item.product.name,
        item_category: item.product.category,
        price: item.product.price,
        currency: "ZAR",
        quantity: item.quantity,
      }));

      await AnalyticsService.trackPurchase({
        transaction_id: order.id,
        value: finalTotal,
        currency: "ZAR",
        items: itemsForPurchaseAnalytics,
        shipping: deliveryFee,
        tax: 0,
        coupon: appliedPromo?.code,
        payment_method: selectedPayment.type,
      });

      logger.info("Order placed successfully", {
        component: "CheckoutScreen",
        action: "handlePlaceOrder",
        metadata: {
          orderId: order.id,
          itemsCount: items.length,
          total: finalTotal,
          paymentMethod: selectedPayment.type,
        },
      });

      // Clear cart after successful order
      clearCart();

      // Navigate to order confirmation
      navigation.replace("OrderConfirmation", { order });
    } catch (error: any) {
      logger.error("Error placing order", error, {
        component: "CheckoutScreen",
        action: "handlePlaceOrder",
        metadata: {
          itemsCount: items.length,
          total: finalTotal,
        },
      });

      ErrorToast.show({
        title: "Order Failed",
        message: error.message || "Failed to place order. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEstimatedDelivery = (): string => {
    const today = new Date();
    let deliveryDays = 0;

    switch (deliveryOption) {
      case "express":
        deliveryDays = 1;
        break;
      case "standard":
        deliveryDays = 3;
        break;
      case "pickup":
        deliveryDays = 0;
        break;
    }

    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + deliveryDays);

    return deliveryOption === "pickup"
      ? "Ready for pickup today"
      : deliveryDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  const getFrequencyLabel = (frequency: string): string => {
    const labels = {
      weekly: "Every week",
      biweekly: "Every 2 weeks",
      monthly: "Every month",
      bimonthly: "Every 2 months",
      quarterly: "Every 3 months",
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const renderOrderSummary = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>

      {items.slice(0, 3).map((item) => (
        <View key={item.id} style={styles.orderItem}>
          <SmartImage
            source={{ uri: getProductImageUrl(item.product) }}
            style={styles.orderItemImage}
            resizeMode="cover"
            fallbackText={item.product.name}
          />
          <View style={styles.orderItemInfo}>
            <Text style={styles.orderItemName} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={styles.orderItemDetails}>
              Qty: {item.quantity} × R{item.product.price.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.orderItemTotal}>R{item.subtotal.toFixed(2)}</Text>
        </View>
      ))}

      {items.length > 3 && (
        <Text style={styles.moreItemsText}>+{items.length - 3} more items</Text>
      )}
    </View>
  );

  const renderDeliveryOptions = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Options</Text>

      {[
        {
          key: "standard",
          name: "Standard Delivery",
          time: "3-5 business days",
          fee: 25,
        },
        {
          key: "express",
          name: "Express Delivery",
          time: "Next business day",
          fee: 50,
        },
        { key: "pickup", name: "Store Pickup", time: "Ready today", fee: 0 },
      ].map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.optionCard,
            deliveryOption === option.key && styles.selectedOption,
          ]}
          onPress={() => setDeliveryOption(option.key as any)}
        >
          <View style={styles.optionInfo}>
            <Text style={styles.optionName}>{option.name}</Text>
            <Text style={styles.optionDetails}>{option.time}</Text>
          </View>
          <Text style={styles.optionFee}>
            {option.fee === 0 ? "Free" : `R${option.fee}`}
          </Text>
          <Icon
            name={
              deliveryOption === option.key
                ? "radio-button-checked"
                : "radio-button-unchecked"
            }
            size={24}
            color={deliveryOption === option.key ? "#007AFF" : "#ccc"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAddressSection = (): React.JSX.Element => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TouchableOpacity onPress={() => setShowAddressModal(true)}>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      {selectedAddress ? (
        <View style={styles.selectedCard}>
          <Icon name="location-on" size={24} color="#007AFF" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{selectedAddress.name}</Text>
            <Text style={styles.cardSubtitle}>{selectedAddress.street}</Text>
            <Text style={styles.cardSubtitle}>
              {selectedAddress.city}, {selectedAddress.state}{" "}
              {selectedAddress.zipCode}
            </Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddressModal(true)}
        >
          <Icon name="add" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Select Address</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPaymentSection = (): React.JSX.Element => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      {selectedPayment ? (
        <View style={styles.selectedCard}>
          <Icon name={selectedPayment.icon} size={24} color="#007AFF" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{selectedPayment.name}</Text>
            <Text style={styles.cardSubtitle}>{selectedPayment.details}</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <Icon name="add" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Select Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderOrderNotes = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Add any special instructions..."
        value={orderNotes}
        onChangeText={setOrderNotes}
        multiline
        numberOfLines={3}
        maxLength={200}
      />
      <Text style={styles.characterCount}>{orderNotes.length}/200</Text>
    </View>
  );

  const renderPricingBreakdown = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Price Breakdown</Text>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Subtotal ({itemsCount} items)</Text>
        <Text style={styles.priceValue}>R{subtotal.toFixed(2)}</Text>
      </View>

      {appliedPromo && (
        <View style={styles.priceRow}>
          <Text style={styles.discountLabel}>
            Discount ({appliedPromo.code} - {appliedPromo.discount}%)
          </Text>
          <Text style={styles.discountValue}>-R{discount.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Delivery Fee</Text>
        <Text style={styles.priceValue}>
          {deliveryFee === 0 ? "Free" : `R${deliveryFee.toFixed(2)}`}
        </Text>
      </View>

      <View style={styles.priceDivider} />

      <View style={styles.priceRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>R{finalTotal.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderAddressModal = (): React.JSX.Element => (
    <Modal
      visible={showAddressModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddressModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Address</Text>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.modalOptionCard,
                  selectedAddress?.id === address.id &&
                    styles.modalSelectedOption,
                ]}
                onPress={() => {
                  setSelectedAddress(address);
                  setShowAddressModal(false);
                }}
              >
                <Icon
                  name="location-on"
                  size={24}
                  color={
                    selectedAddress?.id === address.id ? "#007AFF" : "#666"
                  }
                />
                <View style={styles.modalCardContent}>
                  <Text style={styles.modalCardTitle}>{address.name}</Text>
                  <Text style={styles.modalCardSubtitle}>{address.street}</Text>
                  <Text style={styles.modalCardSubtitle}>
                    {address.city}, {address.state} {address.zipCode}
                  </Text>
                </View>
                <Icon
                  name={
                    selectedAddress?.id === address.id
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={24}
                  color={
                    selectedAddress?.id === address.id ? "#007AFF" : "#ccc"
                  }
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addNewButton}>
            <Icon name="add" size={20} color="#007AFF" />
            <Text style={styles.addNewButtonText}>Add New Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPaymentModal = (): React.JSX.Element => (
    <Modal
      visible={showPaymentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {paymentMethods.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={[
                  styles.modalOptionCard,
                  selectedPayment?.id === payment.id &&
                    styles.modalSelectedOption,
                ]}
                onPress={() => {
                  setSelectedPayment(payment);
                  setShowPaymentModal(false);
                }}
              >
                <Icon
                  name={payment.icon}
                  size={24}
                  color={
                    selectedPayment?.id === payment.id ? "#007AFF" : "#666"
                  }
                />
                <View style={styles.modalCardContent}>
                  <Text style={styles.modalCardTitle}>{payment.name}</Text>
                  <Text style={styles.modalCardSubtitle}>
                    {payment.details}
                  </Text>
                </View>
                <Icon
                  name={
                    selectedPayment?.id === payment.id
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={24}
                  color={
                    selectedPayment?.id === payment.id ? "#007AFF" : "#ccc"
                  }
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addNewButton}>
            <Icon name="add" size={20} color="#007AFF" />
            <Text style={styles.addNewButtonText}>Add New Payment Method</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="shopping-cart" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Add some items to proceed with checkout
        </Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate("Products")}
        >
          <Text style={styles.shopButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderOrderSummary()}
        {renderDeliveryOptions()}
        {renderAddressSection()}
        {renderPaymentSection()}
        {renderOrderNotes()}
        {renderPricingBreakdown()}

        <View style={styles.estimatedDelivery}>
          <Icon name="schedule" size={20} color="#4CAF50" />
          <Text style={styles.estimatedDeliveryText}>
            Estimated Delivery: {getEstimatedDelivery()}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.totalSummary}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>R{finalTotal.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="lock" size={20} color="#FFFFFF" />
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderAddressModal()}
      {renderPaymentModal()}
    </KeyboardAvoidingView>
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  changeText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  orderItemDetails: {
    fontSize: 12,
    color: "#666",
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  moreItemsText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  optionDetails: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  optionFee: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
    marginRight: 12,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
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
  estimatedDelivery: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  estimatedDeliveryText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
    marginLeft: 8,
  },
  bottomContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  totalSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  placeOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
  },
  placeOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
    marginBottom: 12,
  },
  modalSelectedOption: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  modalCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  modalCardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 12,
  },
  addNewButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#F8F9FA",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CheckoutScreen;
