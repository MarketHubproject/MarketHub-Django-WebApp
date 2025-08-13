import React, { useEffect, useState } from "react";
import { View, Alert } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { appInitService } from "./src/services";
import Toast from "react-native-toast-message";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize all notification and deep linking services
      await appInitService.initialize();

      // Check authentication status
      // This would come from your auth service
      // setIsAuthenticated(await checkAuthStatus());

      setIsInitialized(true);
    } catch (error) {
      console.error("App initialization failed:", error);
      Alert.alert("Error", "Failed to initialize app. Please restart.");
    }
  };

  // Example usage of notification services
  useEffect(() => {
    if (!isInitialized) return;

    // Example: Send test notifications after 10 seconds
    const testNotifications = setTimeout(async () => {
      try {
        // Order status notification
        await appInitService.handleOrderStatusUpdate(
          "TEST123",
          "shipped",
          "TRACK123"
        );

        // Price drop notification
        await appInitService.handlePriceDrop(
          "PROD123",
          "iPhone 15 Pro",
          999.99,
          799.99
        );

        // Promotional notification
        await appInitService.handlePromotionalCampaign(
          "Weekend Sale! 🔥",
          "Get up to 50% off on selected items. Limited time offer!",
          "WEEKEND50",
          "/products?category=sale"
        );
      } catch (error) {
        console.error("Error sending test notifications:", error);
      }
    }, 10000);

    return () => clearTimeout(testNotifications);
  }, [isInitialized]);

  // Example: Track cart activity when items are added/removed
  const handleCartUpdate = async () => {
    await appInitService.trackCartActivity();
  };

  // Example: Create shareable product link
  const handleProductShare = async (productId: string, productName: string) => {
    try {
      const shareLink = await appInitService.createProductShareLink(
        productId,
        productName,
        "https://example.com/product-image.jpg"
      );

      if (shareLink) {
        // Use sharing API or copy to clipboard
        console.log("Share link created:", shareLink);
      }
    } catch (error) {
      console.error("Error creating share link:", error);
    }
  };

  if (!isInitialized) {
    // Show loading screen or splash screen
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  return (
    <>
      <AppNavigator isAuthenticated={isAuthenticated} />
      <Toast />
    </>
  );
};

export default App;

/*
===== USAGE EXAMPLES IN OTHER COMPONENTS =====

// 1. In CartScreen - Track cart activity:
import { appInitService } from '../services';

const CartScreen = () => {
  const addToCart = async (item) => {
    // Add item to cart logic
    
    // Track cart activity to reset abandon timer
    await appInitService.trackCartActivity();
  };
};

// 2. In ProductDetailScreen - Create share links:
import { appInitService } from '../services';

const ProductDetailScreen = ({ route }) => {
  const { product } = route.params;
  
  const handleShare = async () => {
    const shareLink = await appInitService.createProductShareLink(
      product.id,
      product.name,
      product.image
    );
    
    // Use React Native's Share API
    Share.share({
      message: `Check out ${product.name} on MarketHub!`,
      url: shareLink,
    });
  };
};

// 3. In OrderConfirmationScreen - Send order notifications:
import { appInitService } from '../services';

const OrderConfirmationScreen = ({ route }) => {
  const { order } = route.params;
  
  useEffect(() => {
    // Send order confirmation notification
    appInitService.handleOrderStatusUpdate(order.id, 'confirmed');
  }, [order]);
};

// 4. In Settings/Profile - Navigate to notification preferences:
const SettingsScreen = ({ navigation }) => {
  const openNotificationSettings = () => {
    navigation.navigate('NotificationPreferences');
  };
};

// 5. Handle deep link in any component:
import { deepLinkService } from '../services';

const SomeComponent = () => {
  useEffect(() => {
    // Handle deep link with custom data
    const handleDeepLink = (deepLink, data) => {
      deepLinkService.handleNotificationDeepLink(deepLink, data);
    };
  }, []);
};
*/
