import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import theme from "../theme";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "gradient" | "outlined";
  onPress?: () => void;
  style?: ViewStyle;
  gradientColors?: string[];
  padding?: keyof typeof theme.spacing;
  borderRadius?: keyof typeof theme.radius;
  disabled?: boolean;
  animated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  onPress,
  style,
  gradientColors,
  padding = "md",
  borderRadius = "lg",
  disabled = false,
  animated = true,
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const cardStyles = [
    styles.base,
    styles[variant],
    {
      padding: theme.spacing[padding],
      borderRadius: theme.radius[borderRadius],
    },
    disabled && styles.disabled,
    style,
  ];

  const renderCard = () => {
    if (variant === "gradient") {
      const colors = gradientColors || theme.colors.gradients.primary;
      return (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyles}
        >
          {children}
        </LinearGradient>
      );
    }

    return <View style={cardStyles}>{children}</View>;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={animated ? 1 : 0.7}
      >
        <Animated.View
          style={animated ? { transform: [{ scale: scaleValue }] } : {}}
        >
          {renderCard()}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return renderCard();
};

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },

  default: {
    backgroundColor: theme.colors.card,
    ...theme.shadows.sm,
  },

  elevated: {
    backgroundColor: theme.colors.card,
    ...theme.shadows.lg,
  },

  gradient: {
    backgroundColor: "transparent",
    ...theme.shadows.md,
  },

  outlined: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  disabled: {
    opacity: 0.6,
  },
});

export default Card;
