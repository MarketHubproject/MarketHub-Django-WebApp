import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ApiService from "../services";
import i18n from "../services/i18n";
import { getProductImageUrl } from "../config/environment";
import { SmartImage, ProductCard, ARProductViewer } from "../components";
import { logger, ErrorToast } from "../utils";
import sharingService from "../services/sharingService";
import referralService from "../services/referralService";

const { width, height } = Dimensions.get("window");

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  category: string;
  description: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
  ar_model_url?: string; // URL to 3D model for AR viewing
  location?: {
    city: string;
    province: string;
    area?: string;
  };
  seller?: {
    id: number;
    name: string;
    email: string;
    location?: {
      city: string;
      province: string;
    };
  };
  created_at?: string;
  specifications?: { [key: string]: string };
  discount?: number;
  originalPrice?: number;
}

interface Review {
  id: number;
  user: {
    name: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  date: string;
  helpful?: number;
}

const ProductDetailScreen = ({ route, navigation }: any): React.JSX.Element => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [addingToFavorites, setAddingToFavorites] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);
  const [showARViewer, setShowARViewer] = useState<boolean>(false);
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadProductDetails();
    loadUserData();
    // You might want to check if this product is in favorites
    // checkIfFavorite();
  }, [productId]);

  const loadUserData = async (): Promise<void> => {
    try {
      // Get current user data (this would come from your auth context/service)
      const user = await ApiService.getCurrentUser(); // Implement this method
      setCurrentUser(user);

      if (user) {
        // Generate or get user's referral code
        const referralCode = await referralService.generateUserReferralCode(
          user.id,
          user.first_name || user.name || "User"
        );
        setUserReferralCode(referralCode);
      }
    } catch (error) {
      logger.error("Error loading user data", error);
      // Continue without referral functionality
    }
  };

  const loadProductDetails = async (): Promise<void> => {
    try {
      setLoading(true);

      // For demo purposes, create enhanced sample data
      const sampleProduct: Product = {
        id: productId,
        name: "Wireless Bluetooth Headphones Pro Max",
        price: 299.99,
        originalPrice: 399.99,
        discount: 25,
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop",
          "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop",
          "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=800&fit=crop",
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&h=800&fit=crop",
        ],
        category: "Electronics",
        description:
          "Experience premium sound quality with these advanced wireless headphones. Featuring active noise cancellation, 30-hour battery life, and crystal-clear audio for music, calls, and gaming. The ergonomic design ensures comfort during extended use.",
        stock: 15,
        rating: 4.7,
        reviewCount: 127,
        location: {
          city: "Cape Town",
          province: "Western Cape",
          area: "CBD",
        },
        seller: {
          id: 1,
          name: "TechStore SA",
          email: "info@techstore.co.za",
          location: {
            city: "Cape Town",
            province: "Western Cape",
          },
        },
        created_at: new Date().toISOString(),
        ar_model_url:
          "https://modelviewer.dev/shared-assets/models/Astronaut.glb", // Sample 3D model URL
        specifications: {
          "Battery Life": "30 hours",
          Connectivity: "Bluetooth 5.2",
          Weight: "250g",
          Color: "Midnight Black",
          Warranty: "2 years",
          "Water Resistance": "IPX4",
        },
      };

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProduct(sampleProduct);

      // Load additional data
      await Promise.all([loadReviews(), loadRelatedProducts()]);

      // TODO: Replace with actual API call
      // const productData = await ApiService.getProduct(productId);
      // setProduct(productData);
    } catch (error: any) {
      logger.error("Error loading product details", error, {
        component: "ProductDetailScreen",
        action: "loadProductDetails",
        metadata: {
          productId,
        },
      });

      ErrorToast.show({
        title: i18n.t("common.error"),
        message: i18n.t("errors.loadingError"),
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (): Promise<void> => {
    try {
      setLoadingReviews(true);

      // Sample reviews data
      const sampleReviews: Review[] = [
        {
          id: 1,
          user: { name: "John D." },
          rating: 5,
          comment:
            "Absolutely amazing headphones! The sound quality is incredible and the noise cancellation works perfectly. Highly recommend!",
          date: "2024-01-15",
          helpful: 12,
        },
        {
          id: 2,
          user: { name: "Sarah M." },
          rating: 4,
          comment:
            "Great headphones overall. Battery life is as advertised and they're very comfortable. Only minor complaint is they can get a bit warm during long sessions.",
          date: "2024-01-10",
          helpful: 8,
        },
        {
          id: 3,
          user: { name: "Mike K." },
          rating: 5,
          comment:
            "Best purchase I've made this year. The build quality is excellent and the sound is crisp and clear.",
          date: "2024-01-08",
          helpful: 15,
        },
      ];

      await new Promise((resolve) => setTimeout(resolve, 500));
      setReviews(sampleReviews);

      // TODO: Replace with actual API call
      // const reviewsData = await ApiService.getProductReviews(productId);
      // setReviews(reviewsData);
    } catch (error: any) {
      logger.error("Error loading reviews", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadRelatedProducts = async (): Promise<void> => {
    try {
      setLoadingRelated(true);

      // Sample related products
      const sampleRelated: Product[] = [
        {
          id: 2,
          name: "Wireless Earbuds Pro",
          price: 159.99,
          image:
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
          category: "Electronics",
          description: "Compact wireless earbuds with great sound",
          stock: 25,
          rating: 4.5,
        },
        {
          id: 3,
          name: "Gaming Headset RGB",
          price: 89.99,
          image:
            "https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=400&fit=crop",
          category: "Electronics",
          description: "RGB gaming headset with surround sound",
          stock: 18,
          rating: 4.3,
        },
        {
          id: 4,
          name: "Bluetooth Speaker",
          price: 79.99,
          image:
            "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
          category: "Electronics",
          description: "Portable wireless speaker with deep bass",
          stock: 12,
          rating: 4.4,
        },
      ];

      await new Promise((resolve) => setTimeout(resolve, 700));
      setRelatedProducts(sampleRelated);

      // TODO: Replace with actual API call
      // const relatedData = await ApiService.getRelatedProducts(productId);
      // setRelatedProducts(relatedData);
    } catch (error: any) {
      logger.error("Error loading related products", error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleAddToCart = async (): Promise<void> => {
    try {
      setAddingToCart(true);
      await ApiService.addToCart(productId, quantity);

      Alert.alert(
        "Success!",
        `Added ${quantity} item${quantity > 1 ? "s" : ""} to your cart`,
        [
          { text: "Continue Shopping", style: "cancel" },
          {
            text: "View Cart",
            onPress: () => navigation.navigate("Cart"),
          },
        ]
      );
    } catch (error: any) {
      logger.error("Error adding to cart", error, {
        component: "ProductDetailScreen",
        action: "handleAddToCart",
        metadata: {
          productId,
          quantity,
        },
      });

      ErrorToast.show({
        title: i18n.t("common.error"),
        message: error.message || "Failed to add item to cart",
      });
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
        Alert.alert("Removed", "Product removed from favorites");
      } else {
        await ApiService.addToFavorites(productId);
        setIsFavorite(true);
        Alert.alert("Added", "Product added to favorites");
      }
    } catch (error: any) {
      logger.error("Error toggling favorites", error, {
        component: "ProductDetailScreen",
        action: "handleToggleFavorite",
        metadata: {
          productId,
          isFavorite,
        },
      });

      ErrorToast.show({
        title: i18n.t("common.error"),
        message: error.message || "Failed to update favorites",
      });
    } finally {
      setAddingToFavorites(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!product) return;

    try {
      // If user is logged in and has referral code, use referral sharing
      if (currentUser && userReferralCode) {
        const success = await sharingService.shareProduct({
          productId: productId.toString(),
          productName: product.name,
          productPrice: product.price,
          productImage: product.images?.[0] || getProductImageUrl(product),
          userId: currentUser.id,
          referralCode: userReferralCode,
        });

        if (success) {
          Alert.alert(
            "Shared!",
            "Product shared successfully with your referral code!"
          );
        }
      } else {
        // Fallback to basic sharing if no user/referral code
        const shareOptions = await sharingService.createShareableContent(
          "product",
          {
            productId: productId.toString(),
            productName: product.name,
            userId: 0,
            referralCode: "GUEST",
            productImage: product.images?.[0] || getProductImageUrl(product),
          }
        );

        await sharingService.showShareMenu(shareOptions);
      }
    } catch (error: any) {
      logger.error("Error sharing product", error, {
        component: "ProductDetailScreen",
        action: "handleShare",
        metadata: {
          productId,
          productName: product?.name,
          hasReferralCode: !!userReferralCode,
        },
      });

      // Fallback to basic share
      Alert.alert(
        "Share Product",
        `Check out this product: ${
          product.name
        }\nPrice: R${product.price.toFixed(2)}\n\nShared from MarketHub`
      );
    }
  };

  const incrementQuantity = (): void => {
    if (product && quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = (): void => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setShowImageModal(true)}>
            <SmartImage
              source={{
                uri:
                  product.images?.[selectedImageIndex] ||
                  getProductImageUrl(product),
              }}
              style={styles.productImage}
              resizeMode="cover"
              fallbackText={product.name}
              loadingSize="large"
            />
          </TouchableOpacity>
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
          {product.discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{product.discount}% OFF</Text>
            </View>
          )}
          {product.images && product.images.length > 1 && (
            <View style={styles.imageIndicator}>
              <Text style={styles.imageIndicatorText}>
                {selectedImageIndex + 1} / {product.images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Image Thumbnails */}
        {product.images && product.images.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <FlatList
              data={product.images}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(index)}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.selectedThumbnail,
                  ]}
                >
                  <SmartImage
                    source={{ uri: item }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>R{product.price.toFixed(2)}</Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text style={styles.originalPrice}>
                R{product.originalPrice.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Location Information */}
          {product.location && (
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={16} color="#666" />
              <Text style={styles.locationText}>
                {product.location.area ? `${product.location.area}, ` : ""}
                {product.location.city}, {product.location.province}
              </Text>
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            {isOutOfStock ? (
              <Text style={styles.outOfStockLabel}>Out of Stock</Text>
            ) : isLowStock ? (
              <Text style={styles.lowStockLabel}>
                Only {product.stock} left in stock!
              </Text>
            ) : (
              <Text style={styles.inStockLabel}>
                In Stock ({product.stock} available)
              </Text>
            )}
          </View>

          {/* Rating (if available) */}
          {product.rating && (
            <TouchableOpacity
              style={styles.ratingContainer}
              onPress={() => {
                /* TODO: Navigate to reviews section */
              }}
            >
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name="star"
                    size={16}
                    color={
                      star <= Math.floor(product.rating!)
                        ? "#FFD700"
                        : "#E0E0E0"
                    }
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              {product.reviewCount && (
                <Text style={styles.reviewCountText}>
                  ({product.reviewCount} reviews)
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity <= 1 && styles.disabledButton,
                  ]}
                  onPress={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Icon
                    name="remove"
                    size={20}
                    color={quantity <= 1 ? "#ccc" : "#007AFF"}
                  />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity >= product.stock && styles.disabledButton,
                  ]}
                  onPress={incrementQuantity}
                  disabled={quantity >= product.stock}
                >
                  <Icon
                    name="add"
                    size={20}
                    color={quantity >= product.stock ? "#ccc" : "#007AFF"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* View in AR Button */}
          {product.ar_model_url && (
            <View style={styles.arButtonContainer}>
              <TouchableOpacity
                style={styles.arButton}
                onPress={() => setShowARViewer(true)}
              >
                <Icon name="view-in-ar" size={24} color="#FFFFFF" />
                <Text style={styles.arButtonText}>View in AR</Text>
              </TouchableOpacity>
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
              {product.seller.location && (
                <View style={styles.sellerLocationInfo}>
                  <Icon name="location-on" size={16} color="#666" />
                  <Text style={styles.sellerLocationText}>
                    Based in {product.seller.location.city},{" "}
                    {product.seller.location.province}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Specifications */}
          {product.specifications && (
            <View style={styles.specificationsContainer}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.specifications).map(([key, value]) => (
                <View key={key} style={styles.specificationRow}>
                  <Text style={styles.specificationLabel}>{key}:</Text>
                  <Text style={styles.specificationValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.reviewsContainer}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              {loadingReviews && (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>

            {reviews.length > 0 ? (
              <View>
                {reviews.slice(0, 3).map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewUserInfo}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {review.user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.reviewUserName}>
                            {review.user.name}
                          </Text>
                          <View style={styles.reviewStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Icon
                                key={star}
                                name="star"
                                size={12}
                                color={
                                  star <= review.rating ? "#FFD700" : "#E0E0E0"
                                }
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {formatDate(review.date)}
                      </Text>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    {review.helpful && (
                      <View style={styles.reviewHelpful}>
                        <Icon name="thumb-up" size={14} color="#666" />
                        <Text style={styles.reviewHelpfulText}>
                          {review.helpful} helpful
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {reviews.length > 3 && (
                  <TouchableOpacity style={styles.seeAllReviewsButton}>
                    <Text style={styles.seeAllReviewsText}>
                      See all {reviews.length} reviews
                    </Text>
                    <Icon name="arrow-forward" size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              !loadingReviews && (
                <View style={styles.noReviewsContainer}>
                  <Icon name="rate-review" size={40} color="#ccc" />
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                  <Text style={styles.noReviewsSubtext}>
                    Be the first to review this product!
                  </Text>
                </View>
              )
            )}
          </View>

          {/* Related Products */}
          <View style={styles.relatedProductsContainer}>
            <View style={styles.relatedProductsHeader}>
              <Text style={styles.sectionTitle}>You might also like</Text>
              {loadingRelated && (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>

            {relatedProducts.length > 0 && (
              <FlatList
                data={relatedProducts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const enhancedProduct = {
                    ...item,
                    reviews: Math.floor(Math.random() * 50) + 10,
                    isFavorite: false,
                    inStock: item.stock > 0,
                  };
                  return (
                    <View style={styles.relatedProductItem}>
                      <ProductCard
                        product={enhancedProduct}
                        variant="compact"
                        onPress={() =>
                          navigation.push("ProductDetail", {
                            productId: item.id,
                          })
                        }
                        onFavoritePress={() => {
                          /* TODO: Handle favorite */
                        }}
                        onAddToCart={() => {
                          /* TODO: Handle add to cart */
                        }}
                      />
                    </View>
                  );
                }}
              />
            )}
          </View>

          {/* Product Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            {product.created_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Listed on:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(product.created_at)}
                </Text>
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
            style={[
              styles.addToCartButton,
              addingToCart && styles.disabledButton,
            ]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="shopping-cart" size={20} color="#FFFFFF" />
                <Text style={styles.addToCartText}>
                  Add to Cart - R{(product.price * quantity).toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Icon name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <SmartImage
            source={{
              uri:
                product.images?.[selectedImageIndex] ||
                getProductImageUrl(product),
            }}
            style={styles.modalImage}
            resizeMode="contain"
            fallbackText={product.name}
            loadingSize="large"
          />
        </View>
      </Modal>

      {/* AR Product Viewer Modal */}
      {product && product.ar_model_url && (
        <ARProductViewer
          product={product as Product}
          visible={showARViewer}
          onClose={() => setShowARViewer(false)}
          onError={(error) => {
            logger.error("AR Viewer Error", error);
            ErrorToast.show({
              title: "AR Error",
              message: error,
            });
          }}
        />
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  productImage: {
    width: width,
    height: width * 0.75,
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  productInfo: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginTop: 8,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    lineHeight: 30,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 16,
  },
  stockContainer: {
    marginBottom: 16,
  },
  outOfStockLabel: {
    fontSize: 14,
    color: "#FF4444",
    fontWeight: "600",
  },
  lowStockLabel: {
    fontSize: 14,
    color: "#FF8C00",
    fontWeight: "600",
  },
  inStockLabel: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 16,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 8,
  },
  quantityButton: {
    padding: 12,
    backgroundColor: "#F8F9FA",
  },
  quantityText: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  disabledButton: {
    opacity: 0.5,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  sellerContainer: {
    marginBottom: 24,
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerName: {
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  addToCartContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  addToCartButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
  },
  addToCartText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  sellerLocationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  sellerLocationText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  // Image Gallery Styles
  thumbnailContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedThumbnail: {
    borderColor: "#007AFF",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  imageIndicator: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  imageIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#FF6B6B",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  // Price Styles
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 18,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  // Rating Styles
  starsContainer: {
    flexDirection: "row",
  },
  reviewCountText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  // Specifications Styles
  specificationsContainer: {
    marginBottom: 24,
  },
  specificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  specificationLabel: {
    fontSize: 14,
    color: "#666",
  },
  specificationValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  // Reviews Styles
  reviewsContainer: {
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  reviewStars: {
    flexDirection: "row",
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  reviewComment: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  reviewHelpful: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  reviewHelpfulText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  seeAllReviewsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  seeAllReviewsText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
    marginRight: 4,
  },
  noReviewsContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noReviewsText: {
    fontSize: 16,
    color: "#333",
    marginTop: 8,
    fontWeight: "500",
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  // Related Products Styles
  relatedProductsContainer: {
    marginBottom: 24,
  },
  relatedProductsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  relatedProductItem: {
    marginRight: 16,
    width: width * 0.4,
  },
  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: width,
    height: height * 0.7,
  },
  imageModalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
  // AR Button Styles
  arButtonContainer: {
    marginBottom: 24,
  },
  arButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  arButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});

export default ProductDetailScreen;
