import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ApiService from "../services";
import i18n from "../services/i18n";
import { useFocusEffect } from "@react-navigation/native";
import { getProductImageUrl } from "../config/environment";
import { SmartImage } from "../components";
import { logger, ErrorToast } from "../utils";
import { useCart, CartItem as ContextCartItem } from "../contexts/CartContext";

const { width } = Dimensions.get("window");

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
  const {
    items,
    total,
    itemsCount,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  } = useCart();
  const [cart, setCart] = useState<CartData | null>(null);
  const [localLoading, setLocalLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const fadeAnim = new Animated.Value(1);

  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [])
  );

  // Sync context with local state for API compatibility
  useEffect(() => {
    const cartData: CartData = {
      items: items.map((item) => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      total: appliedPromo
        ? total - (total * appliedPromo.discount) / 100
        : total,
      items_count: itemsCount,
    };
    setCart(cartData);
  }, [items, total, itemsCount, appliedPromo]);

  const loadCartData = async (showRefreshing = false): Promise<void> => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLocalLoading(true);
      }

      // Load sample cart data for demo
      const sampleCartItems: ContextCartItem[] = [
        {
          id: 1,
          product: {
            id: 1,
            name: "Wireless Bluetooth Headphones Pro Max",
            price: 299.99,
            image:
              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
            category: "Electronics",
            stock: 15,
          },
          quantity: 1,
          subtotal: 299.99,
        },
        {
          id: 2,
          product: {
            id: 4,
            name: "Running Shoes",
            price: 89.99,
            image:
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
            category: "Sports & Fitness",
            stock: 8,
          },
          quantity: 2,
          subtotal: 179.98,
        },
      ];

      // For demo purposes, add sample items to cart if empty
      if (items.length === 0) {
        sampleCartItems.forEach((item) => {
          addToCart(item.product, item.quantity);
        });
      }

      // TODO: Replace with actual API call
      // const cartData = await ApiService.getCart();
      // setCart(cartData);
    } catch (error: any) {
      logger.error("Error loading cart", error, {
        component: "CartScreen",
        action: "loadCartData",
        metadata: {
          showRefreshing,
          cartItemsCount: items?.length || 0,
        },
      });

      ErrorToast.show({
        title: i18n.t("common.error"),
        message: i18n.t("cart.failedToLoad"),
      });
    } finally {
      setLocalLoading(false);
      setRefreshing(false);
    }
  };

  const updateQuantity = async (
    itemId: number,
    newQuantity: number
  ): Promise<void> => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId);
      return;
    }

    try {
      setUpdating(itemId);

      // Animate quantity change
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      updateCartItem(itemId, newQuantity);

      // TODO: Replace with actual API call
      // await ApiService.updateCartItem(itemId, newQuantity);
    } catch (error: any) {
      logger.error("Error updating cart item quantity", error, {
        component: "CartScreen",
        action: "updateQuantity",
        metadata: {
          itemId,
          newQuantity,
          cartItemsCount: items?.length || 0,
        },
      });

      ErrorToast.show({
        title: i18n.t("common.error"),
        message: error.message || i18n.t("cart.failedToUpdate"),
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveFromCart = async (itemId: number): Promise<void> => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            try {
              setUpdating(itemId);
              removeFromCart(itemId);
            } catch (error: any) {
              logger.error("Error removing cart item", error, {
                component: "CartScreen",
                action: "handleRemoveFromCart",
                metadata: {
                  itemId,
                  cartItemsCount: items?.length || 0,
                },
              });

              ErrorToast.show({
                title: "Error",
                message: "Failed to remove item from cart",
              });
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const handleClearCart = (): void => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            clearCart();
            setAppliedPromo(null);
          },
        },
      ]
    );
  };

  const applyPromoCode = (code: string): void => {
    // Sample promo codes
    const promoCodes = {
      SAVE10: { discount: 10, name: "10% Off" },
      WELCOME20: { discount: 20, name: "20% Welcome Discount" },
      FREESHIP: { discount: 5, name: "Free Shipping" },
    };

    const upperCode = code.toUpperCase();
    if (promoCodes[upperCode as keyof typeof promoCodes]) {
      const promo = promoCodes[upperCode as keyof typeof promoCodes];
      setAppliedPromo({ code: upperCode, discount: promo.discount });
      setShowPromoModal(false);
      setPromoCode("");
      Alert.alert("Success!", `${promo.name} applied successfully!`);
    } else {
      Alert.alert("Invalid Code", "The promo code you entered is not valid.");
    }
  };

  const removePromoCode = (): void => {
    setAppliedPromo(null);
  };

  const handleCheckout = (): void => {
    if (!cart || cart.items.length === 0) return;

    // Navigate to checkout screen
    navigation.navigate("Checkout");
  };

  const incrementQuantity = (item: CartItem): void => {
    if (item.quantity < item.product.stock) {
      updateQuantity(item.id, item.quantity + 1);
    } else {
      Alert.alert(
        i18n.t("cart.stockLimit"),
        i18n.t("cart.onlyXAvailable", { count: item.product.stock })
      );
    }
  };

  const decrementQuantity = (item: CartItem): void => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      handleRemoveFromCart(item.id);
    }
  };

  const navigateToProduct = (productId: number): void => {
    navigation.navigate("Products", {
      screen: "ProductDetail",
      params: { productId },
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
              uri: getProductImageUrl(item.product),
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
          <Text style={styles.productPrice}>
            R{item.product.price.toFixed(2)}
          </Text>

          {hasStockIssue && (
            <Text style={styles.stockWarning}>
              {i18n.t("cart.onlyXInStock", { count: item.product.stock })}
            </Text>
          )}
          {isOutOfStock && (
            <Text style={styles.outOfStockText}>
              {i18n.t("cart.outOfStock")}
            </Text>
          )}
        </View>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              item.quantity <= 1 && styles.disabledButton,
            ]}
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
              (item.quantity >= item.product.stock || isOutOfStock) &&
                styles.disabledButton,
            ]}
            onPress={() => incrementQuantity(item)}
            disabled={
              isUpdating || item.quantity >= item.product.stock || isOutOfStock
            }
          >
            <Icon
              name="add"
              size={20}
              color={
                item.quantity >= item.product.stock || isOutOfStock
                  ? "#ccc"
                  : "#007AFF"
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalText}>R{item.subtotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFromCart(item.id)}
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
      <Text style={styles.emptyTitle}>{i18n.t("cart.yourCartEmpty")}</Text>
      <Text style={styles.emptySubtitle}>
        {i18n.t("cart.addProductsToStart")}
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate("Products")}
      >
        <Text style={styles.shopButtonText}>
          {i18n.t("cart.startShopping")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartSummary = (): React.JSX.Element => {
    if (!cart || cart.items.length === 0) return <></>;

    const hasStockIssues = cart.items.some(
      (item) => item.product.stock === 0 || item.quantity > item.product.stock
    );

    const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = appliedPromo
      ? (subtotal * appliedPromo.discount) / 100
      : 0;
    const finalTotal = subtotal - discount;

    return (
      <View style={styles.summaryContainer}>
        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.promoButton}
            onPress={() => setShowPromoModal(true)}
          >
            <Icon name="local-offer" size={16} color="#007AFF" />
            <Text style={styles.promoButtonText}>Promo Code</Text>
          </TouchableOpacity>

          {cart.items.length > 1 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearCart}
            >
              <Icon name="clear-all" size={16} color="#FF6B6B" />
              <Text style={styles.clearButtonText}>Clear Cart</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Applied Promo */}
        {appliedPromo && (
          <View style={styles.appliedPromoContainer}>
            <View style={styles.appliedPromoInfo}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.appliedPromoText}>
                {appliedPromo.code} - {appliedPromo.discount}% off
              </Text>
            </View>
            <TouchableOpacity onPress={removePromoCode}>
              <Icon name="close" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items ({cart.items_count})</Text>
          <Text style={styles.summaryValue}>R{subtotal.toFixed(2)}</Text>
        </View>

        {appliedPromo && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountLabel}>
              Discount ({appliedPromo.discount}%)
            </Text>
            <Text style={styles.discountValue}>-R{discount.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>R{finalTotal.toFixed(2)}</Text>
        </View>

        {hasStockIssues && (
          <Text style={styles.stockIssueWarning}>
            Some items have stock issues. Please review your cart.
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            hasStockIssues && styles.disabledButton,
          ]}
          onPress={handleCheckout}
          disabled={hasStockIssues}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPromoModal = (): React.JSX.Element => (
    <Modal
      visible={showPromoModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPromoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Promo Code</Text>
            <TouchableOpacity onPress={() => setShowPromoModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Have a promo code? Enter it below to get a discount on your order.
          </Text>

          <View style={styles.promoInputContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.samplePromos}>
            <Text style={styles.samplePromosTitle}>
              Try these sample codes:
            </Text>
            <Text style={styles.samplePromoCode}>• SAVE10 (10% off)</Text>
            <Text style={styles.samplePromoCode}>• WELCOME20 (20% off)</Text>
            <Text style={styles.samplePromoCode}>• FREESHIP (5% off)</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.applyPromoButton,
              !promoCode && styles.disabledButton,
            ]}
            onPress={() => applyPromoCode(promoCode)}
            disabled={!promoCode}
          >
            <Text style={styles.applyPromoButtonText}>Apply Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{i18n.t("cart.loadingCart")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t("cart.shoppingCart")}</Text>
        {cart && cart.items.length > 0 && (
          <TouchableOpacity onPress={() => loadCartData(true)}>
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
            onRefresh={() => loadCartData(true)}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
          {renderCartSummary()}
        </>
      )}

      {renderPromoModal()}
    </View>
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
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    position: "relative",
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  stockIssueOverlay: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    padding: 2,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  stockWarning: {
    fontSize: 11,
    color: "#FF8C00",
    fontWeight: "500",
    marginTop: 2,
  },
  outOfStockText: {
    fontSize: 11,
    color: "#FF4444",
    fontWeight: "500",
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  quantityButton: {
    padding: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
  },
  quantityTextContainer: {
    minWidth: 40,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  disabledButton: {
    opacity: 0.5,
  },
  subtotalContainer: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minWidth: 80,
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  removeButton: {
    padding: 4,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E1E1E1",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  stockIssueWarning: {
    fontSize: 12,
    color: "#FF8C00",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  checkoutButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // New Enhanced Cart Styles
  actionButtonsRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  promoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  promoButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  clearButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  appliedPromoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  appliedPromoInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  appliedPromoText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  discountLabel: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "500",
  },
  discountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
    marginBottom: 20,
  },
  promoInputContainer: {
    marginBottom: 20,
  },
  promoInput: {
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
  },
  samplePromos: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  samplePromosTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  samplePromoCode: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  applyPromoButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  applyPromoButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CartScreen;
