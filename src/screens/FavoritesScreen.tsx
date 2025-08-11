import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/mockApi';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const numColumns = 2;
const productWidth = (width - 60) / numColumns;

interface FavoriteProduct {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    image?: string;
    category: string;
    stock: number;
    description: string;
  };
  created_at: string;
}

const FavoritesScreen = ({ navigation }: any): React.JSX.Element => {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async (showRefreshing = false): Promise<void> => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const favoritesData = await ApiService.getFavorites();
      setFavorites(favoritesData.results || favoritesData || []);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      // Don't show alert for empty favorites or authentication errors
      if (!error.message?.includes('empty') && !error.message?.includes('authentication')) {
        Alert.alert('Error', 'Failed to load favorites. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const removeFromFavorites = async (favoriteId: number, productId: number): Promise<void> => {
    Alert.alert(
      'Remove from Favorites',
      'Are you sure you want to remove this item from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingItems(prev => new Set(prev).add(favoriteId));
              await ApiService.removeFromFavorites(productId);
              
              // Update local state
              setFavorites(prevFavorites => 
                prevFavorites.filter(item => item.id !== favoriteId)
              );
              
              Alert.alert('Removed', 'Item removed from favorites');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove item from favorites');
            } finally {
              setRemovingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(favoriteId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const addToCart = async (product: FavoriteProduct['product']): Promise<void> => {
    if (product.stock === 0) {
      Alert.alert('Out of Stock', 'This item is currently out of stock.');
      return;
    }

    try {
      await ApiService.addToCart(product.id, 1);
      
      Alert.alert(
        'Added to Cart!',
        `${product.name} has been added to your cart.`,
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
    }
  };

  const shareProduct = async (product: FavoriteProduct['product']): Promise<void> => {
    try {
      await Share.share({
        message: `Check out this product: ${product.name}\nPrice: $${product.price}\n\nShared from MarketHub`,
        title: product.name,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const navigateToProduct = (productId: number): void => {
    navigation.navigate('Products', {
      screen: 'ProductDetail',
      params: { productId }
    });
  };

  const navigateToShopping = (): void => {
    navigation.navigate('Products');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteProduct }): React.JSX.Element => {
    const isRemoving = removingItems.has(item.id);
    const isOutOfStock = item.product.stock === 0;
    const isLowStock = item.product.stock <= 5 && item.product.stock > 0;

    return (
      <View style={styles.favoriteCard}>
        <TouchableOpacity 
          onPress={() => navigateToProduct(item.product.id)}
          style={styles.productImageContainer}
        >
          <Image
            source={{
              uri: item.product.image || 'https://via.placeholder.com/150x150?text=No+Image'
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <TouchableOpacity onPress={() => navigateToProduct(item.product.id)}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product.name}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.productCategory}>{item.product.category}</Text>
          <Text style={styles.productPrice}>${item.product.price}</Text>
          
          {isLowStock && !isOutOfStock && (
            <Text style={styles.lowStockText}>Only {item.product.stock} left!</Text>
          )}
          
          <Text style={styles.addedDate}>
            Added {formatDate(item.created_at)}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => shareProduct(item.product)}
          >
            <Icon name="share" size={18} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, isRemoving && styles.disabledButton]}
            onPress={() => removeFromFavorites(item.id, item.product.id)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <Icon name="favorite" size={18} color="#FF6B6B" />
            )}
          </TouchableOpacity>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[styles.addToCartButton, isOutOfStock && styles.disabledButton]}
          onPress={() => addToCart(item.product)}
          disabled={isOutOfStock}
        >
          <Icon name="shopping-cart" size={16} color={isOutOfStock ? "#ccc" : "#FFFFFF"} />
          <Text style={[styles.addToCartText, isOutOfStock && styles.disabledText]}>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyFavorites = (): React.JSX.Element => (
    <View style={styles.emptyContainer}>
      <Icon name="favorite-border" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start adding products to your favorites to see them here!
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={navigateToShopping}
      >
        <Text style={styles.shopButtonText}>Explore Products</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = (): React.JSX.Element => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        {favorites.length > 0 && (
          <Text style={styles.favoriteCount}>
            {favorites.length} item{favorites.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      {favorites.length > 0 && (
        <TouchableOpacity onPress={() => loadFavorites(true)}>
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {favorites.length === 0 ? (
        renderEmptyFavorites()
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.favoritesList}
          refreshing={refreshing}
          onRefresh={() => loadFavorites(true)}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.continueShoppingButton}
                onPress={navigateToShopping}
              >
                <Icon name="add" size={20} color="#007AFF" />
                <Text style={styles.continueShoppingText}>
                  Continue Shopping
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  favoriteCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  favoritesList: {
    padding: 16,
  },
  favoriteCard: {
    width: productWidth,
    marginBottom: 16,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  lowStockText: {
    fontSize: 11,
    color: '#FF8C00',
    fontWeight: '500',
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 11,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  disabledButton: {
    opacity: 0.5,
  },
  addToCartButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  disabledText: {
    color: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  shopButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  continueShoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  continueShoppingText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FavoritesScreen;
