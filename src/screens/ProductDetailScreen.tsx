import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/api';

const { width, height } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  category: string;
  description: string;
  stock: number;
  rating?: number;
  seller?: {
    id: number;
    name: string;
    email: string;
  };
  created_at?: string;
}

const ProductDetailScreen = ({ route, navigation }: any): React.JSX.Element => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [addingToFavorites, setAddingToFavorites] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    loadProductDetails();
    // You might want to check if this product is in favorites
    // checkIfFavorite();
  }, [productId]);

  const loadProductDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const productData = await ApiService.getProduct(productId);
      setProduct(productData);
    } catch (error) {
      console.error('Error loading product details:', error);
      Alert.alert('Error', 'Failed to load product details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (): Promise<void> => {
    try {
      setAddingToCart(true);
      await ApiService.addToCart(productId, quantity);
      
      Alert.alert(
        'Success!',
        `Added ${quantity} item${quantity > 1 ? 's' : ''} to your cart`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { 
            text: 'View Cart', 
            onPress: () => navigation.navigate('Cart') 
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleFavorite = async (): Promise<void> => {
    try {
      setAddingToFavorites(true);
      
      if (isFavorite) {
        await ApiService.removeFromFavorites(productId);
        setIsFavorite(false);
        Alert.alert('Removed', 'Product removed from favorites');
      } else {
        await ApiService.addToFavorites(productId);
        setIsFavorite(true);
        Alert.alert('Added', 'Product added to favorites');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update favorites');
    } finally {
      setAddingToFavorites(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!product) return;
    
    try {
      await Share.share({
        message: `Check out this product: ${product.name}\nPrice: $${product.price}\n\nShared from MarketHub`,
        title: product.name,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const incrementQuantity = (): void => {
    if (product && quantity < product.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = (): void => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#FF6B6B" />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock <= 5 && product.stock > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Icon name="share" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleToggleFavorite} 
            style={styles.headerButton}
            disabled={addingToFavorites}
          >
            <Icon 
              name={isFavorite ? "favorite" : "favorite-border"} 
              size={24} 
              color={isFavorite ? "#FF6B6B" : "#333"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: product.image || 'https://via.placeholder.com/400x300?text=No+Image'
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>${product.price}</Text>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            {isOutOfStock ? (
              <Text style={styles.outOfStockLabel}>Out of Stock</Text>
            ) : isLowStock ? (
              <Text style={styles.lowStockLabel}>Only {product.stock} left in stock!</Text>
            ) : (
              <Text style={styles.inStockLabel}>In Stock ({product.stock} available)</Text>
            )}
          </View>

          {/* Rating (if available) */}
          {product.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            </View>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={[styles.quantityButton, quantity <= 1 && styles.disabledButton]}
                  onPress={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Icon name="remove" size={20} color={quantity <= 1 ? "#ccc" : "#007AFF"} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.quantityButton, quantity >= product.stock && styles.disabledButton]}
                  onPress={incrementQuantity}
                  disabled={quantity >= product.stock}
                >
                  <Icon name="add" size={20} color={quantity >= product.stock ? "#ccc" : "#007AFF"} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          {/* Seller Info */}
          {product.seller && (
            <View style={styles.sellerContainer}>
              <Text style={styles.sectionTitle}>Seller Information</Text>
              <View style={styles.sellerInfo}>
                <Icon name="person" size={20} color="#666" />
                <Text style={styles.sellerName}>{product.seller.name}</Text>
              </View>
            </View>
          )}

          {/* Product Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            {product.created_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Listed on:</Text>
                <Text style={styles.detailValue}>{formatDate(product.created_at)}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product ID:</Text>
              <Text style={styles.detailValue}>#{product.id}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      {!isOutOfStock && (
        <View style={styles.addToCartContainer}>
          <TouchableOpacity
            style={[styles.addToCartButton, addingToCart && styles.disabledButton]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="shopping-cart" size={20} color="#FFFFFF" />
                <Text style={styles.addToCartText}>
                  Add to Cart • ${(product.price * quantity).toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  productImage: {
    width: width,
    height: width * 0.75,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 30,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  stockContainer: {
    marginBottom: 16,
  },
  outOfStockLabel: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
  },
  lowStockLabel: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: '600',
  },
  inStockLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
  },
  quantityButton: {
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  quantityText: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disabledButton: {
    opacity: 0.5,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  sellerContainer: {
    marginBottom: 24,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerName: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  addToCartContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  addToCartButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProductDetailScreen;
