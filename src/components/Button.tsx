import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import theme from "../theme";

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  style,
  textStyle,
  children,
}) => {
  const buttonStyles = [
    styles.base,
    styles[size],
    styles[variant],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  const iconColor =
    variant === "primary" || variant === "gradient"
      ? theme.colors.card
      : variant === "outline" || variant === "ghost"
      ? theme.colors.primary
      : theme.colors.card;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={
              variant === "primary" || variant === "gradient"
                ? theme.colors.card
                : theme.colors.primary
            }
          />
          {title && (
            <Text style={[textStyles, { marginLeft: theme.spacing.sm }]}>
              {title}
            </Text>
          )}
        </View>
      );
    }

    const content = children || (
      <View style={[styles.content, icon && styles.contentWithIcon]}>
        {icon && iconPosition === "left" && (
          <Icon
            name={icon}
            size={iconSize}
            color={iconColor}
            style={styles.iconLeft}
          />
        )}
        {title && <Text style={textStyles}>{title}</Text>}
        {icon && iconPosition === "right" && (
          <Icon
            name={icon}
            size={iconSize}
            color={iconColor}
            style={styles.iconRight}
          />
        )}
      </View>
    );

    return content;
  };

  if (variant === "gradient") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[{ borderRadius: theme.radius.lg }, style]}
      >
        <LinearGradient
          colors={theme.colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            styles[size],
            styles.gradient,
            fullWidth && styles.fullWidth,
            disabled && styles.disabled,
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyles}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...theme.shadows.sm,
  },

  // Sizes
  sm: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    minHeight: 56,
  },

  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  gradient: {
    backgroundColor: "transparent",
  },

  // States
  disabled: {
    opacity: 0.5,
    ...theme.shadows.sm,
  },

  fullWidth: {
    width: "100%",
  },

  // Text styles
  text: {
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: "center",
  },

  text_primary: {
    color: theme.colors.card,
  },
  text_secondary: {
    color: theme.colors.card,
  },
  text_outline: {
    color: theme.colors.primary,
  },
  text_ghost: {
    color: theme.colors.primary,
  },
  text_gradient: {
    color: theme.colors.card,
  },

  text_sm: {
    fontSize: theme.typography.fontSizes.sm,
  },
  text_md: {
    fontSize: theme.typography.fontSizes.base,
  },
  text_lg: {
    fontSize: theme.typography.fontSizes.lg,
  },

  textDisabled: {
    opacity: 0.7,
  },

  // Content layout
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  contentWithIcon: {
    // Note: gap not supported in RN 0.75, using marginLeft/Right on icons instead
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  iconLeft: {
    marginRight: theme.spacing.sm,
  },

  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});

export default Button;
