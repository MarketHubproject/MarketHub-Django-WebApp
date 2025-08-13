import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import {
  queryKeys,
  mutationKeys,
  invalidateQueries,
  queryClient,
} from "../../../shared/api/queryClient";
import { productsApi } from "../api/productsApi";
import {
  Product,
  ProductCategory,
  SearchFilters,
  PaginatedResponse,
} from "../../../shared/types";
import { logger } from "../../../utils";

// Hook for fetching paginated products
export const useProducts = (
  page: number = 1,
  filters?: SearchFilters,
  options?: UseQueryOptions<PaginatedResponse<Product>>
) => {
  return useQuery({
    queryKey: queryKeys.products.list({ page, ...filters }),
    queryFn: () => productsApi.getProducts(page, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

// Hook for infinite scroll products
export const useInfiniteProducts = (
  filters?: SearchFilters,
  options?: UseInfiniteQueryOptions<PaginatedResponse<Product>>
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list(filters || {}),
    queryFn: ({ pageParam = 1 }) => productsApi.getProducts(pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pagination.hasNext ? allPages.length + 1 : undefined;
    },
    getPreviousPageParam: (firstPage, allPages) => {
      return firstPage.pagination.hasPrev
        ? Math.max(1, allPages.length - 1)
        : undefined;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
};

// Hook for fetching single product
export const useProduct = (
  id: number | string,
  options?: UseQueryOptions<Product>
) => {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.getProduct(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes for product details
    gcTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  });
};

// Hook for fetching featured products
export const useFeaturedProducts = (options?: UseQueryOptions<Product[]>) => {
  return useQuery({
    queryKey: queryKeys.products.featured(),
    queryFn: productsApi.getFeaturedProducts,
    staleTime: 1000 * 60 * 15, // 15 minutes for featured products
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  });
};

// Hook for searching products
export const useProductSearch = (
  query: string,
  page: number = 1,
  filters?: SearchFilters,
  options?: UseQueryOptions<PaginatedResponse<Product>>
) => {
  return useQuery({
    queryKey: queryKeys.products.search(query),
    queryFn: () => productsApi.searchProducts(query, page, filters),
    enabled: !!query && query.length >= 2, // Only search if query has at least 2 characters
    staleTime: 1000 * 60 * 2, // 2 minutes for search results
    gcTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

// Hook for infinite scroll search results
export const useInfiniteProductSearch = (
  query: string,
  filters?: SearchFilters,
  options?: UseInfiniteQueryOptions<PaginatedResponse<Product>>
) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.products.search(query), filters],
    queryFn: ({ pageParam = 1 }) =>
      productsApi.searchProducts(query, pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pagination.hasNext ? allPages.length + 1 : undefined;
    },
    getPreviousPageParam: (firstPage, allPages) => {
      return firstPage.pagination.hasPrev
        ? Math.max(1, allPages.length - 1)
        : undefined;
    },
    enabled: !!query && query.length >= 2,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    ...options,
  });
};

// Hook for fetching categories
export const useProductCategories = (
  options?: UseQueryOptions<ProductCategory[]>
) => {
  return useQuery({
    queryKey: queryKeys.products.categories(),
    queryFn: productsApi.getCategories,
    staleTime: 1000 * 60 * 60, // 1 hour for categories (they don't change often)
    gcTime: 1000 * 60 * 120, // 2 hours
    ...options,
  });
};

// Hook for fetching products by category
export const useProductsByCategory = (
  categoryId: string | number,
  page: number = 1,
  options?: UseQueryOptions<PaginatedResponse<Product>>
) => {
  return useQuery({
    queryKey: queryKeys.products.list({
      category: categoryId.toString(),
      page,
    }),
    queryFn: () => productsApi.getProductsByCategory(categoryId, page),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
};

// Hook for infinite scroll products by category
export const useInfiniteProductsByCategory = (
  categoryId: string | number,
  options?: UseInfiniteQueryOptions<PaginatedResponse<Product>>
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list({ category: categoryId.toString() }),
    queryFn: ({ pageParam = 1 }) =>
      productsApi.getProductsByCategory(categoryId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pagination.hasNext ? allPages.length + 1 : undefined;
    },
    getPreviousPageParam: (firstPage, allPages) => {
      return firstPage.pagination.hasPrev
        ? Math.max(1, allPages.length - 1)
        : undefined;
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
};

// Prefetch product details (useful for product cards on hover/focus)
export const usePrefetchProduct = () => {
  return (id: number | string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(id),
      queryFn: () => productsApi.getProduct(id),
      staleTime: 1000 * 60 * 5,
    });
  };
};

// Utility hook to invalidate product queries
export const useInvalidateProducts = () => {
  return () => {
    invalidateQueries.products();
  };
};

// Custom hook for complex product filtering logic
export const useProductFilters = () => {
  const applyFilters = (filters: SearchFilters) => {
    // This can be extended to handle complex filter logic
    logger.info("Applying product filters", {
      component: "useProductFilters",
      action: "applyFilters",
      metadata: { filters },
    });

    return filters;
  };

  const clearFilters = (): SearchFilters => {
    return {};
  };

  const buildFilterQuery = (filters: SearchFilters): string => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          params.append(key, value.join(","));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return params.toString();
  };

  return {
    applyFilters,
    clearFilters,
    buildFilterQuery,
  };
};
