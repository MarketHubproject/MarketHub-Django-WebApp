import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { logger, ErrorToast } from "../utils";
// import AnalyticsService from "../services/analytics";
const AnalyticsService = { trackProductBrowse: () => {}, trackScreenView: () => {}, trackProductView: () => {} } as any;

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  image_url?: string;
  product_count: number;
  subcategories?: Category[];
  featured: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id: number;
  brand: string;
  rating: number;
  review_count: number;
  in_stock: boolean;
  discount_percentage?: number;
}

const ProductCategoriesScreen = ({ navigation }: any): React.JSX.Element => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Track product browsing (funnel step 1)
    const trackBrowsing = async () => {
      await AnalyticsService.trackProductBrowse({
        category: "all_categories",
        results_count: categories.length,
      });

      // Track screen view
      await AnalyticsService.trackScreenView(
        "ProductCategories",
        "ProductCategoriesScreen"
      );
    };

    trackBrowsing();
  }, [categories.length]);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock categories data
      const mockCategories: Category[] = [
        {
          id: 1,
          name: "Electronics",
          description: "Latest gadgets and electronic devices",
          icon: "devices",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 1245,
          featured: true,
          subcategories: [
            {
              id: 11,
              name: "Smartphones",
              description: "",
              icon: "smartphone",
              product_count: 234,
              featured: false,
            },
            {
              id: 12,
              name: "Laptops",
              description: "",
              icon: "laptop",
              product_count: 156,
              featured: false,
            },
            {
              id: 13,
              name: "Audio",
              description: "",
              icon: "headphones",
              product_count: 189,
              featured: false,
            },
            {
              id: 14,
              name: "Gaming",
              description: "",
              icon: "sports-esports",
              product_count: 98,
              featured: false,
            },
          ],
        },
        {
          id: 2,
          name: "Fashion & Clothing",
          description: "Trendy clothes and fashion accessories",
          icon: "checkroom",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 2189,
          featured: true,
          subcategories: [
            {
              id: 21,
              name: "Men's Clothing",
              description: "",
              icon: "man",
              product_count: 567,
              featured: false,
            },
            {
              id: 22,
              name: "Women's Clothing",
              description: "",
              icon: "woman",
              product_count: 789,
              featured: false,
            },
            {
              id: 23,
              name: "Shoes",
              description: "",
              icon: "business-center",
              product_count: 345,
              featured: false,
            },
            {
              id: 24,
              name: "Accessories",
              description: "",
              icon: "style",
              product_count: 234,
              featured: false,
            },
          ],
        },
        {
          id: 3,
          name: "Home & Garden",
          description: "Everything for your home and garden",
          icon: "home",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 1567,
          featured: true,
          subcategories: [
            {
              id: 31,
              name: "Furniture",
              description: "",
              icon: "chair",
              product_count: 456,
              featured: false,
            },
            {
              id: 32,
              name: "Decor",
              description: "",
              icon: "palette",
              product_count: 234,
              featured: false,
            },
            {
              id: 33,
              name: "Kitchen",
              description: "",
              icon: "kitchen",
              product_count: 389,
              featured: false,
            },
            {
              id: 34,
              name: "Garden",
              description: "",
              icon: "yard",
              product_count: 123,
              featured: false,
            },
          ],
        },
        {
          id: 4,
          name: "Sports & Fitness",
          description: "Sports equipment and fitness gear",
          icon: "sports-soccer",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 798,
          featured: false,
          subcategories: [
            {
              id: 41,
              name: "Fitness Equipment",
              description: "",
              icon: "fitness-center",
              product_count: 234,
              featured: false,
            },
            {
              id: 42,
              name: "Team Sports",
              description: "",
              icon: "sports-basketball",
              product_count: 156,
              featured: false,
            },
            {
              id: 43,
              name: "Outdoor Activities",
              description: "",
              icon: "terrain",
              product_count: 189,
              featured: false,
            },
          ],
        },
        {
          id: 5,
          name: "Books & Media",
          description: "Books, movies, music and more",
          icon: "menu-book",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 3412,
          featured: false,
          subcategories: [
            {
              id: 51,
              name: "Books",
              description: "",
              icon: "book",
              product_count: 2345,
              featured: false,
            },
            {
              id: 52,
              name: "Movies",
              description: "",
              icon: "movie",
              product_count: 567,
              featured: false,
            },
            {
              id: 53,
              name: "Music",
              description: "",
              icon: "music-note",
              product_count: 234,
              featured: false,
            },
          ],
        },
        {
          id: 6,
          name: "Health & Beauty",
          description: "Health, beauty and personal care",
          icon: "spa",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 1134,
          featured: false,
        },
        {
          id: 7,
          name: "Automotive",
          description: "Car parts, accessories and tools",
          icon: "directions-car",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 567,
          featured: false,
        },
        {
          id: 8,
          name: "Toys & Games",
          description: "Fun toys and games for all ages",
          icon: "toys",
          image_url: "https://via.placeholder.com/300x200",
          product_count: 891,
          featured: false,
        },
      ];

      // Mock featured products
      const mockFeaturedProducts: Product[] = [
        {
          id: 1,
          name: "Premium Wireless Headphones",
          description: "High-quality noise-cancelling headphones",
          price: 1299.99,
          currency: "ZAR",
          image_url: "https://via.placeholder.com/200",
          category_id: 1,
          brand: "TechAudio",
          rating: 4.8,
          review_count: 234,
          in_stock: true,
          discount_percentage: 15,
        },
        {
          id: 2,
          name: "Smart Fitness Watch",
          description: "Advanced fitness tracking",
          price: 2499.99,
          currency: "ZAR",
          category_id: 4,
          brand: "FitTech",
          rating: 4.6,
          review_count: 189,
          in_stock: true,
        },
        {
          id: 3,
          name: "Designer T-Shirt",
          description: "Premium cotton t-shirt",
          price: 599.99,
          currency: "ZAR",
          category_id: 2,
          brand: "StyleCo",
          rating: 4.4,
          review_count: 156,
          in_stock: true,
          discount_percentage: 25,
        },
      ];

      setCategories(mockCategories);
      setFeaturedProducts(mockFeaturedProducts);
    } catch (error: any) {
      logger.error("Error loading categories data", error, {
        component: "ProductCategoriesScreen",
        action: "loadData",
      });

      ErrorToast.show({
        title: "Error",
        message: "Failed to load categories. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: Category): void => {
    navigation.navigate("ProductSearch", {
      initialQuery: category.name,
      categoryFilter: category.id,
    });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const renderFeaturedCategory = (category: Category): React.JSX.Element => (
    <TouchableOpacity
      key={category.id}
      style={styles.featuredCard}
      onPress={() => handleCategoryPress(category)}
    >
      <View style={styles.featuredImageContainer}>
        {category.image_url ? (
          <Image
            source={{ uri: category.image_url }}
            style={styles.featuredImage}
          />
        ) : (
          <View style={styles.featuredPlaceholder}>
            <Icon name={category.icon} size={40} color="#007AFF" />
          </View>
        )}
        <View style={styles.featuredOverlay}>
          <Text style={styles.featuredTitle}>{category.name}</Text>
          <Text style={styles.featuredDescription}>{category.description}</Text>
          <Text style={styles.featuredCount}>
            {category.product_count} products
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryGrid = (): React.JSX.Element => {
    const regularCategories = categories.filter((cat) => !cat.featured);

    return (
      <View style={styles.categoryGrid}>
        {regularCategories.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              index % 2 === 0 ? styles.leftCard : styles.rightCard,
            ]}
            onPress={() => handleCategoryPress(category)}
          >
            <View style={styles.categoryIconContainer}>
              <Icon name={category.icon} size={32} color="#007AFF" />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryCount}>
              {category.product_count} items
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSubcategories = (category: Category): React.JSX.Element => (
    <View key={`sub-${category.id}`} style={styles.subcategorySection}>
      <View style={styles.subcategoryHeader}>
        <Icon name={category.icon} size={20} color="#007AFF" />
        <Text style={styles.subcategoryTitle}>{category.name}</Text>
        <TouchableOpacity onPress={() => handleCategoryPress(category)}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {category.subcategories?.map((subcategory) => (
          <TouchableOpacity
            key={subcategory.id}
            style={styles.subcategoryCard}
            onPress={() => handleCategoryPress(subcategory)}
          >
            <View style={styles.subcategoryIcon}>
              <Icon name={subcategory.icon} size={24} color="#007AFF" />
            </View>
            <Text style={styles.subcategoryName}>{subcategory.name}</Text>
            <Text style={styles.subcategoryCount}>
              {subcategory.product_count}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const handleProductPress = async (product: Product): Promise<void> => {
    // Track product view (funnel engagement)
    await AnalyticsService.trackProductView({
      item_id: product.id.toString(),
      item_name: product.name,
      item_category: product.category_id.toString(),
      item_brand: product.brand,
      price: product.price,
      currency: product.currency,
    });

    navigation.navigate("ProductDetail", { productId: product.id, product });
  };

  const renderFeaturedProduct = ({
    item: product,
  }: {
    item: Product;
  }): React.JSX.Element => (
    <TouchableOpacity
      style={styles.featuredProductCard}
      onPress={() => handleProductPress(product)}
    >
      <View style={styles.productImageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productPlaceholder}>
            <Icon name="image" size={30} color="#E0E0E0" />
          </View>
        )}
        {product.discount_percentage && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {product.discount_percentage}% OFF
            </Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productBrand}>{product.brand}</Text>

        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name={star <= product.rating ? "star" : "star-border"}
                size={12}
                color="#FFD700"
              />
            ))}
          </View>
          <Text style={styles.ratingText}>{product.rating}</Text>
        </View>

        <View style={styles.priceContainer}>
          {product.discount_percentage ? (
            <View style={styles.priceWithDiscount}>
              <Text style={styles.originalPrice}>
                {formatCurrency(
                  product.price / (1 - product.discount_percentage / 100),
                  product.currency
                )}
              </Text>
              <Text style={styles.discountPrice}>
                {formatCurrency(product.price, product.currency)}
              </Text>
            </View>
          ) : (
            <Text style={styles.price}>
              {formatCurrency(product.price, product.currency)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity onPress={() => navigation.navigate("ProductSearch")}>
          <Icon name="search" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories
              .filter((cat) => cat.featured)
              .map(renderFeaturedCategory)}
          </ScrollView>
        </View>

        {/* All Categories Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse All Categories</Text>
          {renderCategoryGrid()}
        </View>

        {/* Subcategories for featured categories */}
        {categories
          .filter(
            (cat) =>
              cat.featured && cat.subcategories && cat.subcategories.length > 0
          )
          .map(renderSubcategories)}

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ProductSearch", {
                  initialQuery: "featured",
                })
              }
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={featuredProducts}
            renderItem={renderFeaturedProduct}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredProductsList}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() =>
                navigation.navigate("ProductSearch", { initialQuery: "sale" })
              }
            >
              <Icon name="local-offer" size={24} color="#FF4444" />
              <Text style={styles.quickActionText}>On Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() =>
                navigation.navigate("ProductSearch", { initialQuery: "new" })
              }
            >
              <Icon name="fiber-new" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>New Arrivals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() =>
                navigation.navigate("ProductSearch", {
                  initialQuery: "popular",
                })
              }
            >
              <Icon name="trending-up" size={24} color="#FF9800" />
              <Text style={styles.quickActionText}>Popular</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() =>
                navigation.navigate("ProductSearch", { initialQuery: "deals" })
              }
            >
              <Icon name="flash-on" size={24} color="#9C27B0" />
              <Text style={styles.quickActionText}>Flash Deals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 15,
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
    marginBottom: 12,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  // Featured Categories
  featuredCard: {
    width: 280,
    height: 160,
    marginRight: 16,
    marginLeft: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredImageContainer: {
    flex: 1,
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  featuredPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 16,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  featuredCount: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
  },
  // Category Grid
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 1,
    minWidth: 150,
    maxWidth: "48%",
  },
  leftCard: {
    marginRight: 6,
  },
  rightCard: {
    marginLeft: 6,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  // Subcategories
  subcategorySection: {
    backgroundColor: "white",
    paddingVertical: 20,
    marginBottom: 12,
  },
  subcategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  subcategoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginLeft: 8,
  },
  subcategoryCard: {
    alignItems: "center",
    marginRight: 20,
    marginLeft: 20,
    width: 80,
  },
  subcategoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  subcategoryName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  subcategoryCount: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  // Featured Products
  featuredProductsList: {
    paddingHorizontal: 20,
  },
  featuredProductCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginRight: 16,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    position: "relative",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  productPlaceholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF4444",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 11,
    color: "#666",
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stars: {
    flexDirection: "row",
    marginRight: 4,
  },
  ratingText: {
    fontSize: 11,
    color: "#666",
  },
  priceContainer: {
    alignItems: "flex-start",
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  priceWithDiscount: {
    alignItems: "flex-start",
  },
  originalPrice: {
    fontSize: 11,
    color: "#999",
    textDecorationLine: "line-through",
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF4444",
  },
  // Quick Actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
});

export default ProductCategoriesScreen;
