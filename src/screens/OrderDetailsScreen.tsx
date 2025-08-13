import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { logger, ErrorToast } from "../utils";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TrackingEvent {
  id: number;
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

interface Order {
  id: number;
  order_number: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  total_amount: number;
  currency: string;
  created_at: string;
  estimated_delivery?: string;
  tracking_number?: string;
  courier_service?: string;
  items: OrderItem[];
  shipping_address: {
    full_name: string;
    street_address: string;
    city: string;
    postal_code: string;
    country: string;
  };
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  tracking_events: TrackingEvent[];
}

const OrderDetailsScreen = ({ route, navigation }: any): React.JSX.Element => {
  const { orderId, order: initialOrder } = route.params;
  const [order, setOrder] = useState<Order | null>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);

  useEffect(() => {
    if (!initialOrder) {
      loadOrderDetails();
    } else {
      // Enhance the initial order with additional details
      enhanceOrderDetails(initialOrder);
    }
  }, [orderId, initialOrder]);

  const loadOrderDetails = async (): Promise<void> => {
    try {
      setLoading(true);

      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // This would normally fetch from API using orderId
      ErrorToast.show({
        title: "Error",
        message: "Order details not available.",
      });
    } catch (error: any) {
      logger.error("Error loading order details", error, {
        component: "OrderDetailsScreen",
        action: "loadOrderDetails",
        metadata: { orderId },
      });

      ErrorToast.show({
        title: "Error",
        message: "Failed to load order details. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const enhanceOrderDetails = (orderData: any): void => {
    // Add mock tracking events and additional details
    const enhancedOrder: Order = {
      ...orderData,
      subtotal: orderData.total_amount * 0.9,
      shipping_fee: orderData.total_amount * 0.05,
      tax_amount: orderData.total_amount * 0.05,
      tracking_number:
        orderData.status !== "pending" ? "TRK123456789" : undefined,
      courier_service:
        orderData.status === "shipped" || orderData.status === "delivered"
          ? "CourierPlus"
          : undefined,
      tracking_events: generateTrackingEvents(
        orderData.status,
        orderData.created_at
      ),
    };

    setOrder(enhancedOrder);
  };

  const generateTrackingEvents = (
    status: string,
    createdAt: string
  ): TrackingEvent[] => {
    const events: TrackingEvent[] = [];
    const baseDate = new Date(createdAt);

    events.push({
      id: 1,
      status: "Order Placed",
      description: "Your order has been successfully placed",
      timestamp: baseDate.toISOString(),
    });

    if (status !== "cancelled") {
      events.push({
        id: 2,
        status: "Order Confirmed",
        description: "Your order has been confirmed and payment processed",
        timestamp: new Date(baseDate.getTime() + 30 * 60 * 1000).toISOString(),
      });
    }

    if (
      status === "processing" ||
      status === "shipped" ||
      status === "delivered"
    ) {
      events.push({
        id: 3,
        status: "Processing",
        description: "Your order is being prepared for shipment",
        timestamp: new Date(
          baseDate.getTime() + 2 * 60 * 60 * 1000
        ).toISOString(),
      });
    }

    if (status === "shipped" || status === "delivered") {
      events.push({
        id: 4,
        status: "Shipped",
        description: "Your order has been shipped and is on its way",
        timestamp: new Date(
          baseDate.getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
        location: "Distribution Center, Cape Town",
      });

      events.push({
        id: 5,
        status: "In Transit",
        description: "Package is in transit to your delivery address",
        timestamp: new Date(
          baseDate.getTime() + 48 * 60 * 60 * 1000
        ).toISOString(),
        location: "Local Delivery Hub",
      });
    }

    if (status === "delivered") {
      events.push({
        id: 6,
        status: "Delivered",
        description: "Package has been successfully delivered",
        timestamp: new Date(
          baseDate.getTime() + 72 * 60 * 60 * 1000
        ).toISOString(),
        location: "Your Address",
      });
    }

    if (status === "cancelled") {
      events.push({
        id: 2,
        status: "Cancelled",
        description: "Your order has been cancelled",
        timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(),
      });
    }

    return events.reverse(); // Show most recent first
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "#FFA500";
      case "confirmed":
      case "order confirmed":
        return "#2196F3";
      case "processing":
        return "#9C27B0";
      case "shipped":
      case "in transit":
        return "#FF9800";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const handleTrackPackage = (): void => {
    if (order?.tracking_number && order?.courier_service) {
      Alert.alert(
        "Track Package",
        `Track your package with ${order.courier_service}\nTracking Number: ${order.tracking_number}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Website",
            onPress: () => {
              // This would normally open the courier's tracking website
              Alert.alert(
                "Info",
                "This would open the courier tracking website"
              );
            },
          },
        ]
      );
    }
  };

  const handleReorder = (): void => {
    if (!order) return;

    Alert.alert(
      "Reorder Items",
      "Add all items from this order to your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add to Cart",
          onPress: async () => {
            try {
              // Simulate adding items to cart
              await new Promise((resolve) => setTimeout(resolve, 1000));

              Alert.alert("Success", "Items have been added to your cart!", [
                {
                  text: "View Cart",
                  onPress: () => navigation.navigate("Cart"),
                },
                { text: "Continue Shopping", style: "cancel" },
              ]);
            } catch (error) {
              ErrorToast.show({
                title: "Error",
                message: "Failed to add items to cart. Please try again.",
              });
            }
          },
        },
      ]
    );
  };

  const handleCancelOrder = (): void => {
    if (!order) return;

    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            // Simulate cancellation
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const updatedOrder = { ...order, status: "cancelled" as const };
            setOrder(updatedOrder);

            Alert.alert("Success", "Your order has been cancelled");
          } catch (error) {
            ErrorToast.show({
              title: "Error",
              message: "Failed to cancel order. Please contact support.",
            });
          }
        },
      },
    ]);
  };

  const renderTrackingTimeline = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Timeline</Text>

      {order?.tracking_events.map((event, index) => (
        <View key={event.id} style={styles.timelineItem}>
          <View style={styles.timelineLeft}>
            <View
              style={[
                styles.timelineIcon,
                { backgroundColor: getStatusColor(event.status) },
              ]}
            >
              <Icon name="check" size={12} color="#FFFFFF" />
            </View>
            {index < (order?.tracking_events.length || 0) - 1 && (
              <View style={styles.timelineLine} />
            )}
          </View>

          <View style={styles.timelineRight}>
            <Text style={styles.timelineStatus}>{event.status}</Text>
            <Text style={styles.timelineDescription}>{event.description}</Text>
            <Text style={styles.timelineTime}>
              {formatDate(event.timestamp)}
            </Text>
            {event.location && (
              <Text style={styles.timelineLocation}>📍 {event.location}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderOrderItems = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Items</Text>

      {order?.items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.product_name}</Text>
            <Text style={styles.itemDetails}>
              Qty: {item.quantity} ×{" "}
              {formatCurrency(item.unit_price, order.currency)}
            </Text>
          </View>
          <Text style={styles.itemTotal}>
            {formatCurrency(item.total_price, order.currency)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderPricingBreakdown = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Subtotal</Text>
        <Text style={styles.priceValue}>
          {formatCurrency(order?.subtotal || 0, order?.currency || "ZAR")}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Shipping</Text>
        <Text style={styles.priceValue}>
          {formatCurrency(order?.shipping_fee || 0, order?.currency || "ZAR")}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Tax</Text>
        <Text style={styles.priceValue}>
          {formatCurrency(order?.tax_amount || 0, order?.currency || "ZAR")}
        </Text>
      </View>

      <View style={[styles.priceRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          {formatCurrency(order?.total_amount || 0, order?.currency || "ZAR")}
        </Text>
      </View>
    </View>
  );

  const renderShippingInfo = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shipping Information</Text>

      <View style={styles.addressContainer}>
        <Icon
          name="location-on"
          size={20}
          color="#666"
          style={styles.addressIcon}
        />
        <View style={styles.addressText}>
          <Text style={styles.addressName}>
            {order?.shipping_address.full_name}
          </Text>
          <Text style={styles.addressLine}>
            {order?.shipping_address.street_address}
          </Text>
          <Text style={styles.addressLine}>
            {order?.shipping_address.city},{" "}
            {order?.shipping_address.postal_code}
          </Text>
          <Text style={styles.addressLine}>
            {order?.shipping_address.country}
          </Text>
        </View>
      </View>

      {order?.tracking_number && (
        <View style={styles.trackingInfo}>
          <Text style={styles.trackingLabel}>Tracking Number</Text>
          <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
          {order.courier_service && (
            <Text style={styles.courierService}>
              via {order.courier_service}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderActionButtons = (): React.JSX.Element => (
    <View style={styles.actionButtons}>
      {order?.status === "delivered" && (
        <TouchableOpacity style={styles.primaryButton} onPress={handleReorder}>
          <Icon name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Reorder</Text>
        </TouchableOpacity>
      )}

      {(order?.status === "shipped" || order?.status === "processing") && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleTrackPackage}
        >
          <Icon name="track-changes" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Track Package</Text>
        </TouchableOpacity>
      )}

      {order?.status === "pending" && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelOrder}
        >
          <Icon name="cancel" size={18} color="#F44336" />
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() =>
          Alert.alert("Contact Support", "This would open support options")
        }
      >
        <Icon name="help" size={18} color="#007AFF" />
        <Text style={styles.secondaryButtonText}>Get Help</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#FF6B6B" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.orderDate}>
            Placed on {formatDate(order.created_at)}
          </Text>
          {order.estimated_delivery && order.status !== "delivered" && (
            <Text style={styles.estimatedDelivery}>
              Estimated delivery: {formatDate(order.estimated_delivery)}
            </Text>
          )}
        </View>

        {/* Tracking Timeline */}
        {renderTrackingTimeline()}

        {/* Order Items */}
        {renderOrderItems()}

        {/* Pricing Breakdown */}
        {renderPricingBreakdown()}

        {/* Shipping Info */}
        {renderShippingInfo()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </ScrollView>
    </View>
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
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  orderHeader: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
    alignItems: "center",
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  estimatedDelivery: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "white",
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  // Timeline styles
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 16,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginTop: 8,
  },
  timelineRight: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  timelineLocation: {
    fontSize: 12,
    color: "#007AFF",
  },
  // Items styles
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: "#666",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  // Pricing styles
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: "#666",
  },
  priceValue: {
    fontSize: 16,
    color: "#333",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  // Address styles
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  addressIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  addressText: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  trackingInfo: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  trackingLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  courierService: {
    fontSize: 12,
    color: "#007AFF",
  },
  // Action buttons
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8FF",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F0",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F44336",
    gap: 8,
  },
  cancelButtonText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OrderDetailsScreen;
