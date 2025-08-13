/**
 * Floating Chat Component
 * Main component that integrates floating chat button with support functionality
 */

import React, { useState, useCallback } from "react";
import { Modal, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import FloatingChatButton from "./FloatingChatButton";
import ChatSupportScreen from "../../screens/ChatSupportScreen";
import { useChat, useChatUnreadCount } from "../../contexts/ChatContext";
import { useI18n } from "../../contexts/I18nContext";

interface FloatingChatProps {
  isVisible?: boolean;
  position?: "bottom-right" | "bottom-left";
  showInModal?: boolean; // Whether to show support screen in modal or navigate
}

export const FloatingChat: React.FC<FloatingChatProps> = ({
  isVisible = true,
  position = "bottom-right",
  showInModal = true,
}) => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { createSupportChannel, markChannelAsRead } = useChat();
  const unreadCount = useChatUnreadCount();

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Handle chat button press
  const handleChatPress = useCallback(async () => {
    try {
      // Mark messages as read when opening chat
      if (unreadCount > 0) {
        await markChannelAsRead();
      }

      if (showInModal) {
        // Show support screen in modal
        setIsModalVisible(true);
      } else {
        // Navigate to support screen
        navigation.navigate("ChatSupport" as never);
      }
    } catch (error) {
      console.error("Failed to open chat:", error);
    }
  }, [unreadCount, markChannelAsRead, showInModal, navigation]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return (
    <>
      {/* Floating Chat Button */}
      <FloatingChatButton
        onPress={handleChatPress}
        unreadCount={unreadCount}
        isVisible={isVisible}
        position={position}
      />

      {/* Support Screen Modal */}
      {showInModal && (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleModalClose}
        >
          <ChatSupportScreen />
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Add any additional styles here if needed
});

export default FloatingChat;
