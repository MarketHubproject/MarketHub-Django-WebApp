import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/environment';
import { ApiError, logger, ErrorToast } from '../utils';
import i18n from './i18n';

// Use environment-based configuration

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.API_BASE_URL,
      timeout: config.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    });

    // Response interceptor to handle common errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          // You might want to redirect to login here
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    try {
      const response = await this.api.post('/auth/login/', {
        email,
        password,
      });
      
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userId', response.data.user.id.toString());
      }
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signup(userData: any): Promise<any> {
    try {
      const response = await this.api.post('/auth/register/', userData);
      
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userId', response.data.user.id.toString());
      }
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout/');
    } catch (error) {
      // Continue with logout even if API call fails
      logger.warn('Logout API call failed', error, {
        component: 'ApiService',
        action: 'logout'
      });
    } finally {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
    }
  }

  // Products
  async getProducts(page: number = 1, category: string | null = null, search: string | null = null): Promise<any> {
    try {
      const params: any = { page };
      if (category) params.category = category;
      if (search) params.search = search;

      const response = await this.api.get('/products/', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProduct(id: number | string): Promise<any> {
    try {
      const response = await this.api.get(`/products/${id}/`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getFeaturedProducts(): Promise<any> {
    try {
      const response = await this.api.get('/products/featured/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Categories
  async getCategories(): Promise<any> {
    try {
      const response = await this.api.get('/categories/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Favorites
  async getFavorites(): Promise<any> {
    try {
      const response = await this.api.get('/favorites/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addToFavorites(productId: number | string): Promise<any> {
    try {
      const response = await this.api.post('/favorites/', {
        product: productId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromFavorites(productId: number | string): Promise<void> {
    try {
      await this.api.delete(`/favorites/${productId}/`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Cart
  async getCart(): Promise<any> {
    try {
      const response = await this.api.get('/cart/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addToCart(productId: number | string, quantity: number = 1): Promise<any> {
    try {
      const response = await this.api.post('/cart/', {
        product: productId,
        quantity,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCartItem(itemId: number | string, quantity: number): Promise<any> {
    try {
      const response = await this.api.patch(`/cart/${itemId}/`, {
        quantity,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromCart(itemId: number | string): Promise<void> {
    try {
      await this.api.delete(`/cart/${itemId}/`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User Profile
  async getUserProfile(): Promise<any> {
    try {
      const response = await this.api.get('/profile/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUserProfile(profileData: any): Promise<any> {
    try {
      const response = await this.api.patch('/profile/', profileData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Orders
  async getOrders(): Promise<any> {
    try {
      const response = await this.api.get('/orders/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createOrder(orderData: any): Promise<any> {
    try {
      const response = await this.api.post('/orders/', orderData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler - returns consistent ApiError objects and shows Toast for network errors
  private handleError(error: any): ApiError {
    // Extract request details for logging
    const url = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      let title = 'Server Error';
      let message = data?.message || data?.detail || 'Something went wrong on the server';
      
      // Customize error messages based on status codes
      switch (status) {
        case 400:
          title = 'Invalid Request';
          if (data?.email) {
            message = 'Please check your email address';
          } else if (data?.password) {
            message = 'Please check your password';
          } else {
            message = data?.message || data?.detail || 'Please check your input and try again';
          }
          break;
        case 401:
          title = 'Authentication Failed';
          message = 'Invalid email or password';
          break;
        case 403:
          title = 'Access Denied';
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          title = 'Not Found';
          message = 'The requested resource was not found';
          break;
        case 422:
          title = 'Validation Error';
          message = data?.message || data?.detail || 'Please check your input';
          break;
        case 500:
          title = 'Server Error';
          message = 'Something went wrong on our end. Please try again later';
          break;
        default:
          title = 'Server Error';
          message = data?.message || data?.detail || `Server error (${status})`;
      }
      
      // Log API error using centralized logger
      logger.apiError(method, url, status, error, {
        component: 'ApiService',
        metadata: { responseData: data }
      });
      
      return { title, message };
    } else if (error.request) {
      // Network error - show Toast with translated message
      const networkErrorMessage = i18n.t('errors.networkError');
      
      // Show Toast notification for network errors
      ErrorToast.show({
        title: i18n.t('common.error'),
        message: networkErrorMessage
      });
      
      // Log network error
      logger.networkError(`Network request failed: ${method} ${url}`, error, {
        component: 'ApiService',
        metadata: {
          timeout: error.code === 'ECONNABORTED',
          url,
          method
        }
      });
      
      return {
        title: 'Network Error',
        message: networkErrorMessage
      };
    } else {
      // Other error
      const unexpectedMessage = error.message || 'An unexpected error occurred';
      
      // Log unexpected error
      logger.error(`Unexpected API error: ${method} ${url}`, error, {
        component: 'ApiService',
        action: 'handleError',
        metadata: { url, method }
      });
      
      return {
        title: 'Unexpected Error',
        message: unexpectedMessage
      };
    }
  }

  // Utility methods
  async isAuthenticated() {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  }

  async getCurrentUserId() {
    return await AsyncStorage.getItem('userId');
  }
}

export default new ApiService();
