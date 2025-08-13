/**
 * Chat Support Screen
 * Main screen for chat support with FAQ integration and pre-chat bot
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
  AccessibilityInfo,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useI18n } from "../contexts/I18nContext";
import { theme } from "../theme";
import { faqService, FAQArticle } from "../services/faqService";
import { streamChatService } from "../services/streamChatService";

interface SupportOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
  color: string;
}

export const ChatSupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useI18n();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FAQArticle[]>([]);
  const [suggestedArticles, setSuggestedArticles] = useState<FAQArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<FAQArticle | null>(
    null
  );

  // Initialize FAQ service and load suggested articles
  useEffect(() => {
    const loadSuggestions = () => {
      const popular = faqService.getPopularArticles(6);
      setSuggestedArticles(popular);
    };

    loadSuggestions();
  }, []);

  // Search functionality with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const results = faqService.searchArticles(searchQuery, 8);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle article selection
  const handleArticlePress = useCallback(
    (article: FAQArticle) => {
      faqService.incrementViews(article.id);
      setSelectedArticle(article);

      // Announce for accessibility
      if (Platform.OS === "ios") {
        AccessibilityInfo.announceForAccessibility(
          `${t("faq.articles." + article.id + ".title")}`
        );
      }
    },
    [t]
  );

  // Handle article feedback
  const handleArticleFeedback = useCallback(
    (articleId: string, isHelpful: boolean) => {
      if (isHelpful) {
        faqService.markAsHelpful(articleId);
      } else {
        faqService.markAsNotHelpful(articleId);
      }

      Alert.alert(
        t("common.success"),
        t("chat.wasThisHelpful") +
          " " +
          (isHelpful ? t("chat.helpful") : t("chat.notHelpful")),
        [{ text: t("common.close"), style: "default" }]
      );
    },
    [t]
  );

  // Start live chat
  const handleStartLiveChat = useCallback(async () => {
    try {
      // In a real app, you would:
      // 1. Authenticate the user with your backend
      // 2. Get a Stream Chat token from your backend
      // 3. Connect the user to Stream Chat
      // 4. Create or join a support channel

      Alert.alert(t("chat.liveChat"), t("chat.connectingAgent"), [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.continue"),
          onPress: () => {
            // Navigate to Stream Chat UI or open chat modal
            console.log("Starting live chat...");
            // navigation.navigate('LiveChat');
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to start live chat:", error);
      Alert.alert(t("common.error"), t("chat.connectionError"));
    }
  }, [t]);

  // Contact support via email
  const handleEmailSupport = useCallback(() => {
    const emailUrl = `mailto:support@markethub.com?subject=${encodeURIComponent(
      "MarketHub Mobile Support"
    )}&body=${encodeURIComponent("Please describe your issue here...")}`;

    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(emailUrl);
        } else {
          Alert.alert(t("common.error"), "Email not supported on this device");
        }
      })
      .catch((error) => {
        console.error("Failed to open email:", error);
        Alert.alert(t("common.error"), "Failed to open email client");
      });
  }, [t]);

  // Support options
  const supportOptions: SupportOption[] = [
    {
      id: "live-chat",
      title: t("chat.liveChat"),
      subtitle: t("chat.chatWithUs"),
      icon: "chat",
      action: handleStartLiveChat,
      color: theme.colors.primary,
    },
    {
      id: "email",
      title: "Email Support",
      subtitle: "support@markethub.com",
      icon: "email",
      action: handleEmailSupport,
      color: theme.colors.secondary,
    },
    {
      id: "faq",
      title: t("chat.frequentlyAsked"),
      subtitle: t("chat.searchFAQ"),
      icon: "help",
      action: () => setSearchQuery(""),
      color: theme.colors.accent,
    },
  ];

  // Render FAQ article
  const renderArticle = (article: FAQArticle) => (
    <TouchableOpacity
      key={article.id}
      style={styles.articleCard}
      onPress={() => handleArticlePress(article)}
      accessible={true}
      accessibilityLabel={t("faq.articles." + article.id + ".title")}
      accessibilityRole="button"
    >
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {t("faq.articles." + article.id + ".title")}
        </Text>
        <Text style={styles.articlePreview} numberOfLines={3}>
          {t("faq.articles." + article.id + ".content")}
        </Text>
        <View style={styles.articleMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {t("faq.categories." + article.category)}
            </Text>
          </View>
          <View style={styles.articleStats}>
            <Icon name="visibility" size={14} color={theme.colors.textMuted} />
            <Text style={styles.statText}>{article.views}</Text>
            <Icon name="thumb-up" size={14} color={theme.colors.textMuted} />
            <Text style={styles.statText}>{article.helpful}</Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  // Render article detail modal
  const renderArticleDetail = () => {
    if (!selectedArticle) return null;

    return (
      <View style={styles.articleDetailOverlay}>
        <View style={styles.articleDetailModal}>
          <View style={styles.articleDetailHeader}>
            <Text style={styles.articleDetailTitle}>
              {t("faq.articles." + selectedArticle.id + ".title")}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedArticle(null)}
              accessible={true}
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
            >
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.articleDetailContent}>
            <Text style={styles.articleDetailText}>
              {t("faq.articles." + selectedArticle.id + ".content")}
            </Text>
          </ScrollView>

          <View style={styles.articleFeedback}>
            <Text style={styles.feedbackTitle}>{t("chat.wasThisHelpful")}</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.helpfulButton]}
                onPress={() => handleArticleFeedback(selectedArticle.id, true)}
                accessible={true}
                accessibilityLabel={t("chat.helpful")}
                accessibilityRole="button"
              >
                <Icon name="thumb-up" size={20} color={theme.colors.success} />
                <Text style={styles.helpfulText}>{t("chat.helpful")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feedbackButton, styles.notHelpfulButton]}
                onPress={() => handleArticleFeedback(selectedArticle.id, false)}
                accessible={true}
                accessibilityLabel={t("chat.notHelpful")}
                accessibilityRole="button"
              >
                <Icon name="thumb-down" size={20} color={theme.colors.error} />
                <Text style={styles.notHelpfulText}>
                  {t("chat.notHelpful")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stillNeedHelp}>
              <Text style={styles.stillNeedHelpText}>
                {t("chat.stillNeedHelp")}
              </Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => {
                  setSelectedArticle(null);
                  handleStartLiveChat();
                }}
                accessible={true}
                accessibilityLabel={t("chat.startChat")}
                accessibilityRole="button"
              >
                <Text style={styles.startChatText}>{t("chat.startChat")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessible={true}
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("chat.support")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t("chat.howCanWeHelp")}</Text>
          <Text style={styles.welcomeSubtitle}>{t("chat.botResponse")}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("chat.searchFAQ")}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.textMuted}
              accessible={true}
              accessibilityLabel={t("chat.searchFAQ")}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessible={true}
                accessibilityLabel={t("common.close")}
              >
                <Icon name="clear" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Support Options */}
        {!searchQuery && (
          <View style={styles.supportOptions}>
            <Text style={styles.sectionTitle}>{t("chat.howCanWeHelp")}</Text>
            {supportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.supportOption}
                onPress={option.action}
                accessible={true}
                accessibilityLabel={option.title}
                accessibilityHint={option.subtitle}
                accessibilityRole="button"
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: option.color }]}
                >
                  <Icon
                    name={option.icon}
                    size={24}
                    color={theme.colors.background}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={24}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={styles.sectionTitle}>
              {t("common.search")} "{searchQuery}"
            </Text>
            {searchResults.map(renderArticle)}
          </View>
        )}

        {/* No Search Results */}
        {searchQuery && searchResults.length === 0 && !isSearching && (
          <View style={styles.noResults}>
            <Icon name="search-off" size={48} color={theme.colors.textMuted} />
            <Text style={styles.noResultsTitle}>No results found</Text>
            <Text style={styles.noResultsSubtitle}>
              Try different keywords or contact support directly
            </Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleStartLiveChat}
            >
              <Text style={styles.contactButtonText}>
                {t("chat.startChat")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Suggested Articles */}
        {!searchQuery && suggestedArticles.length > 0 && (
          <View style={styles.suggestedSection}>
            <Text style={styles.sectionTitle}>
              {t("chat.suggestedArticles")}
            </Text>
            {suggestedArticles.map(renderArticle)}

            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{t("chat.viewAllFAQ")}</Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Article Detail Modal */}
      {renderArticleDetail()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  welcomeTitle: {
    fontSize: theme.typography.fontSizes["2xl"],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.textSecondary,
    lineHeight:
      theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
  },
  searchSection: {
    marginBottom: theme.spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text,
    paddingVertical: theme.spacing.xs,
  },
  supportOptions: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  supportOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  searchResults: {
    marginBottom: theme.spacing.lg,
  },
  suggestedSection: {
    marginBottom: theme.spacing.lg,
  },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  articlePreview: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.textSecondary,
    lineHeight:
      theme.typography.lineHeights.normal * theme.typography.fontSizes.sm,
    marginBottom: theme.spacing.sm,
  },
  articleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    backgroundColor: theme.colors.primary + "20",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  categoryText: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.primary,
  },
  articleStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.textMuted,
    marginLeft: 2,
    marginRight: theme.spacing.sm,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: theme.spacing["3xl"],
  },
  noResultsTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  noResultsSubtitle: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  contactButtonText: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.background,
  },
  // Article Detail Modal Styles
  articleDetailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  articleDetailModal: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    margin: theme.spacing.md,
    maxHeight: "80%",
    width: "90%",
    ...theme.shadows.xl,
  },
  articleDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  articleDetailTitle: {
    flex: 1,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text,
    marginRight: theme.spacing.md,
  },
  articleDetailContent: {
    maxHeight: 300,
    padding: theme.spacing.md,
  },
  articleDetailText: {
    fontSize: theme.typography.fontSizes.base,
    lineHeight:
      theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
    color: theme.colors.text,
  },
  articleFeedback: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  feedbackTitle: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  feedbackButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.lg,
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
  },
  helpfulButton: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + "10",
  },
  notHelpfulButton: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + "10",
  },
  helpfulText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.success,
    marginLeft: theme.spacing.xs,
  },
  notHelpfulText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
  stillNeedHelp: {
    alignItems: "center",
  },
  stillNeedHelpText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  startChatButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  startChatText: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.background,
  },
});

export default ChatSupportScreen;
