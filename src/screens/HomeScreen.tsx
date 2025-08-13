import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";
import ApiService from "../services";
import i18n from "../services/i18n";
import { getProductImageUrl } from "../config/environment";
import {
  SmartImage,
  ProductCard,
  SkeletonLoader,
  Skeleton,
  Card,
  Button,
} from "../components";
import { logger, ErrorToast } from "../utils";
import theme from "../theme";
import useRecommendations from "../shared/hooks/useRecommendations";
import ProductCarousel from "../shared/ui/ProductCarousel";
import apiService from "../services/api";

const { width } = Dimensions.get("window");

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  category: string;
  description: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const HomeScreen = ({ navigation }: any): React.JSX.Element => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize recommendations hook
  const {
    sections: recommendationSections,
    isLoading: recommendationsLoading,
    logImpression,
    logClick,
    error: recommendationsError,
  } = useRecommendations(userId || undefined, {
    context: "home",
    enabled: true,
  });

  useEffect(() => {
    loadHomeData();
    initializeUserId();
  }, []);

  const initializeUserId = async () => {
    try {
      const currentUserId = await apiService.getCurrentUserId();
      setUserId(currentUserId);
    } catch (error) {
      logger.warn("Failed to get current user ID", error, {
        component: "HomeScreen",
        action: "initializeUserId",
      });
    }
  };

  const loadHomeData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Set default categories immediately to ensure they're never empty
      const defaultCategories: Category[] = [
        { id: 1, name: "Electronics", slug: "electronics" },
        { id: 2, name: "Food & Beverages", slug: "food-beverages" },
        { id: 3, name: "Sports & Fitness", slug: "sports-fitness" },
        { id: 4, name: "Fashion & Style", slug: "fashion-style" },
        { id: 5, name: "Home & Garden", slug: "home-garden" },
        { id: 6, name: "Books & Media", slug: "books-media" },
      ];

      // Set categories immediately (before API call)
      setCategories(defaultCategories);
      console.log("HomeScreen: Categories set to:", defaultCategories);

      // For demo purposes, let's use sample data first
      // TODO: Replace with real API calls once backend is ready

      // Sample products with images
      const sampleProducts: Product[] = [
        {
          id: 1,
          name: "Wireless Bluetooth Headphones",
          price: 79.99,
          image:
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
          category: "Electronics",
          description:
            "High-quality wireless headphones with noise cancellation",
        },
        {
          id: 2,
          name: "Premium Coffee Beans",
          price: 24.99,
          image:
            "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",
          category: "Food & Beverages",
          description: "Freshly roasted premium coffee beans",
        },
        {
          id: 3,
          name: "Smartphone Case",
          price: 15.99,
          image:
            "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop",
          category: "Electronics",
          description:
            "Protective smartphone case with wireless charging support",
        },
        {
          id: 4,
          name: "Running Shoes",
          price: 89.99,
          image:
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
          category: "Sports & Fitness",
          description: "Comfortable running shoes for daily exercise",
        },
        {
          id: 5,
          name: "Organic Green Tea",
          price: 18.99,
          image:
            "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",
          category: "Food & Beverages",
          description: "Premium organic green tea leaves",
        },
        {
          id: 6,
          name: "Designer Handbag",
          price: 149.99,
          image:
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
          category: "Fashion & Style",
          description: "Elegant designer handbag for everyday use",
        },
      ];

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFeaturedProducts(sampleProducts);

      // TODO: Uncomment when API is ready
      // const [productsResponse, categoriesResponse] = await Promise.all([
      //   ApiService.getFeaturedProducts(),
      //   ApiService.getCategories(),
      // ]);
      // setFeaturedProducts(productsResponse.results || productsResponse);
      // setCategories(categoriesResponse.results || categoriesResponse);
    } catch (error: any) {
      // Log error using centralized logger
      logger.error("Error loading home data", error, {
        component: "HomeScreen",
        action: "loadHomeData",
        metadata: {
          featuredProductsCount: featuredProducts.length,
          categoriesCount: categories.length,
        },
      });

      // Check if it's a network error and show Toast if not already shown
      // (The API service already shows Toast for network errors, but for non-network errors we show a generic one)
      if (error?.title && error?.message) {
        // This is already an ApiError from our service, no need to show Toast again
        // as it was already handled by the API service
      } else {
        // Show a generic error toast for unexpected errors
        ErrorToast.show({
          title: i18n.t("common.error"),
          message: i18n.t("errors.loadingError"),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEnhancedProduct = ({
    item,
    index,
  }: {
    item: Product;
    index: number;
  }): React.JSX.Element => {
    // Guard against undefined item data
    if (!item) {
      return <SkeletonLoader variant="card" count={1} />;
    }

    // Enhanced product data with sample ratings and features
    const enhancedProduct = {
      ...item,
      rating: 4.2 + (item.id % 10) / 10, // Sample rating between 4.2-5.0
      reviews: 15 + (item.id % 50), // Sample review count
      discount: index % 3 === 0 ? 15 : undefined, // 15% discount on every 3rd item
      isNew: index % 4 === 0, // Mark every 4th item as new
      isFavorite: false,
      inStock: true,
    };

    const variant = index === 0 ? "featured" : "default";

    return (
      <ProductCard
        product={enhancedProduct}
        variant={variant}
        onPress={() =>
          navigation.navigate("Products", {
            screen: "ProductDetail",
            params: { productId: item.id },
          })
        }
        onFavoritePress={(productId) => {
          // TODO: Handle favorite toggle
          console.log("Favorite toggled for product:", productId);
        }}
        onAddToCart={(productId) => {
          // TODO: Handle add to cart
          console.log("Added to cart product:", productId);
        }}
      />
    );
  };

  const renderCategoryCard = ({
    item,
  }: {
    item: Category;
  }): React.JSX.Element => {
    // Guard against undefined item data
    if (!item) {
      return <View style={styles.categoryCard} />;
    }

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() =>
          navigation.navigate("Products", {
            screen: "ProductsList",
            params: { category: item.slug },
          })
        }
      >
        <Icon name="category" size={32} color="#007AFF" />
        <Text style={styles.categoryName}>{item.name || ""}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{i18n.t("home.marketHub")}</Text>
          <Icon name="shopping-cart" size={28} color={theme.colors.primary} />
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <SkeletonLoader>
            <Skeleton
              width="80%"
              height={24}
              style={{ marginBottom: theme.spacing.sm }}
            />
            <Skeleton width="60%" height={16} />
          </SkeletonLoader>
        </View>

        {/* Categories Loading */}
        <View style={styles.section}>
          <SkeletonLoader>
            <Skeleton
              width="40%"
              height={20}
              style={{ marginBottom: theme.spacing.md }}
            />
          </SkeletonLoader>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View
                key={index}
                style={{ width: "33%", padding: theme.spacing.xs }}
              >
                <Skeleton
                  width="100%"
                  height={80}
                  borderRadius={theme.radius.md}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Products Loading */}
        <View style={styles.section}>
          <SkeletonLoader>
            <Skeleton
              width="50%"
              height={20}
              style={{ marginBottom: theme.spacing.md }}
            />
          </SkeletonLoader>
          <SkeletonLoader
            variant="card"
            count={2}
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t("home.marketHub")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Cart")}>
          <Icon name="shopping-cart" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>{i18n.t("home.welcomeTitle")}</Text>
        <Text style={styles.welcomeSubtitle}>
          {i18n.t("home.welcomeSubtitle")}
        </Text>

        {/* Quick Search Actions */}
        <View style={styles.welcomeActions}>
          <TouchableOpacity
            style={styles.welcomeActionButton}
            onPress={() =>
              navigation.navigate("Products", {
                screen: "ProductSearch",
              })
            }
          >
            <Icon name="search" size={20} color="#007AFF" />
            <Text style={styles.welcomeActionText}>Advanced Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.welcomeActionButton}
            onPress={() =>
              navigation.navigate("Products", {
                screen: "ProductCategories",
              })
            }
          >
            <Icon name="category" size={20} color="#007AFF" />
            <Text style={styles.welcomeActionText}>Browse Categories</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recommendations Section */}
      {recommendationSections && recommendationSections.length > 0 && (
        <View style={styles.recommendationsContainer}>
          {recommendationSections.map((section) => (
            <ProductCarousel
              key={section.id}
              section={section}
              onProductImpression={logImpression}
              onProductClick={logClick}
              onProductPress={(product) => {
                navigation.navigate("Products", {
                  screen: "ProductDetail",
                  params: { productId: product.id },
                });
              }}
              testID={`recommendation-section-${section.type}`}
            />
          ))}
        </View>
      )}

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {i18n.t("home.shopByCategory")}
          </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Products", {
                screen: "ProductCategories",
              })
            }
          >
            <Text style={styles.seeAllText}>{i18n.t("common.seeAll")}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={categories.slice(0, 6)} // Show first 6 categories
          renderItem={renderCategoryCard}
          keyExtractor={(item, index) => item?.id?.toString() ?? String(index)}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.categoriesGrid}
          ListEmptyComponent={
            <View style={styles.emptyCategoriesContainer}>
              <Icon name="category" size={48} color="#ccc" />
              <Text style={styles.emptyCategoriesText}>
                No categories available
              </Text>
              <Text style={styles.emptyCategoriesSubtext}>
                Categories will appear here once loaded
              </Text>
            </View>
          }
        />
      </View>

      {/* Featured Products Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {i18n.t("home.featuredProducts")}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Products")}>
            <Text style={styles.seeAllText}>{i18n.t("common.seeAll")}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={featuredProducts}
          renderItem={renderEnhancedProduct}
          keyExtractor={(item, index) => item?.id?.toString() ?? String(index)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {i18n.t("products.noProductsFound")}
              </Text>
            </View>
          }
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t("home.quickActions")}</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Favorites")}
          >
            <Icon name="favorite" size={24} color="#FF6B6B" />
            <Text style={styles.quickActionText}>
              {i18n.t("navigation.favorites")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Icon name="person" size={24} color="#4ECDC4" />
            <Text style={styles.quickActionText}>
              {i18n.t("navigation.profile")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() =>
              navigation.navigate("Products", {
                screen: "ProductSearch",
              })
            }
          >
            <Icon name="search" size={24} color="#45B7D1" />
            <Text style={styles.quickActionText}>
              {i18n.t("common.search")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  seeAllText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  categoriesGrid: {
    alignItems: "center",
  },
  categoryCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    marginHorizontal: 5,
    marginVertical: 8,
    paddingVertical: 20,
    borderRadius: 12,
    minHeight: 80,
  },
  categoryName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  productsContainer: {
    paddingLeft: 0,
  },
  productCard: {
    width: width * 0.4,
    marginRight: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  quickActionButton: {
    alignItems: "center",
    padding: 15,
  },
  quickActionText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  // Empty Categories Styles
  emptyCategoriesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: 120,
  },
  emptyCategoriesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  emptyCategoriesSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  // Welcome Actions Styles
  welcomeActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  welcomeActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  welcomeActionText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  // Recommendations Styles
  recommendationsContainer: {
    backgroundColor: "#F8F9FA",
    marginBottom: 10,
  },
});

export default HomeScreen;
