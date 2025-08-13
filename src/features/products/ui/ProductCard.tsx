import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Product } from "@/shared/types";
import { useTheme } from "@/shared/stores/appStore";

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onFavoritePress?: (product: Product) => void;
  testID?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onFavoritePress,
  testID,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress?.(product);
  };

  const handleFavoritePress = () => {
    onFavoritePress?.(product);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getDiscountPercent = () => {
    if (product.originalPrice && product.price < product.originalPrice) {
      return Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      );
    }
    return 0;
  };

  const discountPercent = getDiscountPercent();

  return (
    <TouchableOpacity
      style={[styles.container, theme === "dark" && styles.containerDark]}
      onPress={handlePress}
      testID={testID}
      activeOpacity={0.8}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: product.images[0] || "https://via.placeholder.com/200",
          }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          testID={`${testID}-favorite`}
        >
          <Icon
            name={product.isFavorite ? "favorite" : "favorite-border"}
            size={20}
            color={product.isFavorite ? "#FF6B6B" : "#666"}
          />
        </TouchableOpacity>
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Brand */}
        <Text
          style={[styles.brand, theme === "dark" && styles.brandDark]}
          numberOfLines={1}
        >
          {product.brand}
        </Text>

        {/* Name */}
        <Text
          style={[styles.name, theme === "dark" && styles.nameDark]}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={[styles.rating, theme === "dark" && styles.ratingDark]}>
            {product.rating.toFixed(1)}
          </Text>
          <Text
            style={[
              styles.reviewCount,
              theme === "dark" && styles.reviewCountDark,
            ]}
          >
            ({product.reviewCount})
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={[styles.price, theme === "dark" && styles.priceDark]}>
            {formatPrice(product.price)}
          </Text>
          {product.originalPrice && product.originalPrice > product.price && (
            <Text
              style={[
                styles.originalPrice,
                theme === "dark" && styles.originalPriceDark,
              ]}
            >
              {formatPrice(product.originalPrice)}
            </Text>
          )}
        </View>

        {/* Stock Status */}
        {product.stock < 10 && (
          <Text
            style={[
              styles.stockWarning,
              theme === "dark" && styles.stockWarningDark,
            ]}
          >
            {product.stock === 0
              ? "Out of stock"
              : `Only ${product.stock} left`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerDark: {
    backgroundColor: "#2D2D2D",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoContainer: {
    flex: 1,
  },
  brand: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandDark: {
    color: "#CCCCCC",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
    lineHeight: 22,
  },
  nameDark: {
    color: "#FFFFFF",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginLeft: 4,
  },
  ratingDark: {
    color: "#FFFFFF",
  },
  reviewCount: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  reviewCountDark: {
    color: "#CCCCCC",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  priceDark: {
    color: "#4A90E2",
  },
  originalPrice: {
    fontSize: 14,
    color: "#999999",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  originalPriceDark: {
    color: "#777777",
  },
  stockWarning: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  stockWarningDark: {
    color: "#FF8A8A",
  },
});

export default ProductCard;
