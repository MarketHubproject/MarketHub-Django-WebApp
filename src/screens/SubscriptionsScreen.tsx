import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  FlatList,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SmartImage } from "../components";
import {
  Subscription,
  SubscriptionDelivery,
  SubscriptionFrequency,
  SubscriptionStatus,
  DeliveryStatus,
} from "../shared/types";
import { logger, ErrorToast } from "../utils";
import NotificationService from "../services/notificationService";

const SubscriptionsScreen = ({ navigation }: any): React.JSX.Element => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<
    SubscriptionDelivery[]
  >([]);
  const [notifications, setNotifications] = useState<boolean>(true);

  useEffect(() => {
    loadSubscriptions();
    loadNotificationSettings();
  }, []);

  const loadSubscriptions = async (): Promise<void> => {
    try {
      setLoading(true);

      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock subscription data
      const mockSubscriptions: Subscription[] = [
        {
          id: "1",
          userId: "user123",
          productId: 1,
          product: {
            id: 1,
            name: "Premium Dog Food",
            description: "High-quality nutrition for your pet",
            price: 89.99,
            images: ["https://via.placeholder.com/200"],
            category: {
              id: 1,
              name: "Pet Food",
              slug: "pet-food",
              productCount: 50,
            },
            brand: "PetNutrition",
            stock: 25,
            rating: 4.8,
            reviewCount: 156,
            isFeature: false,
            tags: ["pet", "food", "premium"],
            specifications: {},
            is_subscribable: true,
            subscription_frequency_options: ["weekly", "biweekly", "monthly"],
            subscription_discount_percentage: 15,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
          quantity: 2,
          frequency: "monthly",
          nextDelivery: "2024-02-15",
          status: "active",
          totalDeliveries: 3,
          createdAt: "2023-11-15",
          updatedAt: "2024-01-15",
          discountPercentage: 15,
          shippingAddress: {
            id: "1",
            type: "home",
            name: "Home",
            firstName: "John",
            lastName: "Doe",
            street: "123 Main St",
            city: "Johannesburg",
            state: "Gauteng",
            zipCode: "2001",
            country: "South Africa",
            isDefault: true,
          },
          paymentMethod: {
            id: "1",
            type: "card",
            name: "Credit Card",
            last4: "1234",
            brand: "Visa",
            isDefault: true,
          },
          notes: "Leave at front door",
        },
        {
          id: "2",
          userId: "user123",
          productId: 2,
          product: {
            id: 2,
            name: "Organic Coffee Beans",
            description: "Fair trade organic coffee",
            price: 24.99,
            images: ["https://via.placeholder.com/200"],
            category: {
              id: 2,
              name: "Beverages",
              slug: "beverages",
              productCount: 30,
            },
            brand: "CoffeePro",
            stock: 50,
            rating: 4.6,
            reviewCount: 89,
            isFeature: false,
            tags: ["coffee", "organic", "fair-trade"],
            specifications: {},
            is_subscribable: true,
            subscription_frequency_options: ["biweekly", "monthly"],
            subscription_discount_percentage: 10,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
          quantity: 1,
          frequency: "biweekly",
          nextDelivery: "2024-02-08",
          status: "paused",
          totalDeliveries: 5,
          createdAt: "2023-10-01",
          updatedAt: "2024-01-10",
          pausedUntil: "2024-02-20",
          discountPercentage: 10,
          shippingAddress: {
            id: "1",
            type: "home",
            name: "Home",
            firstName: "John",
            lastName: "Doe",
            street: "123 Main St",
            city: "Johannesburg",
            state: "Gauteng",
            zipCode: "2001",
            country: "South Africa",
            isDefault: true,
          },
          paymentMethod: {
            id: "1",
            type: "card",
            name: "Credit Card",
            last4: "1234",
            brand: "Visa",
            isDefault: true,
          },
        },
      ];

      // Mock upcoming deliveries
      const mockDeliveries: SubscriptionDelivery[] = [
        {
          id: "1",
          subscriptionId: "1",
          scheduledDate: "2024-02-15",
          status: "scheduled",
          quantity: 2,
          price: 76.49, // with discount
          createdAt: "2024-01-15",
        },
        {
          id: "2",
          subscriptionId: "2",
          scheduledDate: "2024-02-08",
          status: "scheduled",
          quantity: 1,
          price: 22.49, // with discount
          createdAt: "2024-01-08",
          skipped: false,
        },
      ];

      setSubscriptions(mockSubscriptions);
      setUpcomingDeliveries(mockDeliveries);
    } catch (error: any) {
      logger.error("Error loading subscriptions", error, {
        component: "SubscriptionsScreen",
        action: "loadSubscriptions",
      });

      ErrorToast.show({
        title: "Error",
        message: "Failed to load subscriptions. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async (): Promise<void> => {
    try {
      const preferences = NotificationService.getPreferences();
      // Set notifications state based on subscription-related preferences
      setNotifications(preferences.order_status || preferences.general);
    } catch (error: any) {
      console.error("Error loading notification settings:", error);
    }
  };

  const handlePauseSubscription = async (
    subscriptionId: string
  ): Promise<void> => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId
            ? {
                ...sub,
                status: "paused" as SubscriptionStatus,
                pausedUntil: "2024-03-01",
              }
            : sub
        )
      );

      Alert.alert("Success", "Subscription paused successfully");
    } catch (error: any) {
      ErrorToast.show({
        title: "Error",
        message: "Failed to pause subscription. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSubscription = async (
    subscriptionId: string
  ): Promise<void> => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId
            ? {
                ...sub,
                status: "active" as SubscriptionStatus,
                pausedUntil: undefined,
              }
            : sub
        )
      );

      Alert.alert("Success", "Subscription resumed successfully");
    } catch (error: any) {
      ErrorToast.show({
        title: "Error",
        message: "Failed to resume subscription. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipDelivery = async (deliveryId: string): Promise<void> => {
    Alert.alert(
      "Skip Delivery",
      "Are you sure you want to skip the next delivery?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              // Simulate API call
              await new Promise((resolve) => setTimeout(resolve, 1000));

              setUpcomingDeliveries((prev) =>
                prev.map((delivery) =>
                  delivery.id === deliveryId
                    ? {
                        ...delivery,
                        status: "skipped" as DeliveryStatus,
                        skipped: true,
                      }
                    : delivery
                )
              );

              Alert.alert("Success", "Delivery skipped successfully");
            } catch (error: any) {
              ErrorToast.show({
                title: "Error",
                message: "Failed to skip delivery. Please try again.",
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleNotificationToggle = async (enabled: boolean): Promise<void> => {
    try {
      setNotifications(enabled);

      // Update notification preferences
      NotificationService.setPreferences({
        order_status: enabled,
        general: enabled,
      });

      if (enabled) {
        // Schedule upcoming delivery reminders
        for (const delivery of upcomingDeliveries) {
          if (delivery.status === "scheduled" && !delivery.skipped) {
            const reminderDate = new Date(delivery.scheduledDate);
            reminderDate.setDate(reminderDate.getDate() - 1); // Day before

            await NotificationService.scheduleNotification({
              title: "Subscription Delivery Tomorrow",
              body: `Your subscription order will be delivered tomorrow`,
              data: {
                subscriptionId: delivery.subscriptionId,
                deliveryId: delivery.id,
                deepLink: "/subscriptions",
              },
              triggerAt: reminderDate,
            });
          }
        }
      } else {
        // Cancel all subscription-related notifications
        await NotificationService.cancelAllNotifications();
      }
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
      ErrorToast.show({
        title: "Error",
        message: "Failed to update notification settings.",
      });
    }
  };

  const getFrequencyLabel = (frequency: SubscriptionFrequency): string => {
    const labels = {
      weekly: "Every week",
      biweekly: "Every 2 weeks",
      monthly: "Every month",
      bimonthly: "Every 2 months",
      quarterly: "Every 3 months",
    };
    return labels[frequency];
  };

  const getStatusColor = (status: SubscriptionStatus): string => {
    const colors = {
      active: "#4CAF50",
      paused: "#FF9800",
      cancelled: "#F44336",
      pending: "#2196F3",
    };
    return colors[status];
  };

  const getStatusIcon = (status: SubscriptionStatus): string => {
    const icons = {
      active: "check-circle",
      paused: "pause-circle-filled",
      cancelled: "cancel",
      pending: "pending",
    };
    return icons[status];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderSubscriptionCard = ({
    item: subscription,
  }: {
    item: Subscription;
  }): React.JSX.Element => (
    <TouchableOpacity
      style={styles.subscriptionCard}
      onPress={() => {
        setSelectedSubscription(subscription);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <SmartImage
          source={{ uri: subscription.product.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
          fallbackText={subscription.product.name}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{subscription.product.name}</Text>
          <Text style={styles.productBrand}>{subscription.product.brand}</Text>
          <Text style={styles.subscriptionFrequency}>
            {getFrequencyLabel(subscription.frequency)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Icon
            name={getStatusIcon(subscription.status)}
            size={24}
            color={getStatusColor(subscription.status)}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(subscription.status) },
            ]}
          >
            {subscription.status.charAt(0).toUpperCase() +
              subscription.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{subscription.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Next Delivery:</Text>
          <Text style={styles.detailValue}>
            {subscription.status === "paused"
              ? "Paused"
              : formatDate(subscription.nextDelivery)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.priceText}>
            R
            {(
              subscription.product.price *
              subscription.quantity *
              (1 - (subscription.discountPercentage || 0) / 100)
            ).toFixed(2)}
          </Text>
        </View>
        {subscription.discountPercentage && (
          <View style={styles.savingsRow}>
            <Icon name="savings" size={16} color="#4CAF50" />
            <Text style={styles.savingsText}>
              Save {subscription.discountPercentage}% with subscription
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {subscription.status === "active" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={() => handlePauseSubscription(subscription.id)}
          >
            <Icon name="pause" size={16} color="#FF9800" />
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        )}
        {subscription.status === "paused" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resumeButton]}
            onPress={() => handleResumeSubscription(subscription.id)}
          >
            <Icon name="play-arrow" size={16} color="#4CAF50" />
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.manageButton]}
          onPress={() => {
            setSelectedSubscription(subscription);
            setShowDetailsModal(true);
          }}
        >
          <Icon name="settings" size={16} color="#007AFF" />
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderUpcomingDelivery = ({
    item: delivery,
  }: {
    item: SubscriptionDelivery;
  }): React.JSX.Element => {
    const subscription = subscriptions.find(
      (sub) => sub.id === delivery.subscriptionId
    );
    if (!subscription) return <></>;

    return (
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryProductName}>
              {subscription.product.name}
            </Text>
            <Text style={styles.deliveryDate}>
              {formatDate(delivery.scheduledDate)}
            </Text>
          </View>
          <Text style={styles.deliveryPrice}>R{delivery.price.toFixed(2)}</Text>
        </View>

        {delivery.status === "scheduled" && !delivery.skipped && (
          <View style={styles.deliveryActions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => handleSkipDelivery(delivery.id)}
            >
              <Icon name="skip-next" size={16} color="#FF9800" />
              <Text style={styles.skipButtonText}>Skip This Delivery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderDetailsModal = (): React.JSX.Element => (
    <Modal
      visible={showDetailsModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Subscription Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedSubscription && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.productSection}>
                <SmartImage
                  source={{ uri: selectedSubscription.product.images[0] }}
                  style={styles.modalProductImage}
                  resizeMode="cover"
                  fallbackText={selectedSubscription.product.name}
                />
                <View style={styles.modalProductInfo}>
                  <Text style={styles.modalProductName}>
                    {selectedSubscription.product.name}
                  </Text>
                  <Text style={styles.modalProductBrand}>
                    {selectedSubscription.product.brand}
                  </Text>
                  <Text style={styles.modalProductDescription}>
                    {selectedSubscription.product.description}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Subscription Details</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Frequency:</Text>
                  <Text style={styles.detailItemValue}>
                    {getFrequencyLabel(selectedSubscription.frequency)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Quantity:</Text>
                  <Text style={styles.detailItemValue}>
                    {selectedSubscription.quantity}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.detailItemValue,
                      { color: getStatusColor(selectedSubscription.status) },
                    ]}
                  >
                    {selectedSubscription.status.charAt(0).toUpperCase() +
                      selectedSubscription.status.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Next Delivery:</Text>
                  <Text style={styles.detailItemValue}>
                    {selectedSubscription.status === "paused"
                      ? "Paused"
                      : formatDate(selectedSubscription.nextDelivery)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Total Deliveries:</Text>
                  <Text style={styles.detailItemValue}>
                    {selectedSubscription.totalDeliveries}
                  </Text>
                </View>
              </View>

              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Delivery Notes</Text>
                <Text style={styles.notesText}>
                  {selectedSubscription.notes || "No special instructions"}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading && subscriptions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Subscriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Notification Settings */}
      <View style={styles.notificationSection}>
        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="notifications" size={24} color="#007AFF" />
            <View style={styles.notificationText}>
              <Text style={styles.notificationTitle}>Delivery Reminders</Text>
              <Text style={styles.notificationSubtitle}>
                Get notified about upcoming deliveries
              </Text>
            </View>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: "#E1E1E1", true: "#007AFF" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Subscriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Subscriptions</Text>
          {subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="subscriptions" size={60} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No Subscriptions</Text>
              <Text style={styles.emptySubtitle}>
                Subscribe to products you use regularly and save money
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate("Products")}
              >
                <Text style={styles.browseButtonText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={subscriptions}
              renderItem={renderSubscriptionCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.subscriptionsList}
            />
          )}
        </View>

        {/* Upcoming Deliveries */}
        {upcomingDeliveries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Deliveries</Text>
            <FlatList
              data={upcomingDeliveries.filter(
                (d) => d.status === "scheduled" && !d.skipped
              )}
              renderItem={renderUpcomingDelivery}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.deliveriesList}
            />
          </View>
        )}
      </ScrollView>

      {renderDetailsModal()}
    </SafeAreaView>
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
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  notificationSection: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  notificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  notificationText: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  subscriptionsList: {
    paddingBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  subscriptionFrequency: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  savingsText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  pauseButton: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  pauseButtonText: {
    color: "#FF9800",
    fontWeight: "600",
    marginLeft: 4,
  },
  resumeButton: {
    backgroundColor: "#F1F8E9",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  resumeButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 4,
  },
  manageButton: {
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  manageButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  deliveriesList: {
    paddingBottom: 16,
  },
  deliveryCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  deliveryDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  deliveryActions: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 8,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "#FFF3E0",
    borderRadius: 6,
  },
  skipButtonText: {
    color: "#FF9800",
    fontWeight: "500",
    marginLeft: 4,
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  browseButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "white",
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  productSection: {
    flexDirection: "row",
    marginBottom: 24,
  },
  modalProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  modalProductBrand: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  modalProductDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailItemLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailItemValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  notesSection: {
    marginBottom: 24,
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
  },
});

export default SubscriptionsScreen;
