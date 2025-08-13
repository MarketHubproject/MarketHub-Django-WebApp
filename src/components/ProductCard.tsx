import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  category: string;
  description: string;
  rating?: number;
  reviews?: number;
  discount?: number;
  inStock?: boolean;
  isNew?: boolean;
  isFavorite?: boolean;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onFavoritePress?: (productId: number) => void;
  onAddToCart?: (productId: number) => void;
  variant?: "default" | "compact" | "featured";
  width?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  const handlePress = () => {
    onPress?.();
  };

  const handleAddToCart = () => {
    onAddToCart?.(product.id);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="image" size={40} color="#ccc" />
          </View>
        )}
        {/* Discount Badge */}
        {product.discount && product.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.category}>{product.category}</Text>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>R{product.price.toFixed(2)}</Text>
            {product.discount && product.discount > 0 && (
              <Text style={styles.originalPrice}>
                R{(product.price / (1 - product.discount / 100)).toFixed(2)}
              </Text>
            )}
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
            <Icon name="add-shopping-cart" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    margin: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    height: 160,
    backgroundColor: "#f5f5f5",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  info: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  category: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "bold",
  },
  originalPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});

export default ProductCard;
