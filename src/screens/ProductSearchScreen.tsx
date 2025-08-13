import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Slider,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger, ErrorToast } from "../utils";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id: number;
  category_name: string;
  brand: string;
  rating: number;
  review_count: number;
  in_stock: boolean;
  discount_percentage?: number;
  tags: string[];
}

interface Category {
  id: number;
  name: string;
  icon: string;
  product_count: number;
}

interface FilterState {
  categories: number[];
  priceRange: { min: number; max: number };
  brands: string[];
  minRating: number;
  inStockOnly: boolean;
  onSale: boolean;
}

interface SortOption {
  key: string;
  label: string;
  value: (a: Product, b: Product) => number;
}

const ProductSearchScreen = ({ navigation, route }: any): React.JSX.Element => {
  const { initialQuery = "" } = route.params || {};

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 10000,
  });
  const [tempPriceRange, setTempPriceRange] = useState<{
    min: number;
    max: number;
  }>({ min: 0, max: 10000 });

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: { min: 0, max: 10000 },
    brands: [],
    minRating: 0,
    inStockOnly: false,
    onSale: false,
  });

  const [selectedSort, setSelectedSort] = useState("relevance");

  const sortOptions: SortOption[] = [
    {
      key: "relevance",
      label: "Most Relevant",
      value: (a, b) => b.rating - a.rating,
    },
    {
      key: "price_low",
      label: "Price: Low to High",
      value: (a, b) => a.price - b.price,
    },
    {
      key: "price_high",
      label: "Price: High to Low",
      value: (a, b) => b.price - a.price,
    },
    {
      key: "rating",
      label: "Highest Rated",
      value: (a, b) => b.rating - a.rating,
    },
    {
      key: "newest",
      label: "Newest First",
      value: (a, b) => b.id - a.id,
    },
    {
      key: "reviews",
      label: "Most Reviewed",
      value: (a, b) => b.review_count - a.review_count,
    },
  ];

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadRecentSearches();
      if (initialQuery || searchQuery) {
        searchProducts();
      }
    }, [])
  );

  const loadCategories = async (): Promise<void> => {
    try {
      // Mock categories - replace with actual API call
      const mockCategories: Category[] = [
        { id: 1, name: "Electronics", icon: "devices", product_count: 245 },
        { id: 2, name: "Clothing", icon: "checkroom", product_count: 189 },
        { id: 3, name: "Home & Garden", icon: "home", product_count: 156 },
        { id: 4, name: "Sports", icon: "sports-soccer", product_count: 98 },
        { id: 5, name: "Books", icon: "menu-book", product_count: 312 },
        { id: 6, name: "Health & Beauty", icon: "spa", product_count: 134 },
        {
          id: 7,
          name: "Automotive",
          icon: "directions-car",
          product_count: 67,
        },
        { id: 8, name: "Toys & Games", icon: "toys", product_count: 89 },
      ];

      setCategories(mockCategories);
    } catch (error: any) {
      logger.error("Error loading categories", error, {
        component: "ProductSearchScreen",
        action: "loadCategories",
      });
    }
  };

  const loadRecentSearches = async (): Promise<void> => {
    try {
      const searches = await AsyncStorage.getItem("recentSearches");
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error: any) {
      logger.error("Error loading recent searches", error, {
        component: "ProductSearchScreen",
        action: "loadRecentSearches",
      });
    }
  };

  const saveRecentSearch = async (query: string): Promise<void> => {
    if (!query.trim()) return;

    try {
      const updatedSearches = [
        query,
        ...recentSearches.filter((s) => s !== query),
      ].slice(0, 10);
      await AsyncStorage.setItem(
        "recentSearches",
        JSON.stringify(updatedSearches)
      );
      setRecentSearches(updatedSearches);
    } catch (error: any) {
      logger.error("Error saving recent search", error, {
        component: "ProductSearchScreen",
        action: "saveRecentSearch",
      });
    }
  };

  const searchProducts = async (): Promise<void> => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      await saveRecentSearch(searchQuery.trim());

      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock products - replace with actual API call
      const mockProducts: Product[] = [
        {
          id: 1,
          name: "Wireless Bluetooth Headphones",
          description:
            "Premium noise-cancelling wireless headphones with 30-hour battery life",
          price: 1299.99,
          currency: "ZAR",
          image_url: "https://via.placeholder.com/200",
          category_id: 1,
          category_name: "Electronics",
          brand: "TechAudio",
          rating: 4.8,
          review_count: 234,
          in_stock: true,
          discount_percentage: 15,
          tags: ["wireless", "bluetooth", "noise-cancelling"],
        },
        {
          id: 2,
          name: "Smart Fitness Watch",
          description:
            "Advanced fitness tracking with heart rate monitor and GPS",
          price: 2499.99,
          currency: "ZAR",
          category_id: 4,
          category_name: "Sports",
          brand: "FitTech",
          rating: 4.6,
          review_count: 189,
          in_stock: true,
          tags: ["fitness", "smartwatch", "gps"],
        },
        {
          id: 3,
          name: "Professional Camera Lens",
          description: "85mm f/1.4 portrait lens for professional photography",
          price: 8999.99,
          currency: "ZAR",
          category_id: 1,
          category_name: "Electronics",
          brand: "LensMaster",
          rating: 4.9,
          review_count: 67,
          in_stock: false,
          tags: ["camera", "lens", "photography"],
        },
        {
          id: 4,
          name: "Ergonomic Office Chair",
          description:
            "Comfortable ergonomic chair with lumbar support and adjustable height",
          price: 3499.99,
          currency: "ZAR",
          category_id: 3,
          category_name: "Home & Garden",
          brand: "ComfortSeat",
          rating: 4.7,
          review_count: 145,
          in_stock: true,
          discount_percentage: 20,
          tags: ["office", "chair", "ergonomic"],
        },
        {
          id: 5,
          name: "Gaming Mechanical Keyboard",
          description:
            "RGB backlit mechanical keyboard with Cherry MX switches",
          price: 1899.99,
          currency: "ZAR",
          category_id: 1,
          category_name: "Electronics",
          brand: "GamePro",
          rating: 4.5,
          review_count: 298,
          in_stock: true,
          tags: ["gaming", "keyboard", "mechanical"],
        },
      ];

      setProducts(mockProducts);

      // Extract unique brands for filtering
      const uniqueBrands = [...new Set(mockProducts.map((p) => p.brand))];
      setAvailableBrands(uniqueBrands);

      // Determine price range
      const prices = mockProducts.map((p) => p.price);
      const minPrice = Math.floor(Math.min(...prices) / 100) * 100;
      const maxPrice = Math.ceil(Math.max(...prices) / 100) * 100;
      setPriceRange({ min: minPrice, max: maxPrice });
      setTempPriceRange({ min: minPrice, max: maxPrice });

      // Update filters to reflect available range
      setFilters((prev) => ({
        ...prev,
        priceRange: { min: minPrice, max: maxPrice },
      }));
    } catch (error: any) {
      logger.error("Error searching products", error, {
        component: "ProductSearchScreen",
        action: "searchProducts",
        metadata: { query: searchQuery },
      });

      ErrorToast.show({
        title: "Search Error",
        message: "Failed to search products. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      // Category filter
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(product.category_id)
      ) {
        return false;
      }

      // Price range filter
      if (
        product.price < filters.priceRange.min ||
        product.price > filters.priceRange.max
      ) {
        return false;
      }

      // Brand filter
      if (
        filters.brands.length > 0 &&
        !filters.brands.includes(product.brand)
      ) {
        return false;
      }

      // Rating filter
      if (product.rating < filters.minRating) {
        return false;
      }

      // Stock filter
      if (filters.inStockOnly && !product.in_stock) {
        return false;
      }

      // Sale filter
      if (filters.onSale && !product.discount_percentage) {
        return false;
      }

      return true;
    });

    // Apply sorting
    const sortOption = sortOptions.find(
      (option) => option.key === selectedSort
    );
    if (sortOption) {
      filtered.sort(sortOption.value);
    }

    return filtered;
  }, [products, filters, selectedSort]);

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const clearFilters = (): void => {
    setFilters({
      categories: [],
      priceRange: { min: 0, max: 10000 },
      brands: [],
      minRating: 0,
      inStockOnly: false,
      onSale: false,
    });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) count++;
    if (filters.brands.length > 0) count++;
    if (filters.minRating > 0) count++;
    if (filters.inStockOnly) count++;
    if (filters.onSale) count++;
    return count;
  };

  const renderSearchBar = (): React.JSX.Element => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchProducts}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilterSort = (): React.JSX.Element => (
    <View style={styles.filterSortContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          getActiveFilterCount() > 0 && styles.activeFilterButton,
        ]}
        onPress={() => setShowFilters(true)}
      >
        <Icon
          name="tune"
          size={18}
          color={getActiveFilterCount() > 0 ? "#FFFFFF" : "#007AFF"}
        />
        <Text
          style={[
            styles.filterButtonText,
            getActiveFilterCount() > 0 && styles.activeFilterButtonText,
          ]}
        >
          Filter {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSort(true)}
      >
        <Icon name="sort" size={18} color="#007AFF" />
        <Text style={styles.sortButtonText}>Sort</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProductCard = ({
    item: product,
  }: {
    item: Product;
  }): React.JSX.Element => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() =>
        navigation.navigate("ProductDetail", { productId: product.id, product })
      }
    >
      <View style={styles.productImageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="image" size={40} color="#E0E0E0" />
          </View>
        )}
        {product.discount_percentage && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {product.discount_percentage}% OFF
            </Text>
          </View>
        )}
        {!product.in_stock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
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
                name={
                  star <= product.rating
                    ? "star"
                    : star <= product.rating + 0.5
                    ? "star-half"
                    : "star-border"
                }
                size={14}
                color="#FFD700"
              />
            ))}
          </View>
          <Text style={styles.ratingText}>
            {product.rating} ({product.review_count})
          </Text>
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

  const renderRecentSearches = (): React.JSX.Element => (
    <View style={styles.recentSearches}>
      <Text style={styles.sectionTitle}>Recent Searches</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recentSearches.map((search, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentSearchItem}
            onPress={() => {
              setSearchQuery(search);
              searchProducts();
            }}
          >
            <Icon name="history" size={16} color="#666" />
            <Text style={styles.recentSearchText}>{search}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCategories = (): React.JSX.Element => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>Browse Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => {
              setFilters((prev) => ({
                ...prev,
                categories: [category.id],
              }));
              searchProducts();
            }}
          >
            <View style={styles.categoryIcon}>
              <Icon name={category.icon} size={24} color="#007AFF" />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryCount}>
              {category.product_count} items
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFilterModal = (): React.JSX.Element => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categories</Text>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      categories: prev.categories.includes(category.id)
                        ? prev.categories.filter((id) => id !== category.id)
                        : [...prev.categories, category.id],
                    }));
                  }}
                >
                  <Icon
                    name={
                      filters.categories.includes(category.id)
                        ? "check-box"
                        : "check-box-outline-blank"
                    }
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.filterOptionText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceLabels}>
                  <Text style={styles.priceLabel}>R{tempPriceRange.min}</Text>
                  <Text style={styles.priceLabel}>R{tempPriceRange.max}</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={priceRange.min}
                    maximumValue={priceRange.max}
                    value={tempPriceRange.min}
                    onValueChange={(value) =>
                      setTempPriceRange((prev) => ({
                        ...prev,
                        min: Math.round(value),
                      }))
                    }
                    onSlidingComplete={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: {
                          ...prev.priceRange,
                          min: Math.round(value),
                        },
                      }))
                    }
                    minimumTrackTintColor="#007AFF"
                    maximumTrackTintColor="#E1E1E1"
                    thumbStyle={styles.sliderThumb}
                  />
                  <Slider
                    style={styles.slider}
                    minimumValue={priceRange.min}
                    maximumValue={priceRange.max}
                    value={tempPriceRange.max}
                    onValueChange={(value) =>
                      setTempPriceRange((prev) => ({
                        ...prev,
                        max: Math.round(value),
                      }))
                    }
                    onSlidingComplete={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: {
                          ...prev.priceRange,
                          max: Math.round(value),
                        },
                      }))
                    }
                    minimumTrackTintColor="#007AFF"
                    maximumTrackTintColor="#E1E1E1"
                    thumbStyle={styles.sliderThumb}
                  />
                </View>
              </View>
            </View>

            {/* Brands */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Brands</Text>
              {availableBrands.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      brands: prev.brands.includes(brand)
                        ? prev.brands.filter((b) => b !== brand)
                        : [...prev.brands, brand],
                    }));
                  }}
                >
                  <Icon
                    name={
                      filters.brands.includes(brand)
                        ? "check-box"
                        : "check-box-outline-blank"
                    }
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.filterOptionText}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rating Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              {[4, 3, 2, 1].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={styles.filterOption}
                  onPress={() =>
                    setFilters((prev) => ({
                      ...prev,
                      minRating: prev.minRating === rating ? 0 : rating,
                    }))
                  }
                >
                  <Icon
                    name={
                      filters.minRating === rating
                        ? "radio-button-checked"
                        : "radio-button-unchecked"
                    }
                    size={20}
                    color="#007AFF"
                  />
                  <View style={styles.ratingOption}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name="star"
                          size={14}
                          color={star <= rating ? "#FFD700" : "#E1E1E1"}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingText}>& Up</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stock Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Availability</Text>
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    inStockOnly: !prev.inStockOnly,
                  }))
                }
              >
                <Icon
                  name={
                    filters.inStockOnly
                      ? "check-box"
                      : "check-box-outline-blank"
                  }
                  size={20}
                  color="#007AFF"
                />
                <Text style={styles.filterOptionText}>In Stock Only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, onSale: !prev.onSale }))
                }
              >
                <Icon
                  name={
                    filters.onSale ? "check-box" : "check-box-outline-blank"
                  }
                  size={20}
                  color="#007AFF"
                />
                <Text style={styles.filterOptionText}>On Sale</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSortModal = (): React.JSX.Element => (
    <Modal
      visible={showSort}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSort(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sortModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSort(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.sortOptions}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortOption}
                onPress={() => {
                  setSelectedSort(option.key);
                  setShowSort(false);
                }}
              >
                <Icon
                  name={
                    selectedSort === option.key
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={20}
                  color="#007AFF"
                />
                <Text style={styles.sortOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Products</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      {renderSearchBar()}

      {searchQuery && !loading && (
        <>
          {/* Filter and Sort */}
          {renderFilterSort()}

          {/* Results */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredAndSortedProducts.length} results for "{searchQuery}"
            </Text>
          </View>
        </>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searchQuery && filteredAndSortedProducts.length > 0 ? (
        <FlatList
          data={filteredAndSortedProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          style={styles.productsList}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery && filteredAndSortedProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {recentSearches.length > 0 && renderRecentSearches()}
          {renderCategories()}
        </ScrollView>
      )}

      {renderFilterModal()}
      {renderSortModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  searchContainer: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  filterSortContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
    gap: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "white",
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    color: "#007AFF",
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "white",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "white",
    gap: 6,
  },
  sortButtonText: {
    color: "#007AFF",
    fontWeight: "500",
  },
  resultsHeader: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  productRow: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  productCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginVertical: 8,
    width: "48%",
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
    height: 140,
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
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
  productBrand: {
    fontSize: 12,
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
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
  },
  priceContainer: {
    alignItems: "flex-start",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  priceWithDiscount: {
    alignItems: "flex-start",
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF4444",
  },
  recentSearches: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    gap: 6,
  },
  recentSearchText: {
    fontSize: 14,
    color: "#666",
  },
  categoriesSection: {
    backgroundColor: "white",
    padding: 20,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 20,
    width: 80,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  sortModal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterContent: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  filterOptionText: {
    fontSize: 14,
    color: "#333",
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
  },
  clearFiltersText: {
    color: "#666",
    fontWeight: "600",
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  applyFiltersText: {
    color: "white",
    fontWeight: "600",
  },
  sortOptions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: "#333",
  },
  // Price Range Slider Styles
  priceRangeContainer: {
    paddingVertical: 8,
  },
  priceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  sliderContainer: {
    paddingHorizontal: 10,
  },
  slider: {
    width: "100%",
    height: 40,
    marginVertical: 4,
  },
  sliderThumb: {
    backgroundColor: "#007AFF",
    width: 20,
    height: 20,
  },
  ratingOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

export default ProductSearchScreen;
