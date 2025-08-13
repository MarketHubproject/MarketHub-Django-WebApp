/**
 * Floating Chat Button Component
 * A floating action button that provides quick access to chat support
 */

import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
  AccessibilityInfo,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useI18n } from "../../contexts/I18nContext";
import { theme } from "../../theme";

interface FloatingChatButtonProps {
  onPress: () => void;
  unreadCount?: number;
  isVisible?: boolean;
  position?: "bottom-right" | "bottom-left";
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  onPress,
  unreadCount = 0,
  isVisible = true,
  position = "bottom-right",
}) => {
  const { t } = useI18n();
  const [scaleValue] = useState(new Animated.Value(1));
  const [fadeValue] = useState(new Animated.Value(isVisible ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(fadeValue, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeValue]);

  const handlePress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Announce action for screen readers
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(t("chat.chatWithUs"));
    }

    onPress();
  };

  const positionStyle =
    position === "bottom-right" ? styles.bottomRight : styles.bottomLeft;

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyle,
        {
          transform: [{ scale: scaleValue }],
          opacity: fadeValue,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          unreadCount > 0 && styles.buttonWithNotification,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessible={true}
        accessibilityLabel={t("chat.chatWithUs")}
        accessibilityHint={t("chat.howCanWeHelp")}
        accessibilityRole="button"
        testID="floating-chat-button"
      >
        {/* Chat Icon */}
        <Icon
          name="chat"
          size={24}
          color={theme.colors.background}
          style={styles.icon}
        />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount.toString()}
            </Text>
          </View>
        )}

        {/* Pulse Animation for New Messages */}
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: fadeValue,
              },
            ]}
          />
        )}
      </TouchableOpacity>

      {/* Tooltip/Label (optional, can be shown on first use) */}
      {/* <View style={styles.tooltip}>
        <Text style={styles.tooltipText}>{t('chat.support')}</Text>
      </View> */}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1000,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.lg,
    elevation: 6,
  },
  buttonWithNotification: {
    backgroundColor: theme.colors.error,
  },
  icon: {
    // Center the icon perfectly
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.error,
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
  },
  tooltip: {
    position: "absolute",
    bottom: 70,
    right: 0,
    backgroundColor: theme.colors.gray800,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 120,
  },
  tooltipText: {
    color: theme.colors.background,
    fontSize: 14,
    textAlign: "center",
  },
});

export default FloatingChatButton;
