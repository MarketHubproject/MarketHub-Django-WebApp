import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services';
import i18n from '../services/i18n';
import { useFocusEffect } from '@react-navigation/native';
import { getProductImageUrl } from '../config/environment';
import { SmartImage } from '../components';
import { logger, ErrorToast } from '../utils';

const { width } = Dimensions.get('window');

interface CartItem {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    image?: string;
    category: string;
    stock: number;
  };
  quantity: number;
  subtotal: number;
}

interface CartData {
  items: CartItem[];
  total: number;
  items_count: number;
}

const CartScreen = ({ navigation }: any): React.JSX.Element => {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const loadCart = async (showRefreshing = false): Promise<void> => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const cartData = await ApiService.getCart();
      setCart(cartData);
    } catch (error: any) {
      logger.error('Error loading cart', error, {
        component: 'CartScreen',
        action: 'loadCart',
        metadata: {
          showRefreshing,
          cartItemsCount: cart?.items?.length || 0,
        }
      });
      
      // Don't show error for empty cart or authentication errors
      if (!error.message?.includes('empty') && !error.message?.includes('authentication')) {
        ErrorToast.show({
          title: i18n.t('common.error'),
          message: i18n.t('cart.failedToLoad')
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateQuantity = async (itemId: number, newQuantity: number): Promise<void> => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    try {
      setUpdating(itemId);
      await ApiService.updateCartItem(itemId, newQuantity);
      
      // Update local state optimistically
      setCart(prevCart => {
        if (!prevCart) return null;
        
        const updatedItems = prevCart.items.map(item => {
          if (item.id === itemId) {
            const updatedItem = {
              ...item,
              quantity: newQuantity,
              subtotal: item.product.price * newQuantity
            };
            return updatedItem;
          }
          return item;
        });
        
        const newTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        return {
          ...prevCart,
          items: updatedItems,
          total: newTotal,
          items_count: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
        };
      });
    } catch (error: any) {
      logger.error('Error updating cart item quantity', error, {
        component: 'CartScreen',
        action: 'updateQuantity',
        metadata: {
          itemId,
          newQuantity,
          cartItemsCount: cart?.items?.length || 0,
        }
      });
      
      ErrorToast.show({
        title: i18n.t('common.error'),
        message: error.message || i18n.t('cart.failedToUpdate')
      });
      
      // Reload cart to sync with server state
      loadCart();
    } finally {
      setUpdating(null);
    }
  };

  const removeFromCart = async (itemId: number): Promise<void> => {
    Alert.alert(
      i18n.t('cart.removeItem'),
      i18n.t('cart.removeItemConfirm'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(itemId);
              await ApiService.removeFromCart(itemId);
              
              // Update local state
              setCart(prevCart => {
                if (!prevCart) return null;
                
                const updatedItems = prevCart.items.filter(item => item.id !== itemId);
                const newTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
                
                return {
                  ...prevCart,
                  items: updatedItems,
                  total: newTotal,
                  items_count: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
                };
              });
            } catch (error: any) {
              logger.error('Error removing cart item', error, {
                component: 'CartScreen',
                action: 'removeFromCart',
                metadata: {
                  itemId,
                  cartItemsCount: cart?.items?.length || 0,
                }
              });
              
              ErrorToast.show({
                title: i18n.t('common.error'),
                message: error.message || i18n.t('cart.failedToRemove')
              });
              
              loadCart();
            } finally {
              setUpdating(null);
            }
          }
        }
      ]
    );
  };

  const handleCheckout = (): void => {
    if (!cart || cart.items.length === 0) return;

    Alert.alert(
      i18n.t('cart.checkout'),
      i18n.t('cart.checkoutTotal', { amount: cart.total.toFixed(2) }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.continue'),
          onPress: () => {
            // TODO: Implement checkout flow
            Alert.alert(
              i18n.t('common.comingSoon'), 
              i18n.t('cart.checkoutImplementation')
            );
          }
        }
      ]
    );
  };

  const incrementQuantity = (item: CartItem): void => {
    if (item.quantity < item.product.stock) {
      updateQuantity(item.id, item.quantity + 1);
    } else {
      Alert.alert(
        i18n.t('cart.stockLimit'), 
        i18n.t('cart.onlyXAvailable', { count: item.product.stock })
      );
    }
  };

  const decrementQuantity = (item: CartItem): void => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      removeFromCart(item.id);
    }
  };

  const navigateToProduct = (productId: number): void => {
    navigation.navigate('Products', {
      screen: 'ProductDetail',
      params: { productId }
    });
  };

  const renderCartItem = ({ item }: { item: CartItem }): React.JSX.Element => {
    const isUpdating = updating === item.id;
    const isOutOfStock = item.product.stock === 0;
    const hasStockIssue = item.quantity > item.product.stock;

    return (
      <View style={styles.cartItem}>
        <TouchableOpacity 
          style={styles.productImageContainer}
          onPress={() => navigateToProduct(item.product.id)}
        >
          <SmartImage
            source={{
              uri: getProductImageUrl(item.product)
            }}
            style={styles.productImage}
            resizeMode="cover"
            fallbackText={item.product.name}
          />
          {(isOutOfStock || hasStockIssue) && (
            <View style={styles.stockIssueOverlay}>
              <Icon name="warning" size={16} color="#FFFFFF" />
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
          
          {hasStockIssue && (
            <Text style={styles.stockWarning}>
              {i18n.t('cart.onlyXInStock', { count: item.product.stock })}
            </Text>
          )}
          {isOutOfStock && (
            <Text style={styles.outOfStockText}>{i18n.t('cart.outOfStock')}</Text>
          )}
        </View>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, item.quantity <= 1 && styles.disabledButton]}
            onPress={() => decrementQuantity(item)}
            disabled={isUpdating || item.quantity <= 1}
          >
            <Icon 
              name={item.quantity <= 1 ? "delete" : "remove"} 
              size={20} 
              color={item.quantity <= 1 ? "#FF6B6B" : "#007AFF"} 
            />
          </TouchableOpacity>
          
          <View style={styles.quantityTextContainer}>
            {isUpdating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.quantityText}>{item.quantity}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[
              styles.quantityButton,
              (item.quantity >= item.product.stock || isOutOfStock) && styles.disabledButton
            ]}
            onPress={() => incrementQuantity(item)}
            disabled={isUpdating || item.quantity >= item.product.stock || isOutOfStock}
          >
            <Icon 
              name="add" 
              size={20} 
              color={(item.quantity >= item.product.stock || isOutOfStock) ? "#ccc" : "#007AFF"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalText}>
            ${item.subtotal.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
            disabled={isUpdating}
          >
            <Icon name="close" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyCart = (): React.JSX.Element => (
    <View style={styles.emptyContainer}>
      <Icon name="shopping-cart" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>{i18n.t('cart.yourCartEmpty')}</Text>
      <Text style={styles.emptySubtitle}>
        {i18n.t('cart.addProductsToStart')}
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('Products')}
      >
        <Text style={styles.shopButtonText}>{i18n.t('cart.startShopping')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartSummary = (): React.JSX.Element => {
    if (!cart || cart.items.length === 0) return <></>;

    const hasStockIssues = cart.items.some(item => 
      item.product.stock === 0 || item.quantity > item.product.stock
    );

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{i18n.t('cart.items', { count: cart.items_count })}</Text>
          <Text style={styles.summaryValue}>
            ${cart.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>{i18n.t('cart.total')}</Text>
          <Text style={styles.totalValue}>${cart.total.toFixed(2)}</Text>
        </View>

        {hasStockIssues && (
          <Text style={styles.stockIssueWarning}>
            {i18n.t('cart.stockIssueWarning')}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.checkoutButton, hasStockIssues && styles.disabledButton]}
          onPress={handleCheckout}
          disabled={hasStockIssues}
        >
          <Text style={styles.checkoutButtonText}>
            {i18n.t('cart.proceedToCheckout')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{i18n.t('cart.loadingCart')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('cart.shoppingCart')}</Text>
        {cart && cart.items.length > 0 && (
          <TouchableOpacity onPress={() => loadCart(true)}>
            <Icon name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {!cart || cart.items.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <FlatList
            data={cart.items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            refreshing={refreshing}
            onRefresh={() => loadCart(true)}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
          {renderCartSummary()}
        </>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  stockIssueOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 2,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  stockWarning: {
    fontSize: 11,
    color: '#FF8C00',
    fontWeight: '500',
    marginTop: 2,
  },
  outOfStockText: {
    fontSize: 11,
    color: '#FF4444',
    fontWeight: '500',
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  quantityButton: {
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  quantityTextContainer: {
    minWidth: 40,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disabledButton: {
    opacity: 0.5,
  },
  subtotalContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    padding: 4,
    marginTop: 8,
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
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E1E1E1',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  stockIssueWarning: {
    fontSize: 12,
    color: '#FF8C00',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;
