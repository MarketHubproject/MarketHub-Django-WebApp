import { config } from "../../config/environment";

export const API_ENDPOINTS = {
  // Base URL
  BASE_URL: config.API_BASE_URL,

  // Auth
  AUTH: {
    LOGIN: "/auth/login/",
    REGISTER: "/auth/register/",
    LOGOUT: "/auth/logout/",
    REFRESH: "/auth/refresh/",
  },

  // Products
  PRODUCTS: "/products/",
  PRODUCT_DETAIL: (id: number | string) => `/products/${id}/`,
  FEATURED_PRODUCTS: "/products/featured/",

  // Categories
  CATEGORIES: "/categories/",

  // Cart
  CART: "/cart/",
  CART_ITEM: (id: number | string) => `/cart/${id}/`,

  // Favorites
  FAVORITES: "/favorites/",
  FAVORITE_ITEM: (id: number | string) => `/favorites/${id}/`,

  // Profile
  PROFILE: "/profile/",

  // Orders
  ORDERS: "/orders/",
  ORDER_DETAIL: (id: number | string) => `/orders/${id}/`,

  // Recommendations
  RECOMMENDATIONS: "/api/v1/recommendations/",
  RECOMMENDATION_EVENTS: "/api/v1/recommendations/events/",

  // Rewards
  REWARDS: {
    BALANCE: "/rewards/balance/",
    LOYALTY_STATUS: "/rewards/loyalty-status/",
    REDEEM: "/rewards/redeem/",
    VALIDATE_VOUCHER: "/rewards/validate-voucher/",
    CALCULATE_POINTS: "/rewards/calculate-points/",
  },

  // Search
  SEARCH: "/search/",

  // Analytics
  ANALYTICS: {
    EVENTS: "/analytics/events/",
    PRODUCT_VIEW: "/analytics/product-view/",
    SCREEN_VIEW: "/analytics/screen-view/",
  },
} as const;

export default API_ENDPOINTS;
