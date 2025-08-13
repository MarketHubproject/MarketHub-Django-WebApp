import React, { useRef, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ViewabilityConfig,
  ViewToken,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Product, Recommendation, RecommendationSection } from "../types";
import { logger } from "../../utils";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.7;
const CARD_SPACING = 16;

interface ProductCarouselProps {
  section: RecommendationSection;
  onProductPress?: (product: Product) => void;
  onProductImpression?: (productId: number | string, context: string) => void;
  onProductClick?: (productId: number | string, context: string) => void;
  showTitle?: boolean;
  cardWidth?: number;
  testID?: string;
}

interface ProductCardProps {
  recommendation: Recommendation;
  onPress: () => void;
  onImpression: () => void;
  cardWidth: number;
  index: number;
}

const ProductCard: React.FC<ProductCardProps> = ({
  recommendation,
  onPress,
  onImpression,
  cardWidth,
  index,
}) => {
  const [imageError, setImageError] = useState(false);
  const { product } = recommendation;

  return (
    <TouchableOpacity
      style={[styles.productCard, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`product-card-${product.id}`}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: imageError ? undefined : product.images?.[0] || "",
          }}
          style={styles.productImage}
          onError={() => setImageError(true)}
        />
        {(imageError || !product.images?.[0]) && (
          <View style={styles.placeholderContainer}>
            <Icon name="image" size={40} color="#ccc" />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {product.discount && product.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
        {product.isFavorite && (
          <View style={styles.favoriteIcon}>
            <Icon name="favorite" size={20} color="#FF6B6B" />
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.ratingContainer}>
          <Icon name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${product.price.toFixed(2)}</Text>
          {product.originalPrice && product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>
              ${product.originalPrice.toFixed(2)}
            </Text>
          )}
        </View>

        {recommendation.reason && (
          <Text style={styles.recommendationReason} numberOfLines={1}>
            {recommendation.reason}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  section,
  onProductPress,
  onProductImpression,
  onProductClick,
  showTitle = true,
  cardWidth = CARD_WIDTH,
  testID,
}) => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);

  // Track impressions when items become visible
  const viewabilityConfig: ViewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000, // 1 second
  };

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setViewableItems(viewableItems);

      // Log impressions for newly visible items
      viewableItems.forEach((item) => {
        const productId = item.item?.product?.id;
        if (productId && onProductImpression) {
          onProductImpression(productId, section.type);
        }
      });
    }
  );

  const handleProductPress = (
    product: Product,
    recommendation: Recommendation
  ) => {
    // Log click event
    if (onProductClick) {
      onProductClick(product.id, section.type);
    }

    // Handle navigation or custom onPress
    if (onProductPress) {
      onProductPress(product);
    } else {
      // Default navigation to product detail
      navigation.navigate("ProductDetail", { productId: product.id } as any);
    }

    logger.info("Product clicked from recommendation carousel", {
      component: "ProductCarousel",
      productId: product.id,
      sectionType: section.type,
      recommendation: {
        score: recommendation.score,
        algorithm: recommendation.algorithm,
        reason: recommendation.reason,
      },
    });
  };

  const getSectionIcon = () => {
    switch (section.type) {
      case "personal":
        return "person";
      case "trending":
        return "trending-up";
      case "similar":
        return "compare";
      case "recently_viewed":
        return "history";
      case "category_based":
        return "category";
      default:
        return "recommend";
    }
  };

  if (!section.products || section.products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {showTitle && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Icon
              name={getSectionIcon()}
              size={20}
              color="#333"
              style={styles.sectionIcon}
            />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>

          {section.products.length > 2 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => {
                // Navigate to full recommendations screen or filtered products
                logger.info("View all clicked for recommendation section", {
                  component: "ProductCarousel",
                  sectionType: section.type,
                  productsCount: section.products.length,
                });
              }}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Icon name="chevron-right" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        decelerationRate="fast"
        snapToInterval={cardWidth + CARD_SPACING}
        snapToAlignment="start"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={handleViewableItemsChanged.current}
      >
        {section.products.map((recommendation, index) => (
          <ProductCard
            key={recommendation.id}
            recommendation={recommendation}
            onPress={() =>
              handleProductPress(recommendation.product, recommendation)
            }
            onImpression={() =>
              onProductImpression?.(recommendation.product.id, section.type)
            }
            cardWidth={cardWidth}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#007AFF",
    marginRight: 4,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: CARD_SPACING,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
    height: 200,
    overflow: "hidden",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  favoriteIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 4,
    borderRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  recommendationReason: {
    fontSize: 11,
    color: "#007AFF",
    fontStyle: "italic",
  },
  placeholderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});

export default ProductCarousel;
