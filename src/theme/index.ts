import { Dimensions, PixelRatio } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Design System Configuration
export const theme = {
  // Colors - Modern, professional palette
  colors: {
    // Primary brand colors
    primary: "#6366F1", // Indigo
    primaryDark: "#4F46E5",
    primaryLight: "#8B5CF6",

    // Secondary colors
    secondary: "#EC4899", // Pink
    secondaryDark: "#DB2777",
    secondaryLight: "#F472B6",

    // Accent colors
    accent: "#10B981", // Emerald
    accentDark: "#059669",
    accentLight: "#34D399",

    // Status colors
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",

    // Neutral grays (professional)
    gray50: "#F9FAFB",
    gray100: "#F3F4F6",
    gray200: "#E5E7EB",
    gray300: "#D1D5DB",
    gray400: "#9CA3AF",
    gray500: "#6B7280",
    gray600: "#4B5563",
    gray700: "#374151",
    gray800: "#1F2937",
    gray900: "#111827",

    // Semantic colors
    background: "#FFFFFF",
    surface: "#F9FAFB",
    card: "#FFFFFF",
    text: "#1F2937",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    border: "#E5E7EB",
    divider: "#F3F4F6",

    // Overlay colors
    overlay: "rgba(0, 0, 0, 0.5)",
    backdrop: "rgba(0, 0, 0, 0.25)",

    // Gradients
    gradients: {
      primary: ["#6366F1", "#8B5CF6"],
      secondary: ["#EC4899", "#F472B6"],
      success: ["#10B981", "#34D399"],
      sunset: ["#F59E0B", "#EC4899"],
      ocean: ["#3B82F6", "#06B6D4"],
    },
  },

  // Typography - Modern, readable scale
  typography: {
    // Font families
    fonts: {
      regular: "System",
      medium: "System",
      bold: "System",
      light: "System",
    },

    // Font sizes (responsive)
    fontSizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
      "5xl": 48,
    },

    // Line heights
    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 2,
    },

    // Font weights
    fontWeights: {
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
  },

  // Spacing system (8px base)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    "2xl": 40,
    "3xl": 48,
    "4xl": 64,
    "5xl": 80,
    "6xl": 96,
  },

  // Border radius
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    "2xl": 20,
    "3xl": 24,
    full: 9999,
  },

  // Shadows (professional depth)
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
    },
  },

  // Layout dimensions
  layout: {
    screenWidth,
    screenHeight,
    contentPadding: 16,
    sectionSpacing: 24,
    headerHeight: 60,
    tabBarHeight: 80,

    // Responsive breakpoints
    breakpoints: {
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
    },
  },

  // Animation timing
  animation: {
    timing: {
      fast: 150,
      normal: 250,
      slow: 350,
    },
    easing: {
      linear: "linear",
      ease: "ease",
      easeIn: "ease-in",
      easeOut: "ease-out",
      easeInOut: "ease-in-out",
    },
  },
};

// Dark theme variant
export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: "#111827",
    surface: "#1F2937",
    card: "#1F2937",
    text: "#F9FAFB",
    textSecondary: "#D1D5DB",
    textMuted: "#9CA3AF",
    border: "#374151",
    divider: "#374151",
  },
};

// Utility functions
export const getResponsiveFontSize = (
  size: keyof typeof theme.typography.fontSizes
) => {
  const baseSize = theme.typography.fontSizes[size];
  return PixelRatio.roundToNearestPixel(baseSize * PixelRatio.getFontScale());
};

export const getResponsiveSpacing = (size: keyof typeof theme.spacing) => {
  return PixelRatio.roundToNearestPixel(theme.spacing[size]);
};

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export default theme;
