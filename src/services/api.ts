import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure your Django backend URL
const BASE_URL = 'http://localhost:8000/api'; // Update this for production

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    });

    // Response interceptor to handle common errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
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
  async login(email, password) {
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

  async signup(userData) {
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

  async logout() {
    try {
      await this.api.post('/auth/logout/');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
    }
  }

  // Products
  async getProducts(page = 1, category = null, search = null) {
    try {
      const params = { page };
      if (category) params.category = category;
      if (search) params.search = search;

      const response = await this.api.get('/products/', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProduct(id) {
    try {
      const response = await this.api.get(`/products/${id}/`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getFeaturedProducts() {
    try {
      const response = await this.api.get('/products/featured/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Categories
  async getCategories() {
    try {
      const response = await this.api.get('/categories/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Favorites
  async getFavorites() {
    try {
      const response = await this.api.get('/favorites/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addToFavorites(productId) {
    try {
      const response = await this.api.post('/favorites/', {
        product: productId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromFavorites(productId) {
    try {
      await this.api.delete(`/favorites/${productId}/`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Cart
  async getCart() {
    try {
      const response = await this.api.get('/cart/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addToCart(productId, quantity = 1) {
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

  async updateCartItem(itemId, quantity) {
    try {
      const response = await this.api.patch(`/cart/${itemId}/`, {
        quantity,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromCart(itemId) {
    try {
      await this.api.delete(`/cart/${itemId}/`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User Profile
  async getUserProfile() {
    try {
      const response = await this.api.get('/profile/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUserProfile(profileData) {
    try {
      const response = await this.api.patch('/profile/', profileData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Orders
  async getOrders() {
    try {
      const response = await this.api.get('/orders/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createOrder(orderData) {
    try {
      const response = await this.api.post('/orders/', orderData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 
                     error.response.data?.detail || 
                     `Server error: ${error.response.status}`;
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred.');
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
