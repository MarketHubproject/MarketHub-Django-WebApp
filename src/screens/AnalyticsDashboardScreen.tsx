import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AnalyticsService from '../utils/analyticsStub';
const FEATURE_FLAGS = { AR_ROLLOUT_PERCENTAGE: 'ar_rollout_percentage' } as any;
import { logger } from "../utils";

interface MetricData {
  name: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
  color: string;
}

interface FunnelData {
  step: string;
  users: number;
  conversionRate: number;
}

const AnalyticsDashboardScreen = ({ navigation }: any): React.JSX.Element => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, any>>({});
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Track dashboard view
      await AnalyticsService.trackScreenView(
        "AnalyticsDashboard",
        "AnalyticsDashboardScreen"
      );

      // Load feature flags
      const flags = await AnalyticsService.getAllFeatureFlags();
      setFeatureFlags(flags);

      // Mock metrics data - in a real app, this would come from your analytics backend
      const mockMetrics: MetricData[] = [
        {
          name: "Daily Active Users",
          value: "2,847",
          change: "+12.5%",
          trend: "up",
          icon: "people",
          color: "#4CAF50",
        },
        {
          name: "Conversion Rate",
          value: "3.2%",
          change: "+0.3%",
          trend: "up",
          icon: "trending-up",
          color: "#2196F3",
        },
        {
          name: "Revenue",
          value: "R24,589",
          change: "-2.1%",
          trend: "down",
          icon: "attach-money",
          color: "#FF9800",
        },
        {
          name: "Cart Abandonment",
          value: "68.4%",
          change: "+1.8%",
          trend: "down",
          icon: "shopping-cart",
          color: "#F44336",
        },
      ];

      // Mock funnel data
      const mockFunnelData: FunnelData[] = [
        { step: "Browse Products", users: 10000, conversionRate: 100 },
        { step: "View Product", users: 6500, conversionRate: 65 },
        { step: "Add to Cart", users: 1950, conversionRate: 30 },
        { step: "Begin Checkout", users: 585, conversionRate: 30 },
        { step: "Complete Purchase", users: 195, conversionRate: 33.3 },
      ];

      setMetrics(mockMetrics);
      setFunnelData(mockFunnelData);

      logger.info("Analytics dashboard data loaded", {
        component: "AnalyticsDashboardScreen",
        action: "loadDashboardData",
      });
    } catch (error: any) {
      logger.error("Error loading dashboard data", error, {
        component: "AnalyticsDashboardScreen",
        action: "loadDashboardData",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const handleFeatureFlagToggle = async (
    flagKey: string,
    newValue: boolean
  ): Promise<void> => {
    try {
      // In a real app, you'd call an API to update the flag
      // For now, we'll just update locally and refresh remote config
      setFeatureFlags((prev) => ({
        ...prev,
        [flagKey]: newValue,
      }));

      // Track feature flag change
      await AnalyticsService.trackEvent("feature_flag_changed", {
        flag_key: flagKey,
        new_value: newValue,
        changed_by: "admin_dashboard",
      });

      // Refresh remote config to simulate server update
      await AnalyticsService.refreshRemoteConfig();

      Alert.alert(
        "Feature Flag Updated",
        `${flagKey} has been ${
          newValue ? "enabled" : "disabled"
        }. Changes may take a few minutes to propagate.`
      );
    } catch (error: any) {
      logger.error("Error updating feature flag", error, {
        component: "AnalyticsDashboardScreen",
        flagKey,
        newValue,
      });

      Alert.alert("Error", "Failed to update feature flag. Please try again.");

      // Revert the change
      setFeatureFlags((prev) => ({
        ...prev,
        [flagKey]: !newValue,
      }));
    }
  };

  const renderHeader = (): React.JSX.Element => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Analytics Dashboard</Text>
      <TouchableOpacity onPress={handleRefresh}>
        <Icon name="refresh" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const renderMetrics = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name={metric.icon} size={24} color={metric.color} />
              <View
                style={[
                  styles.trendIndicator,
                  {
                    backgroundColor:
                      metric.trend === "up"
                        ? "#4CAF50"
                        : metric.trend === "down"
                        ? "#F44336"
                        : "#9E9E9E",
                  },
                ]}
              >
                <Icon
                  name={
                    metric.trend === "up"
                      ? "keyboard-arrow-up"
                      : metric.trend === "down"
                      ? "keyboard-arrow-down"
                      : "remove"
                  }
                  size={16}
                  color="white"
                />
              </View>
            </View>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricName}>{metric.name}</Text>
            <Text
              style={[
                styles.metricChange,
                {
                  color:
                    metric.trend === "up"
                      ? "#4CAF50"
                      : metric.trend === "down"
                      ? "#F44336"
                      : "#9E9E9E",
                },
              ]}
            >
              {metric.change}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderFunnel = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Conversion Funnel</Text>
      <Text style={styles.sectionSubtitle}>
        Browse → Add to Cart → Purchase
      </Text>

      {funnelData.map((step, index) => {
        const isLast = index === funnelData.length - 1;
        const previousStep = index > 0 ? funnelData[index - 1] : null;
        const dropOffRate = previousStep
          ? (
              ((previousStep.users - step.users) / previousStep.users) *
              100
            ).toFixed(1)
          : "0";

        return (
          <View key={index} style={styles.funnelStep}>
            <View style={styles.funnelStepHeader}>
              <Text style={styles.funnelStepName}>{step.step}</Text>
              <Text style={styles.funnelStepUsers}>
                {step.users.toLocaleString()} users
              </Text>
            </View>

            <View style={styles.funnelBar}>
              <View
                style={[
                  styles.funnelBarFill,
                  {
                    width: `${step.conversionRate}%`,
                    backgroundColor:
                      index === 0
                        ? "#4CAF50"
                        : index === 1
                        ? "#8BC34A"
                        : index === 2
                        ? "#FFC107"
                        : index === 3
                        ? "#FF9800"
                        : "#F44336",
                  },
                ]}
              />
            </View>

            <View style={styles.funnelStepFooter}>
              <Text style={styles.funnelStepRate}>
                {index === 0 ? "100%" : `${step.conversionRate.toFixed(1)}%`}{" "}
                conversion
              </Text>
              {index > 0 && (
                <Text style={styles.funnelStepDropOff}>
                  {dropOffRate}% drop-off
                </Text>
              )}
            </View>

            {!isLast && (
              <View style={styles.funnelArrow}>
                <Icon name="keyboard-arrow-down" size={20} color="#666" />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderFeatureFlags = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Feature Flags & A/B Tests</Text>
      <Text style={styles.sectionSubtitle}>
        Control feature rollouts and experiments
      </Text>

      {Object.entries(featureFlags).map(([key, value]) => {
        const isPercentage = key === FEATURE_FLAGS.AR_ROLLOUT_PERCENTAGE;
        const flagName = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <View key={key} style={styles.featureFlagCard}>
            <View style={styles.featureFlagInfo}>
              <Text style={styles.featureFlagName}>{flagName}</Text>
              <Text style={styles.featureFlagValue}>
                {isPercentage
                  ? `${value}% rollout`
                  : value
                  ? "Enabled"
                  : "Disabled"}
              </Text>
            </View>

            {isPercentage ? (
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => {
                  Alert.alert(
                    "Update Rollout Percentage",
                    `Current: ${value}%`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "0%",
                        onPress: () => handleFeatureFlagToggle(key, 0),
                      },
                      {
                        text: "10%",
                        onPress: () => handleFeatureFlagToggle(key, 10),
                      },
                      {
                        text: "25%",
                        onPress: () => handleFeatureFlagToggle(key, 25),
                      },
                      {
                        text: "50%",
                        onPress: () => handleFeatureFlagToggle(key, 50),
                      },
                      {
                        text: "100%",
                        onPress: () => handleFeatureFlagToggle(key, 100),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.percentageButtonText}>{value}%</Text>
              </TouchableOpacity>
            ) : (
              <Switch
                value={Boolean(value)}
                onValueChange={(newValue) =>
                  handleFeatureFlagToggle(key, newValue)
                }
                trackColor={{ false: "#E0E0E0", true: "#007AFF" }}
                thumbColor={value ? "#FFFFFF" : "#FFFFFF"}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderExperiments = (): React.JSX.Element => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Active A/B Tests</Text>

      <View style={styles.experimentCard}>
        <View style={styles.experimentHeader}>
          <Text style={styles.experimentName}>AR Feature Rollout</Text>
          <View
            style={[styles.experimentStatus, { backgroundColor: "#4CAF50" }]}
          >
            <Text style={styles.experimentStatusText}>ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.experimentDescription}>
          Testing AR product visualization feature with{" "}
          {featureFlags[FEATURE_FLAGS.AR_ROLLOUT_PERCENTAGE] || 10}% of users
        </Text>

        <View style={styles.experimentMetrics}>
          <View style={styles.experimentMetric}>
            <Text style={styles.experimentMetricValue}>+23%</Text>
            <Text style={styles.experimentMetricLabel}>Engagement</Text>
          </View>
          <View style={styles.experimentMetric}>
            <Text style={styles.experimentMetricValue}>+8%</Text>
            <Text style={styles.experimentMetricLabel}>Conversion</Text>
          </View>
          <View style={styles.experimentMetric}>
            <Text style={styles.experimentMetricValue}>-15%</Text>
            <Text style={styles.experimentMetricLabel}>Bounce Rate</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderMetrics()}
        {renderFunnel()}
        {renderFeatureFlags()}
        {renderExperiments()}
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
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trendIndicator: {
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  metricName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: "600",
  },
  funnelStep: {
    marginBottom: 16,
  },
  funnelStepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  funnelStepName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  funnelStepUsers: {
    fontSize: 14,
    color: "#666",
  },
  funnelBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 8,
  },
  funnelBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  funnelStepFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  funnelStepRate: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  funnelStepDropOff: {
    fontSize: 12,
    color: "#F44336",
  },
  funnelArrow: {
    alignItems: "center",
    marginVertical: 8,
  },
  featureFlagCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  featureFlagInfo: {
    flex: 1,
  },
  featureFlagName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  featureFlagValue: {
    fontSize: 14,
    color: "#666",
  },
  percentageButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  percentageButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  experimentCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
  },
  experimentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  experimentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  experimentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  experimentStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  experimentDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  experimentMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  experimentMetric: {
    alignItems: "center",
  },
  experimentMetricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  experimentMetricLabel: {
    fontSize: 12,
    color: "#666",
  },
});

export default AnalyticsDashboardScreen;
