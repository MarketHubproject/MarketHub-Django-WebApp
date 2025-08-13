import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ApiService from "../services";
import i18n from "../services/i18n";
import { getProductImageUrl } from "../config/environment";
import { SmartImage } from "../components";
import { logger, ErrorToast } from "../utils";
const { width } = Dimensions.get("window");
const numColumns = 2;
const productWidth = (width - 60) / numColumns; // 60 = padding + margin

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  category: string;
  description: string;
  stock: number;
  rating?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const ProductsScreen = ({ navigation, route }: any): React.JSX.Element => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("name"); // name, price_low, price_high, newest
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Get initial category from navigation params
  const initialCategory = route?.params?.category;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, selectedCategory, sortBy]);

  const loadInitialData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        ApiService.getProducts(1, initialCategory),
        ApiService.getCategories(),
      ]);

      const productsList = productsResponse.results || productsResponse;
      const categoriesList = categoriesResponse.results || categoriesResponse;

      setProducts(productsList);
      setCategories([
        { id: 0, name: i18n.t("products.allCategories"), slug: "" },
        ...categoriesList,
      ]);
      setHasMore(productsResponse.next ? true : false);
    } catch (error: any) {
      logger.error("Error loading products", error, {
        component: "ProductsScreen",
        action: "loadInitialData",
        metadata: {
          initialCategory,
          productsCount: products.length,
          categoriesCount: categories.length,
        },
      });

      // Show error toast instead of alert
      if (error?.title && error?.message) {
        // This is already an ApiError from our service
      } else {
        ErrorToast.show({
          title: i18n.t("common.error"),
          message: i18n.t("errors.loadingError"),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProducts = async (): Promise<void> => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const response = await ApiService.getProducts(
        page + 1,
        selectedCategory,
        searchQuery
      );
      const newProducts = response.results || response;

      setProducts((prev) => [...prev, ...newProducts]);
      setPage((prev) => prev + 1);
      setHasMore(response.next ? true : false);
    } catch (error: any) {
      logger.error("Error loading more products", error, {
        component: "ProductsScreen",
        action: "loadMoreProducts",
        metadata: {
          page,
          selectedCategory,
          searchQuery,
          productsCount: products.length,
        },
      });

      // Show error toast for pagination errors
      ErrorToast.show({
        title: i18n.t("common.error"),
        message: i18n.t("errors.loadingError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (): void => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "") {
      filtered = filtered.filter((product) =>
        product.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case "price_low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => b.id - a.id);
        break;
      case "name":
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleSearch = (query: string): void => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (categorySlug: string): void => {
    setSelectedCategory(categorySlug);
    setShowFilters(false);
    // Reset pagination when changing category
    setPage(1);
    setHasMore(true);
  };

  const handleSortSelect = (sortOption: string): void => {
    setSortBy(sortOption);
    setShowFilters(false);
  };

  const renderProductCard = ({
    item,
  }: {
    item: Product;
  }): React.JSX.Element => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() =>
        navigation.navigate("ProductDetail", { productId: item.id })
      }
    >
      <SmartImage
        source={{
          uri: getProductImageUrl(item),
        }}
        style={styles.productImage}
        resizeMode="cover"
        fallbackText={item.name}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>R{item.price.toFixed(2)}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        {item.stock <= 5 && item.stock > 0 && (
          <Text style={styles.lowStockText}>
            {i18n.t("products.onlyXLeft", { count: item.stock })}
          </Text>
        )}
        {item.stock === 0 && (
          <Text style={styles.outOfStockText}>
            {i18n.t("products.outOfStock")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = (): React.JSX.Element => (
    <View style={styles.header}>
      {/* Quick Action Buttons */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => navigation.navigate("ProductCategories")}
        >
          <Icon name="category" size={18} color="#007AFF" />
          <Text style={styles.categoryButtonText}>Shop by Category</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate("ProductSearch")}
        >
          <Icon name="search" size={18} color="#007AFF" />
          <Text style={styles.searchButtonText}>Advanced Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t("products.searchPlaceholder")}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Icon name="filter-list" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>
            {i18n.t("products.filters")}
          </Text>
        </TouchableOpacity>

        <Text style={styles.resultsCount}>
          {i18n.t("products.productCount", { count: filteredProducts.length })}
        </Text>
      </View>
    </View>
  );

  const renderFiltersModal = (): React.JSX.Element => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {i18n.t("products.filtersAndSort")}
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>
              {i18n.t("products.categories")}
            </Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedCategory === item.slug &&
                      styles.selectedFilterOption,
                  ]}
                  onPress={() => handleCategorySelect(item.slug)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedCategory === item.slug &&
                        styles.selectedFilterOptionText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedCategory === item.slug && (
                    <Icon name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>
              {i18n.t("products.sortBy")}
            </Text>
            {[
              { value: "name", label: i18n.t("products.nameAZ") },
              { value: "price_low", label: i18n.t("products.priceLowHigh") },
              { value: "price_high", label: i18n.t("products.priceHighLow") },
              { value: "newest", label: i18n.t("products.newestFirst") },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  sortBy === option.value && styles.selectedFilterOption,
                ]}
                onPress={() => handleSortSelect(option.value)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    sortBy === option.value && styles.selectedFilterOptionText,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Icon name="check" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersButtonText}>
              {i18n.t("products.applyFilters")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {i18n.t("products.loadingProducts")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() =>
          loading && products.length > 0 ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {i18n.t("products.noProductsFound")}
            </Text>
            <Text style={styles.emptySubtext}>
              {i18n.t("products.adjustSearchFilters")}
            </Text>
          </View>
        )}
      />

      {renderFiltersModal()}
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F4",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F1F3F4",
    borderRadius: 6,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    width: productWidth,
    marginBottom: 16,
    marginRight: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  lowStockText: {
    fontSize: 11,
    color: "#FF8C00",
    fontWeight: "500",
  },
  outOfStockText: {
    fontSize: 11,
    color: "#FF4444",
    fontWeight: "500",
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007AFF",
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 15,
    color: "#333",
  },
  selectedFilterOptionText: {
    color: "#007AFF",
    fontWeight: "500",
  },
  applyFiltersButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  applyFiltersButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Quick Actions Styles
  quickActionsRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    justifyContent: "center",
  },
  categoryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    justifyContent: "center",
  },
  searchButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
});

export default ProductsScreen;
