import React, { Suspense, ComponentType, lazy } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { logger } from "../utils/logger";

// Generic error boundary for lazy components
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: ComponentType },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("Lazy component failed to load", error, {
      component: "LazyComponentErrorBoundary",
      errorInfo: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Component Failed to Load</Text>
          <Text style={styles.errorText}>
            This feature is temporarily unavailable. Please try again later.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// Error fallback component
const ErrorFallback: React.FC = () => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Unable to Load Component</Text>
    <Text style={styles.errorText}>
      This feature is currently unavailable. Please try again later.
    </Text>
  </View>
);

// Higher-order component for lazy loading with customizable fallbacks
export const withLazyLoading = <T extends {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    fallback?: ComponentType;
    loadingMessage?: string;
    errorFallback?: ComponentType;
  } = {}
) => {
  const LazyComponent = lazy(importFn);

  return React.forwardRef<any, T>((props, ref) => {
    const {
      fallback: ErrorFallbackComponent = options.errorFallback || ErrorFallback,
      loadingMessage = options.loadingMessage || "Loading component...",
    } = options;

    return (
      <LazyComponentErrorBoundary fallback={ErrorFallbackComponent}>
        <Suspense fallback={<LoadingFallback message={loadingMessage} />}>
          <LazyComponent ref={ref} {...props} />
        </Suspense>
      </LazyComponentErrorBoundary>
    );
  });
};

// Pre-configured lazy components for heavy features

// AR Component
export const LazyARProductViewer = withLazyLoading(
  () => import("../components/ARProductViewer"),
  {
    loadingMessage: "Loading AR Viewer...",
    errorFallback: () => (
      <View style={styles.featureUnavailableContainer}>
        <Text style={styles.featureUnavailableTitle}>AR View Unavailable</Text>
        <Text style={styles.featureUnavailableText}>
          AR functionality is not available on this device or is temporarily
          disabled.
        </Text>
      </View>
    ),
  }
);

// Chat Component (assuming there's a chat screen)
export const LazyChatScreen = withLazyLoading(
  () =>
    import("../screens/ChatSupportScreen").catch(() => ({
      default: () => (
        <View style={styles.featureUnavailableContainer}>
          <Text style={styles.featureUnavailableTitle}>Chat Unavailable</Text>
          <Text style={styles.featureUnavailableText}>
            Chat functionality is coming soon.
          </Text>
        </View>
      ),
    })),
  {
    loadingMessage: "Loading Chat...",
  }
);

// 3D Model Viewer (if available)
export const Lazy3DModelViewer = withLazyLoading(
  () =>
    import("../components/3DModelViewer").catch(() => ({
      default: () => (
        <View style={styles.featureUnavailableContainer}>
          <Text style={styles.featureUnavailableTitle}>
            3D View Unavailable
          </Text>
          <Text style={styles.featureUnavailableText}>
            3D model viewing is not supported on this device.
          </Text>
        </View>
      ),
    })),
  {
    loadingMessage: "Loading 3D Model...",
  }
);

// Analytics Dashboard (heavy component)
export const LazyAnalyticsDashboard = withLazyLoading(
  () => import("../screens/AnalyticsDashboardScreen"),
  {
    loadingMessage: "Loading Analytics...",
  }
);

// Settings Screen (potentially heavy with many options)
export const LazySettingsScreen = withLazyLoading(
  () => import("../screens/SettingsScreen"),
  {
    loadingMessage: "Loading Settings...",
  }
);

// Hook for preloading components
export const usePreloadComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  React.useEffect(() => {
    // Preload component after a delay to not impact initial render
    const timer = setTimeout(() => {
      importFn().catch((error) => {
        logger.warn("Failed to preload component", error, {
          component: "usePreloadComponent",
        });
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [importFn]);
};

// Hook for conditional lazy loading based on device capabilities
export const useConditionalLazyLoad = (
  condition: boolean,
  importFn: () => Promise<{ default: ComponentType<any> }>,
  fallback: ComponentType<any>
) => {
  const [Component, setComponent] = React.useState<ComponentType<any> | null>(
    null
  );

  React.useEffect(() => {
    if (condition) {
      importFn()
        .then((module) => {
          setComponent(() => module.default);
        })
        .catch((error) => {
          logger.error("Failed to conditionally load component", error);
          setComponent(() => fallback);
        });
    } else {
      setComponent(() => fallback);
    }
  }, [condition, importFn, fallback]);

  return Component;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  featureUnavailableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  featureUnavailableTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  featureUnavailableText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default withLazyLoading;
