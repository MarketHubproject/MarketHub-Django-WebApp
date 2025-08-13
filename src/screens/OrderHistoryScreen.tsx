import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import ApiService from "../services";
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
  items: OrderItem[];
  shipping_address: {
    full_name: string;
    street_address: string;
    city: string;
    postal_code: string;
    country: string;
  };
  payment_method: string;
}

const OrderHistoryScreen = ({ navigation }: any): React.JSX.Element => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "delivered" | "cancelled"
  >("all");

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async (showRefresh = false): Promise<void> => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock data - replace with actual API call
      const mockOrders: Order[] = [
        {
          id: 1,
          order_number: "MH-2024-001",
          status: "delivered",
          total_amount: 2499.98,
          currency: "ZAR",
          created_at: "2024-01-15T10:30:00Z",
          estimated_delivery: "2024-01-20T09:00:00Z",
          items: [
            {
              id: 1,
              product_id: 101,
              product_name: "Wireless Bluetooth Headphones",
              quantity: 1,
              unit_price: 1299.99,
              total_price: 1299.99,
            },
            {
              id: 2,
              product_id: 102,
              product_name: "Smartphone Case",
              quantity: 2,
              unit_price: 599.99,
              total_price: 1199.99,
            },
          ],
          shipping_address: {
            full_name: "John Doe",
            street_address: "123 Main Street",
            city: "Cape Town",
            postal_code: "8001",
            country: "South Africa",
          },
          payment_method: "Credit Card",
        },
        {
          id: 2,
          order_number: "MH-2024-002",
          status: "shipped",
          total_amount: 899.99,
          currency: "ZAR",
          created_at: "2024-01-18T14:45:00Z",
          estimated_delivery: "2024-01-22T09:00:00Z",
          items: [
            {
              id: 3,
              product_id: 103,
              product_name: "Wireless Mouse",
              quantity: 1,
              unit_price: 899.99,
              total_price: 899.99,
            },
          ],
          shipping_address: {
            full_name: "John Doe",
            street_address: "123 Main Street",
            city: "Cape Town",
            postal_code: "8001",
            country: "South Africa",
          },
          payment_method: "Credit Card",
        },
        {
          id: 3,
          order_number: "MH-2024-003",
          status: "processing",
          total_amount: 3299.99,
          currency: "ZAR",
          created_at: "2024-01-20T11:20:00Z",
          estimated_delivery: "2024-01-25T09:00:00Z",
          items: [
            {
              id: 4,
              product_id: 104,
              product_name: "Laptop Stand",
              quantity: 1,
              unit_price: 1599.99,
              total_price: 1599.99,
            },
            {
              id: 5,
              product_id: 105,
              product_name: "USB-C Hub",
              quantity: 1,
              unit_price: 1699.99,
              total_price: 1699.99,
            },
          ],
          shipping_address: {
            full_name: "John Doe",
            street_address: "123 Main Street",
            city: "Cape Town",
            postal_code: "8001",
            country: "South Africa",
          },
          payment_method: "Credit Card",
        },
        {
          id: 4,
          order_number: "MH-2024-004",
          status: "cancelled",
          total_amount: 1999.99,
          currency: "ZAR",
          created_at: "2024-01-22T16:15:00Z",
          items: [
            {
              id: 6,
              product_id: 106,
              product_name: "Gaming Keyboard",
              quantity: 1,
              unit_price: 1999.99,
              total_price: 1999.99,
            },
          ],
          shipping_address: {
            full_name: "John Doe",
            street_address: "123 Main Street",
            city: "Cape Town",
            postal_code: "8001",
            country: "South Africa",
          },
          payment_method: "Credit Card",
        },
      ];

      setOrders(mockOrders);
    } catch (error: any) {
      logger.error("Error loading orders", error, {
        component: "OrderHistoryScreen",
        action: "loadOrders",
      });

      ErrorToast.show({
        title: "Error",
        message: "Failed to load order history. Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = (): void => {
    loadOrders(true);
  };

  const getStatusColor = (status: Order["status"]): string => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "confirmed":
        return "#2196F3";
      case "processing":
        return "#9C27B0";
      case "shipped":
        return "#FF9800";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const getStatusIcon = (status: Order["status"]): string => {
    switch (status) {
      case "pending":
        return "schedule";
      case "confirmed":
        return "check-circle";
      case "processing":
        return "sync";
      case "shipped":
        return "local-shipping";
      case "delivered":
        return "done-all";
      case "cancelled":
        return "cancel";
      default:
        return "help";
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  const handleReorder = (order: Order): void => {
    Alert.alert(
      "Reorder Items",
      `Add all items from order ${order.order_number} to your cart?`,
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

  const renderFilterButtons = (): React.JSX.Element => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {[
        { key: "all", label: "All Orders" },
        { key: "pending", label: "Pending" },
        { key: "delivered", label: "Delivered" },
        { key: "cancelled", label: "Cancelled" },
      ].map((filterOption) => (
        <TouchableOpacity
          key={filterOption.key}
          style={[
            styles.filterButton,
            filter === filterOption.key && styles.activeFilterButton,
          ]}
          onPress={() => setFilter(filterOption.key as any)}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === filterOption.key && styles.activeFilterButtonText,
            ]}
          >
            {filterOption.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderOrderCard = (order: Order): React.JSX.Element => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() =>
        navigation.navigate("OrderDetails", { orderId: order.id, order })
      }
    >
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        >
          <Icon
            name={getStatusIcon(order.status)}
            size={16}
            color="#FFFFFF"
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Order Items Preview */}
      <View style={styles.orderItems}>
        <Text style={styles.itemsLabel}>
          {order.items.length} item{order.items.length > 1 ? "s" : ""}
        </Text>
        <Text style={styles.itemsPreview}>
          {order.items
            .slice(0, 2)
            .map((item) => item.product_name)
            .join(", ")}
          {order.items.length > 2 && ` +${order.items.length - 2} more`}
        </Text>
      </View>

      {/* Order Footer */}
      <View style={styles.orderFooter}>
        <View style={styles.orderTotal}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(order.total_amount, order.currency)}
          </Text>
        </View>

        <View style={styles.orderActions}>
          {order.status === "delivered" && (
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => handleReorder(order)}
            >
              <Icon name="refresh" size={16} color="#007AFF" />
              <Text style={styles.reorderText}>Reorder</Text>
            </TouchableOpacity>
          )}

          {(order.status === "shipped" || order.status === "processing") && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() =>
                navigation.navigate("OrderDetails", {
                  orderId: order.id,
                  order,
                })
              }
            >
              <Icon name="track-changes" size={16} color="#007AFF" />
              <Text style={styles.trackText}>Track</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = (): React.JSX.Element => (
    <View style={styles.emptyContainer}>
      <Icon name="shopping-bag" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptySubtitle}>
        {filter === "all"
          ? "You haven't placed any orders yet"
          : `No ${filter} orders found`}
      </Text>
      <TouchableOpacity
        style={styles.shopNowButton}
        onPress={() => navigation.navigate("Products")}
      >
        <Text style={styles.shopNowText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
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
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredOrders.length > 0 ? (
          <View style={styles.ordersContainer}>
            {filteredOrders.map(renderOrderCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
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
  filterContainer: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  activeFilterButton: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  ordersContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemsPreview: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  orderTotal: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  orderActions: {
    flexDirection: "row",
    gap: 12,
  },
  reorderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  reorderText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  trackText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  shopNowButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopNowText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OrderHistoryScreen;
