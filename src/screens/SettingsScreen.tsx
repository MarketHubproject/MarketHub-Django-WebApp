import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "../services";
import { logger, ErrorToast } from "../utils";

interface SettingsState {
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newProducts: boolean;
    emailNotifications: boolean;
  };
  preferences: {
    theme: "light" | "dark" | "system";
    language: "en" | "af" | "zu";
    currency: "ZAR";
  };
  privacy: {
    dataCollection: boolean;
    personalization: boolean;
    locationServices: boolean;
  };
}

const SettingsScreen = ({ navigation }: any): React.JSX.Element => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      orderUpdates: true,
      promotions: false,
      newProducts: true,
      emailNotifications: true,
    },
    preferences: {
      theme: "light",
      language: "en",
      currency: "ZAR",
    },
    privacy: {
      dataCollection: true,
      personalization: true,
      locationServices: false,
    },
  });

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    "password" | "deleteAccount" | null
  >(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const savedSettings = await AsyncStorage.getItem("appSettings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      logger.error("Error loading settings", error, {
        component: "SettingsScreen",
        action: "loadSettings",
      });
    }
  };

  const saveSettings = async (newSettings: SettingsState): Promise<void> => {
    try {
      await AsyncStorage.setItem("appSettings", JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      logger.error("Error saving settings", error, {
        component: "SettingsScreen",
        action: "saveSettings",
      });

      ErrorToast.show({
        title: "Error",
        message: "Failed to save settings. Please try again.",
      });
    }
  };

  const updateNotificationSetting = (
    key: keyof SettingsState["notifications"],
    value: boolean
  ): void => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updatePreferenceSetting = <
    K extends keyof SettingsState["preferences"]
  >(
    key: K,
    value: SettingsState["preferences"][K]
  ): void => {
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updatePrivacySetting = (
    key: keyof SettingsState["privacy"],
    value: boolean
  ): void => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const handleChangePassword = async (): Promise<void> => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters long");
      return;
    }

    try {
      setLoading(true);

      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert("Success", "Password changed successfully");
      setModalVisible(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      logger.error("Error changing password", error, {
        component: "SettingsScreen",
        action: "handleChangePassword",
      });

      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and you will lose all your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              // Simulate API call - replace with actual implementation
              await new Promise((resolve) => setTimeout(resolve, 2000));

              Alert.alert(
                "Account Deleted",
                "Your account has been successfully deleted.",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      await ApiService.logout();
                      // Navigation will be handled by auth state change
                    },
                  },
                ]
              );
            } catch (error: any) {
              logger.error("Error deleting account", error, {
                component: "SettingsScreen",
                action: "handleDeleteAccount",
              });

              Alert.alert("Error", error.message || "Failed to delete account");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = (): void => {
    Alert.alert(
      "Clear Cache",
      "This will clear all temporary files and cached data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          onPress: async () => {
            try {
              // Clear various cache stores
              await AsyncStorage.multiRemove([
                "cart",
                "favorites",
                "recentSearches",
              ]);

              Alert.alert("Success", "Cache cleared successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to clear cache");
            }
          },
        },
      ]
    );
  };

  const renderSectionHeader = (title: string): React.JSX.Element => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderToggleSetting = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string
  ): React.JSX.Element => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon
          name={icon}
          size={24}
          color="#007AFF"
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E1E1E1", true: "#007AFF" }}
        thumbColor={value ? "#FFFFFF" : "#F4F3F4"}
      />
    </View>
  );

  const renderActionSetting = (
    title: string,
    subtitle: string,
    onPress: () => void,
    icon: string,
    rightText?: string,
    dangerous = false
  ): React.JSX.Element => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Icon
          name={icon}
          size={24}
          color={dangerous ? "#FF6B6B" : "#007AFF"}
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text
            style={[styles.settingTitle, dangerous && { color: "#FF6B6B" }]}
          >
            {title}
          </Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightText && <Text style={styles.settingRightText}>{rightText}</Text>}
        <Icon name="chevron-right" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderPasswordModal = (): React.JSX.Element => (
    <Modal
      visible={modalVisible && modalType === "password"}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordForm.currentPassword}
                onChangeText={(text) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: text,
                  }))
                }
                secureTextEntry
                placeholder="Enter current password"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordForm.newPassword}
                onChangeText={(text) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: text }))
                }
                secureTextEntry
                placeholder="Enter new password"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordForm.confirmPassword}
                onChangeText={(text) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: text,
                  }))
                }
                secureTextEntry
                placeholder="Confirm new password"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View style={styles.section}>
          {renderSectionHeader("Notifications")}

          {renderActionSetting(
            "Notification Preferences",
            "Configure push notification categories and settings",
            () => navigation.navigate("NotificationPreferences"),
            "tune"
          )}

          {renderToggleSetting(
            "Order Updates",
            "Get notified about order status changes",
            settings.notifications.orderUpdates,
            (value) => updateNotificationSetting("orderUpdates", value),
            "notifications"
          )}

          {renderToggleSetting(
            "Promotions & Offers",
            "Receive special deals and discounts",
            settings.notifications.promotions,
            (value) => updateNotificationSetting("promotions", value),
            "local-offer"
          )}

          {renderToggleSetting(
            "New Products",
            "Be the first to know about new arrivals",
            settings.notifications.newProducts,
            (value) => updateNotificationSetting("newProducts", value),
            "new-releases"
          )}

          {renderToggleSetting(
            "Email Notifications",
            "Receive notifications via email",
            settings.notifications.emailNotifications,
            (value) => updateNotificationSetting("emailNotifications", value),
            "email"
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          {renderSectionHeader("Preferences")}

          {renderActionSetting(
            "Theme",
            "Choose your preferred app theme",
            () => {
              Alert.alert("Theme", "Choose your preferred theme", [
                {
                  text: "Light",
                  onPress: () => updatePreferenceSetting("theme", "light"),
                },
                {
                  text: "Dark",
                  onPress: () => updatePreferenceSetting("theme", "dark"),
                },
                {
                  text: "System",
                  onPress: () => updatePreferenceSetting("theme", "system"),
                },
                { text: "Cancel", style: "cancel" },
              ]);
            },
            "palette",
            settings.preferences.theme.charAt(0).toUpperCase() +
              settings.preferences.theme.slice(1)
          )}

          {renderActionSetting(
            "Language",
            "Change app language",
            () => {
              Alert.alert("Language", "Choose your preferred language", [
                {
                  text: "English",
                  onPress: () => updatePreferenceSetting("language", "en"),
                },
                {
                  text: "Afrikaans",
                  onPress: () => updatePreferenceSetting("language", "af"),
                },
                {
                  text: "Zulu",
                  onPress: () => updatePreferenceSetting("language", "zu"),
                },
                { text: "Cancel", style: "cancel" },
              ]);
            },
            "language",
            settings.preferences.language === "en"
              ? "English"
              : settings.preferences.language === "af"
              ? "Afrikaans"
              : "Zulu"
          )}

          {renderActionSetting(
            "Currency",
            "Display currency preference",
            () =>
              Alert.alert(
                "Info",
                "Currency is set to South African Rand (ZAR)"
              ),
            "attach-money",
            "ZAR (R)"
          )}
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          {renderSectionHeader("Privacy & Security")}

          {renderToggleSetting(
            "Data Collection",
            "Allow anonymous usage analytics",
            settings.privacy.dataCollection,
            (value) => updatePrivacySetting("dataCollection", value),
            "analytics"
          )}

          {renderToggleSetting(
            "Personalization",
            "Use data to personalize your experience",
            settings.privacy.personalization,
            (value) => updatePrivacySetting("personalization", value),
            "person"
          )}

          {renderToggleSetting(
            "Location Services",
            "Allow location-based features",
            settings.privacy.locationServices,
            (value) => updatePrivacySetting("locationServices", value),
            "location-on"
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          {renderSectionHeader("Account")}

          {renderActionSetting(
            "Change Password",
            "Update your account password",
            () => {
              setModalType("password");
              setModalVisible(true);
            },
            "lock"
          )}

          {renderActionSetting(
            "Export Data",
            "Download your account data",
            () =>
              Alert.alert(
                "Coming Soon",
                "Data export feature will be available soon"
              ),
            "download"
          )}

          {renderActionSetting(
            "Clear Cache",
            "Free up storage space",
            handleClearCache,
            "storage"
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          {renderSectionHeader("Danger Zone")}

          {renderActionSetting(
            "Delete Account",
            "Permanently delete your account and data",
            handleDeleteAccount,
            "delete-forever",
            undefined,
            true
          )}
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.appVersion}>MarketHub v1.0.0</Text>
          <Text style={styles.copyright}>
            © 2024 MarketHub. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {renderPasswordModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
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
    backgroundColor: "white",
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingRightText: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: "#999",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
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
  modalForm: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FFFFFF",
  },
  modalButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SettingsScreen;
