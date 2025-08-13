import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
} from "react-native";
import theme from "../theme";

const { width: screenWidth } = Dimensions.get("window");

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonLoaderProps {
  variant?: "card" | "list" | "profile" | "custom";
  count?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = theme.radius.sm,
  style,
}) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "custom",
  count = 1,
  style,
  children,
}) => {
  const renderCardSkeleton = () => (
    <View style={[styles.cardSkeleton, style]}>
      <Skeleton
        width="100%"
        height={140}
        borderRadius={theme.radius.md}
        style={styles.cardImage}
      />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={16} style={styles.cardTitle} />
        <Skeleton width="60%" height={12} style={styles.cardSubtitle} />
        <View style={styles.cardFooter}>
          <Skeleton width="30%" height={14} />
          <Skeleton width={40} height={32} borderRadius={theme.radius.lg} />
        </View>
      </View>
    </View>
  );

  const renderListSkeleton = () => (
    <View style={[styles.listSkeleton, style]}>
      <Skeleton width={60} height={60} borderRadius={theme.radius.md} />
      <View style={styles.listContent}>
        <Skeleton width="70%" height={16} style={styles.listTitle} />
        <Skeleton width="50%" height={12} style={styles.listSubtitle} />
        <Skeleton width="40%" height={14} style={styles.listPrice} />
      </View>
    </View>
  );

  const renderProfileSkeleton = () => (
    <View style={[styles.profileSkeleton, style]}>
      <View style={styles.profileHeader}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <View style={styles.profileInfo}>
          <Skeleton width="60%" height={20} />
          <Skeleton
            width="40%"
            height={14}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      </View>
      <View style={styles.profileStats}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.statItem}>
            <Skeleton width={40} height={16} />
            <Skeleton
              width={60}
              height={12}
              style={{ marginTop: theme.spacing.xs }}
            />
          </View>
        ))}
      </View>
    </View>
  );

  if (children) {
    return <View style={style}>{children}</View>;
  }

  const skeletons = Array.from({ length: count }, (_, index) => {
    switch (variant) {
      case "card":
        return <View key={index}>{renderCardSkeleton()}</View>;
      case "list":
        return <View key={index}>{renderListSkeleton()}</View>;
      case "profile":
        return <View key={index}>{renderProfileSkeleton()}</View>;
      default:
        return null;
    }
  });

  return <View style={style}>{skeletons}</View>;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.gray200,
  },

  // Card skeleton
  cardSkeleton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    width: (screenWidth - theme.spacing.lg * 3) / 2,
    ...theme.shadows.sm,
  },

  cardImage: {
    marginBottom: theme.spacing.sm,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    marginBottom: theme.spacing.xs,
  },

  cardSubtitle: {
    marginBottom: theme.spacing.md,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },

  // List skeleton
  listSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },

  listContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },

  listTitle: {
    marginBottom: theme.spacing.xs,
  },

  listSubtitle: {
    marginBottom: theme.spacing.xs,
  },

  listPrice: {},

  // Profile skeleton
  profileSkeleton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },

  profileInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },

  profileStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statItem: {
    alignItems: "center",
    flex: 1,
  },
});

export default SkeletonLoader;
