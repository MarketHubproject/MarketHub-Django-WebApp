import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notificationService, {
  NotificationCategory,
  NotificationPreferences,
} from "../services/notificationService";
import firebaseService from "../services/firebase";

interface NotificationPreferencesScreenProps {
  navigation: any;
}

const NotificationPreferencesScreen: React.FC<
  NotificationPreferencesScreenProps
> = ({ navigation }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    [NotificationCategory.ORDER_STATUS]: true,
    [NotificationCategory.PRICE_DROP]: true,
    [NotificationCategory.ABANDONED_CART]: true,
    [NotificationCategory.PROMOTIONAL]: true,
    [NotificationCategory.GENERAL]: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const storedPreferences = await AsyncStorage.getItem(
        "@notification_preferences"
      );
      if (storedPreferences) {
        const parsedPreferences = JSON.parse(storedPreferences);
        setPreferences(parsedPreferences);
        notificationService.setPreferences(parsedPreferences);
      } else {
        // Use default preferences
        const defaultPrefs = notificationService.getPreferences();
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await AsyncStorage.setItem(
        "@notification_preferences",
        JSON.stringify(newPreferences)
      );
      notificationService.setPreferences(newPreferences);

      // Update Firebase topic subscriptions
      await updateTopicSubscriptions(newPreferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save notification preferences");
    }
  };

  const updateTopicSubscriptions = async (
    newPreferences: NotificationPreferences
  ) => {
    try {
      // Subscribe/unsubscribe from Firebase topics based on preferences
      for (const [category, enabled] of Object.entries(newPreferences)) {
        const topicName = category.replace("_", "-"); // Convert to Firebase topic format

        if (enabled) {
          await firebaseService.subscribeToTopic(topicName);
        } else {
          await firebaseService.unsubscribeFromTopic(topicName);
        }
      }
    } catch (error) {
      console.error("Error updating topic subscriptions:", error);
    }
  };

  const togglePreference = async (category: NotificationCategory) => {
    const newPreferences = {
      ...preferences,
      [category]: !preferences[category],
    };

    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const testNotification = async (category: NotificationCategory) => {
    try {
      switch (category) {
        case NotificationCategory.ORDER_STATUS:
          await notificationService.sendOrderStatusNotification(
            "TEST123",
            "shipped",
            "TR123456789"
          );
          break;

        case NotificationCategory.PRICE_DROP:
          await notificationService.sendPriceDropNotification(
            "test-product",
            "Test Product",
            99.99,
            79.99
          );
          break;

        case NotificationCategory.ABANDONED_CART:
          await notificationService.sendAbandonedCartNotification(3, 149.97);
          break;

        case NotificationCategory.PROMOTIONAL:
          await notificationService.sendPromotionalNotification(
            "Special Offer! 🎉",
            "Get 20% off your next purchase with code TEST20",
            "TEST20"
          );
          break;

        case NotificationCategory.GENERAL:
          await notificationService.displayNotification({
            title: "Test Notification",
            body: "This is a test general notification",
            category: NotificationCategory.GENERAL,
          });
          break;
      }

      Alert.alert("Success", "Test notification sent!");
    } catch (error) {
      console.error("Error sending test notification:", error);
      Alert.alert("Error", "Failed to send test notification");
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      "Reset Preferences",
      "Are you sure you want to reset all notification preferences to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const defaultPrefs: NotificationPreferences = {
              [NotificationCategory.ORDER_STATUS]: true,
              [NotificationCategory.PRICE_DROP]: true,
              [NotificationCategory.ABANDONED_CART]: true,
              [NotificationCategory.PROMOTIONAL]: true,
              [NotificationCategory.GENERAL]: true,
            };

            setPreferences(defaultPrefs);
            await savePreferences(defaultPrefs);
            Alert.alert("Success", "Preferences reset to default values");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const preferenceItems = [
    {
      category: NotificationCategory.ORDER_STATUS,
      title: "Order Updates",
      description:
        "Get notified about order status changes, shipping updates, and delivery confirmations",
      icon: "local-shipping",
    },
    {
      category: NotificationCategory.PRICE_DROP,
      title: "Price Alerts",
      description:
        "Receive notifications when prices drop on items you're watching",
      icon: "trending-down",
    },
    {
      category: NotificationCategory.ABANDONED_CART,
      title: "Cart Reminders",
      description: "Get reminded about items left in your shopping cart",
      icon: "shopping-cart",
    },
    {
      category: NotificationCategory.PROMOTIONAL,
      title: "Promotions & Offers",
      description:
        "Stay updated on special deals, discounts, and promotional campaigns",
      icon: "local-offer",
    },
    {
      category: NotificationCategory.GENERAL,
      title: "General Notifications",
      description: "Receive general app notifications and important updates",
      icon: "notifications",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <TouchableOpacity onPress={resetToDefaults}>
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Categories</Text>
          <Text style={styles.sectionDescription}>
            Choose which types of notifications you'd like to receive
          </Text>
        </View>

        {preferenceItems.map((item) => (
          <View key={item.category} style={styles.preferenceItem}>
            <View style={styles.preferenceContent}>
              <View style={styles.preferenceIcon}>
                <Icon name={item.icon} size={24} color="#007AFF" />
              </View>

              <View style={styles.preferenceDetails}>
                <View style={styles.preferenceTitleRow}>
                  <Text style={styles.preferenceTitle}>{item.title}</Text>
                  <Switch
                    value={preferences[item.category]}
                    onValueChange={() => togglePreference(item.category)}
                    trackColor={{ false: "#E5E5EA", true: "#007AFF" }}
                    thumbColor={
                      preferences[item.category] ? "#FFFFFF" : "#FFFFFF"
                    }
                    ios_backgroundColor="#E5E5EA"
                  />
                </View>

                <Text style={styles.preferenceDescription}>
                  {item.description}
                </Text>

                {preferences[item.category] && (
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => testNotification(item.category)}
                  >
                    <Icon name="send" size={16} color="#007AFF" />
                    <Text style={styles.testButtonText}>Send Test</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Icon name="info" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              You can always change these settings later. Turning off a category
              will stop all notifications of that type.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
  },
  preferenceItem: {
    backgroundColor: "#FFFFFF",
    marginBottom: 1,
    padding: 16,
  },
  preferenceContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  preferenceDetails: {
    flex: 1,
  },
  preferenceTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  preferenceDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0F8FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  testButtonText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
    marginLeft: 4,
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default NotificationPreferencesScreen;
