import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ApiService from "../services";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../contexts/I18nContext";
import { SmartAvatar } from "../components";
import ReferralStats from "../components/ReferralStats";
import { logger, ErrorToast } from "../utils";

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_joined: string;
  is_active: boolean;
}

interface EditProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
}

const ProfileScreen = ({ navigation }: any): React.JSX.Element => {
  const { t, setLanguage, language } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [updating, setUpdating] = useState<boolean>(false);
  const [showReferralStats, setShowReferralStats] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async (): Promise<void> => {
    try {
      setLoading(true);
      const profileData = await ApiService.getUserProfile();
      setProfile(profileData);
    } catch (error: any) {
      logger.error("Error loading profile", error, {
        component: "ProfileScreen",
        action: "loadProfile",
        metadata: {
          userId: profile?.id,
        },
      });

      ErrorToast.show({
        title: t("common.error"),
        message: t("profile.failedToLoadProfile"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (): void => {
    if (!profile) return;

    setEditForm({
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone || "",
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async (): Promise<void> => {
    try {
      setUpdating(true);

      const updateData = {
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        phone: editForm.phone.trim() || undefined,
      };

      const updatedProfile = await ApiService.updateUserProfile(updateData);
      setProfile(updatedProfile);
      setEditModalVisible(false);

      ErrorToast.show({
        title: t("common.success"),
        message: t("profile.profileUpdated"),
      });
    } catch (error: any) {
      logger.error("Error updating profile", error, {
        component: "ProfileScreen",
        action: "handleSaveProfile",
        metadata: {
          userId: profile?.id,
          updateData: editForm,
        },
      });

      ErrorToast.show({
        title: t("common.error"),
        message: error.message || t("profile.failedToUpdate"),
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleLanguageSwitch = (): void => {
    const currentLanguageName =
      language === "en" ? t("profile.english") : t("profile.chinese");
    const targetLanguage = language === "en" ? "zh" : "en";
    const targetLanguageName =
      targetLanguage === "en" ? t("profile.english") : t("profile.chinese");

    Alert.alert(t("profile.language"), `Switch to ${targetLanguageName}?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: async () => {
          try {
            await setLanguage(targetLanguage);
            Alert.alert(
              t("common.success"),
              t("profile.languageChanged", { language: targetLanguageName })
            );
          } catch (error: any) {
            logger.error("Error changing language", error, {
              component: "ProfileScreen",
              action: "handleLanguageSwitch",
              metadata: {
                targetLanguage,
                currentLanguage: language,
              },
            });

            ErrorToast.show({
              title: t("common.error"),
              message: "Failed to change language.",
            });
          }
        },
      },
    ]);
  };

  const handleLogout = (): void => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          try {
            await ApiService.logout();
            // Navigation will be handled automatically by the main App component
            // when it detects the authentication state change
          } catch (error: any) {
            logger.error("Logout error", error, {
              component: "ProfileScreen",
              action: "handleLogout",
              metadata: {
                userId: profile?.id,
              },
            });
            // Even if logout fails on the server, we should clear local auth
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    disabled = false
  ): React.JSX.Element => (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.disabledMenuItem]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color={disabled ? "#ccc" : "#007AFF"} />
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.menuItemSubtitle, disabled && styles.disabledText]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement || (
        <Icon
          name="chevron-right"
          size={20}
          color={disabled ? "#ccc" : "#666"}
        />
      )}
    </TouchableOpacity>
  );

  const renderEditProfileModal = (): React.JSX.Element => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.editForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t("profile.firstName")}</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.firstName}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, firstName: text }))
                }
                placeholder={t("profile.enterFirstName")}
                editable={!updating}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t("profile.lastName")}</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.lastName}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, lastName: text }))
                }
                placeholder={t("profile.enterLastName")}
                editable={!updating}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {t("profile.phoneOptional")}
              </Text>
              <TextInput
                style={styles.textInput}
                value={editForm.phone}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, phone: text }))
                }
                placeholder={t("profile.enterPhone")}
                keyboardType="phone-pad"
                editable={!updating}
              />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setEditModalVisible(false)}
              disabled={updating}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                updating && styles.disabledButton,
              ]}
              onPress={handleSaveProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t("profile.saveChanges")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t("profile.loadingProfile")}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#FF6B6B" />
        <Text style={styles.errorText}>{t("profile.failedToLoadProfile")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("profile.profile")}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <SmartAvatar
              name={`${profile.first_name} ${profile.last_name}`}
              size={80}
              backgroundColor="#F0F8FF"
              textColor="#007AFF"
              style={styles.avatar}
            />
          </View>

          <Text style={styles.profileName}>
            {profile.first_name} {profile.last_name}
          </Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>

          {profile.phone && (
            <Text style={styles.profilePhone}>{profile.phone}</Text>
          )}

          <Text style={styles.joinDate}>
            {t("profile.memberSince", {
              date: formatDate(profile.date_joined),
            })}
          </Text>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Icon name="edit" size={18} color="#007AFF" />
            <Text style={styles.editProfileText}>
              {t("profile.editProfile")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Referral Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referrals & Rewards</Text>

          {renderMenuItem(
            "card-giftcard",
            "Referral Program",
            "Earn rewards by referring friends",
            () => setShowReferralStats(true)
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.account")}</Text>

          {renderMenuItem(
            "receipt-long",
            t("profile.orderHistory"),
            t("profile.viewPastOrders"),
            () => navigation.navigate("OrderHistory")
          )}

          {renderMenuItem(
            "favorite",
            t("profile.myFavorites"),
            t("profile.manageSavedItems"),
            () => navigation.navigate("Favorites")
          )}

          {renderMenuItem(
            "shopping-cart",
            t("profile.shoppingCart"),
            t("profile.viewCartItems"),
            () => navigation.navigate("Cart")
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.settings")}</Text>

          {renderMenuItem(
            "settings",
            "App Settings",
            "Manage app preferences, notifications, and more",
            () => navigation.navigate("Settings")
          )}

          {renderMenuItem(
            "notifications",
            t("profile.notifications"),
            t("profile.manageNotifications"),
            () =>
              Alert.alert(
                t("common.comingSoon"),
                t("profile.notificationSettingsImplementation")
              ),
            undefined,
            true
          )}

          {renderMenuItem(
            "lock",
            t("profile.changePassword"),
            t("profile.updatePassword"),
            () =>
              Alert.alert(
                t("common.comingSoon"),
                t("profile.passwordChangeImplementation")
              ),
            undefined,
            true
          )}

          {renderMenuItem(
            "language",
            t("profile.language"),
            language === "en" ? t("profile.english") : t("profile.chinese"),
            handleLanguageSwitch,
            undefined,
            false
          )}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.support")}</Text>

          {renderMenuItem(
            "help",
            t("profile.helpSupport"),
            t("profile.getHelp"),
            () =>
              Alert.alert(
                t("profile.helpSupport"),
                t("profile.supportMessage")
              ),
            undefined,
            true
          )}

          {renderMenuItem(
            "info",
            t("profile.about"),
            t("profile.appVersionInfo"),
            () => Alert.alert(t("profile.about"), t("profile.aboutMessage")),
            undefined,
            true
          )}

          {renderMenuItem(
            "policy",
            t("profile.privacyPolicy"),
            t("profile.readPrivacyPolicy"),
            () =>
              Alert.alert(
                t("profile.privacyPolicy"),
                t("profile.privacyPolicyImplementation")
              ),
            undefined,
            true
          )}
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          {renderMenuItem(
            "logout",
            t("profile.logout"),
            t("profile.signOutAccount"),
            handleLogout,
            undefined,
            false
          )}
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>{t("profile.version")}</Text>
        </View>
      </ScrollView>

      {renderEditProfileModal()}

      {/* Referral Stats Modal */}
      <Modal
        visible={showReferralStats}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReferralStats(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.referralModalHeader}>
            <Text style={styles.referralModalTitle}>Referral Program</Text>
            <TouchableOpacity onPress={() => setShowReferralStats(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {profile && (
            <ReferralStats
              userId={profile.id}
              userName={`${profile.first_name} ${profile.last_name}`}
            />
          )}
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  header: {
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
  profileSection: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: "#999",
    marginBottom: 20,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  editProfileText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  disabledMenuItem: {
    opacity: 0.5,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuItemText: {
    marginLeft: 16,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  disabledText: {
    color: "#ccc",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: "#999",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
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
  editForm: {
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
  // Referral Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  referralModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  referralModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
});

export default ProfileScreen;
