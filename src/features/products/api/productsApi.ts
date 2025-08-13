import ApiService from "../../../services";
import {
  Product,
  ProductCategory,
  SearchFilters,
  PaginatedResponse,
} from "../../../shared/types";

// Products API functions
export const productsApi = {
  // Get paginated products with optional filters
  getProducts: async (
    page: number = 1,
    filters?: SearchFilters
  ): Promise<PaginatedResponse<Product>> => {
    const params: Record<string, any> = { page };

    if (filters) {
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;
      if (filters.brand) params.brand = filters.brand.join(",");
      if (filters.rating) params.min_rating = filters.rating;
      if (filters.inStock) params.in_stock = filters.inStock;
      if (filters.sortBy) params.sort_by = filters.sortBy;
      if (filters.sortOrder) params.sort_order = filters.sortOrder;
    }

    const response = await ApiService.getProducts(
      page,
      params.category,
      params.search
    );

    // Transform the response to match our PaginatedResponse interface
    return {
      data: response.results || response,
      pagination: {
        page: response.current_page || page,
        limit: response.page_size || 20,
        total:
          response.count || (Array.isArray(response) ? response.length : 0),
        totalPages: response.num_pages || 1,
        hasNext: !!response.next,
        hasPrev: !!response.previous,
      },
    };
  },

  // Get single product by ID
  getProduct: async (id: number | string): Promise<Product> => {
    const response = await ApiService.getProduct(id);
    return response;
  },

  // Get featured products
  getFeaturedProducts: async (): Promise<Product[]> => {
    const response = await ApiService.getFeaturedProducts();
    return response.results || response;
  },

  // Search products
  searchProducts: async (
    query: string,
    page: number = 1,
    filters?: SearchFilters
  ): Promise<PaginatedResponse<Product>> => {
    const params: Record<string, any> = { page, search: query };

    if (filters) {
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;
      if (filters.brand) params.brand = filters.brand.join(",");
      if (filters.rating) params.min_rating = filters.rating;
      if (filters.inStock) params.in_stock = filters.inStock;
      if (filters.sortBy) params.sort_by = filters.sortBy;
      if (filters.sortOrder) params.sort_order = filters.sortOrder;
    }

    const response = await ApiService.getProducts(page, params.category, query);

    return {
      data: response.results || response,
      pagination: {
        page: response.current_page || page,
        limit: response.page_size || 20,
        total:
          response.count || (Array.isArray(response) ? response.length : 0),
        totalPages: response.num_pages || 1,
        hasNext: !!response.next,
        hasPrev: !!response.previous,
      },
    };
  },

  // Get product categories
  getCategories: async (): Promise<ProductCategory[]> => {
    const response = await ApiService.getCategories();
    return response.results || response;
  },

  // Get products by category
  getProductsByCategory: async (
    categoryId: string | number,
    page: number = 1
  ): Promise<PaginatedResponse<Product>> => {
    const response = await ApiService.getProducts(page, categoryId.toString());

    return {
      data: response.results || response,
      pagination: {
        page: response.current_page || page,
        limit: response.page_size || 20,
        total:
          response.count || (Array.isArray(response) ? response.length : 0),
        totalPages: response.num_pages || 1,
        hasNext: !!response.next,
        hasPrev: !!response.previous,
      },
    };
  },
};

export default productsApi;
