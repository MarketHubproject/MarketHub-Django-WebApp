// Re-export all shared types from different modules

// API Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
  success: boolean;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
}

// Product Types
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  category: ProductCategory;
  brand: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isFeature: boolean;
  isFavorite?: boolean;
  tags: string[];
  specifications: Record<string, any>;
  ar_model_url?: string; // URL to 3D model for AR viewing
  // Subscription fields
  is_subscribable: boolean;
  subscription_frequency_options?: SubscriptionFrequency[];
  subscription_discount_percentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: number;
  children?: ProductCategory[];
  productCount: number;
}

// Subscription Types
export type SubscriptionFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly";

export interface Subscription {
  id: string;
  userId: string;
  productId: number;
  product: Product;
  quantity: number;
  frequency: SubscriptionFrequency;
  nextDelivery: string;
  status: SubscriptionStatus;
  totalDeliveries: number;
  createdAt: string;
  updatedAt: string;
  pausedUntil?: string;
  discountPercentage?: number;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type SubscriptionStatus = "active" | "paused" | "cancelled" | "pending";

export interface SubscriptionDelivery {
  id: string;
  subscriptionId: string;
  orderId?: string;
  scheduledDate: string;
  deliveredDate?: string;
  status: DeliveryStatus;
  quantity: number;
  price: number;
  skipped?: boolean;
  skipReason?: string;
  createdAt: string;
}

export type DeliveryStatus =
  | "scheduled"
  | "processing"
  | "shipped"
  | "delivered"
  | "skipped"
  | "failed";

// Cart Types
export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  subtotal: number;
  addedAt: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
  itemCount: number;
  updatedAt: string;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount?: number;
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: PaymentMethod;
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

// User & Auth Types (Re-export from stores)
export { User } from "../stores/authStore";

export interface Address {
  id: string;
  type: "home" | "work" | "other";
  name: string;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "apple_pay" | "google_pay";
  name: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingAddress?: Address;
}

// Favorites Types
export interface Favorite {
  id: string;
  product: Product;
  addedAt: string;
}

// Search Types
export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string[];
  rating?: number;
  inStock?: boolean;
  sortBy?: "price" | "rating" | "name" | "newest" | "popularity";
  sortOrder?: "asc" | "desc";
}

export interface SearchResult {
  products: Product[];
  totalCount: number;
  filters: SearchFilters;
  suggestions?: string[];
}

// App State Types (Re-export from stores)
export {
  AppPreferences,
  LoyaltyProgram,
  AppNotification,
} from "../stores/appStore";

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Products: undefined;
  Favorites: undefined;
  Cart: undefined;
  Profile: undefined;
};

export type ProductsStackParamList = {
  ProductsList: { category?: string; search?: string };
  ProductDetail: { productId: number };
  ProductSearch: undefined;
  ProductCategories: undefined;
};

export type CartStackParamList = {
  CartMain: undefined;
  Checkout: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  OrderHistory: undefined;
  OrderDetails: { orderId: string };
  EditProfile: undefined;
  ManageAddresses: undefined;
  AddAddress: { addressId?: string };
  ManagePaymentMethods: undefined;
  AddPaymentMethod: { paymentMethodId?: string };
  Subscriptions: undefined;
  SubscriptionDetails: { subscriptionId: string };
};

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  acceptTerms: boolean;
}

export interface AddressForm {
  type: "home" | "work" | "other";
  name: string;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface PaymentMethodForm {
  type: "card" | "paypal";
  name: string;
  cardNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  isDefault: boolean;
  billingAddress?: AddressForm;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  product: Product;
  score: number;
  reason: string;
  algorithm: string;
  context?: string;
}

export interface RecommendationSection {
  id: string;
  title: string;
  type:
    | "personal"
    | "trending"
    | "similar"
    | "recently_viewed"
    | "category_based";
  products: Recommendation[];
  metadata?: {
    category?: string;
    viewedProduct?: Product;
    algorithm?: string;
    [key: string]: any;
  };
}

export interface RecommendationsResponse {
  sections: RecommendationSection[];
  userId?: string;
  timestamp: string;
  fallbackUsed: boolean;
}

export interface RecommendationEvent {
  productId: number | string;
  userId?: string | number;
  eventType: "impression" | "click" | "add_to_cart" | "purchase";
  context: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// AR Types
export interface ARCapabilities {
  isARSupported: boolean;
  hasARCore: boolean; // Android
  hasARKit: boolean; // iOS
  hasWebXR: boolean;
}

export interface ARSession {
  sessionId: string;
  productId: number;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  viewType: "3d" | "ar";
  platform: "ios" | "android" | "web";
  interactions: number;
}

export interface AR3DModel {
  id: string;
  productId: number;
  modelUrl: string;
  format: "gltf" | "usdz" | "obj";
  thumbnailUrl?: string;
  fileSize: number; // in bytes
  metadata?: {
    polygonCount?: number;
    textureResolution?: string;
    animations?: string[];
  };
}

// Utility Types
export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch?: string;
}

// Component Props Types
export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

export interface ComponentWithTestId {
  testID?: string;
}

// Common component props
export type BaseComponentProps = ComponentWithChildren &
  ComponentWithClassName &
  ComponentWithTestId;

export default {};
