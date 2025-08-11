// Mock API Service for testing without backend connection
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock data
const mockProducts = [
  {
    id: 1,
    name: 'iPhone 13',
    price: 699,
    image: 'https://via.placeholder.com/300x300?text=iPhone+13',
    category: 'Electronics',
    description: 'Latest iPhone with amazing features',
  },
  {
    id: 2,
    name: 'MacBook Pro',
    price: 1299,
    image: 'https://via.placeholder.com/300x300?text=MacBook+Pro',
    category: 'Electronics',
    description: 'Professional laptop for developers',
  },
  {
    id: 3,
    name: 'Nike Air Max',
    price: 120,
    image: 'https://via.placeholder.com/300x300?text=Nike+Shoes',
    category: 'Fashion',
    description: 'Comfortable running shoes',
  },
  {
    id: 4,
    name: 'Study Lamp',
    price: 25,
    image: 'https://via.placeholder.com/300x300?text=Study+Lamp',
    category: 'Furniture',
    description: 'LED desk lamp for students',
  },
];

const mockCategories = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Fashion', slug: 'fashion' },
  { id: 3, name: 'Books', slug: 'books' },
  { id: 4, name: 'Furniture', slug: 'furniture' },
  { id: 5, name: 'Sports', slug: 'sports' },
  { id: 6, name: 'Health', slug: 'health' },
];

class MockApiService {
  // Helper to simulate network delay
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    await this.delay();
    
    if (email === 'test@example.com' && password === 'password') {
      const token = 'mock-auth-token-12345';
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userId', '1');
      
      return {
        token,
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
      };
    } else {
      throw new Error('Invalid credentials');
    }
  }

  async signup(userData: any): Promise<any> {
    await this.delay();
    
    const token = 'mock-auth-token-12345';
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userId', '1');
    
    return {
      token,
      user: {
        id: 1,
        email: userData.email,
        name: userData.name,
      },
    };
  }

  async logout(): Promise<void> {
    await this.delay(200);
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
  }

  // Products
  async getProducts(page: number = 1, category: string | null = null, search: string | null = null): Promise<any> {
    await this.delay();
    
    let products = [...mockProducts];
    
    // Filter by category
    if (category) {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    
    // Filter by search
    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return {
      results: products,
      count: products.length,
      next: null,
      previous: null,
    };
  }

  async getProduct(id: number | string): Promise<any> {
    await this.delay();
    
    const product = mockProducts.find(p => p.id === parseInt(id.toString()));
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  }

  async getFeaturedProducts(): Promise<any> {
    await this.delay();
    return {
      results: mockProducts.slice(0, 3), // Return first 3 as featured
    };
  }

  // Categories
  async getCategories(): Promise<any> {
    await this.delay();
    return {
      results: mockCategories,
    };
  }

  // Favorites
  async getFavorites(): Promise<any> {
    await this.delay();
    const favorites = await AsyncStorage.getItem('favorites');
    const favoriteIds = favorites ? JSON.parse(favorites) : [];
    
    const favoriteProducts = mockProducts.filter(p => favoriteIds.includes(p.id));
    
    return {
      results: favoriteProducts,
    };
  }

  async addToFavorites(productId: number | string): Promise<any> {
    await this.delay();
    
    const favorites = await AsyncStorage.getItem('favorites');
    const favoriteIds = favorites ? JSON.parse(favorites) : [];
    
    const id = parseInt(productId.toString());
    if (!favoriteIds.includes(id)) {
      favoriteIds.push(id);
      await AsyncStorage.setItem('favorites', JSON.stringify(favoriteIds));
    }
    
    return { success: true };
  }

  async removeFromFavorites(productId: number | string): Promise<void> {
    await this.delay();
    
    const favorites = await AsyncStorage.getItem('favorites');
    const favoriteIds = favorites ? JSON.parse(favorites) : [];
    
    const id = parseInt(productId.toString());
    const updatedFavorites = favoriteIds.filter((fId: number) => fId !== id);
    
    await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  }

  // Cart
  async getCart(): Promise<any> {
    await this.delay();
    
    const cart = await AsyncStorage.getItem('cart');
    const cartItems = cart ? JSON.parse(cart) : [];
    
    const cartWithProducts = cartItems.map((item: any) => {
      const product = mockProducts.find(p => p.id === item.productId);
      return {
        id: item.id,
        product,
        quantity: item.quantity,
      };
    });
    
    return {
      results: cartWithProducts,
    };
  }

  async addToCart(productId: number | string, quantity: number = 1): Promise<any> {
    await this.delay();
    
    const cart = await AsyncStorage.getItem('cart');
    const cartItems = cart ? JSON.parse(cart) : [];
    
    const id = parseInt(productId.toString());
    const existingItem = cartItems.find((item: any) => item.productId === id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cartItems.push({
        id: Date.now(),
        productId: id,
        quantity,
      });
    }
    
    await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
    return { success: true };
  }

  async updateCartItem(itemId: number | string, quantity: number): Promise<any> {
    await this.delay();
    
    const cart = await AsyncStorage.getItem('cart');
    const cartItems = cart ? JSON.parse(cart) : [];
    
    const id = parseInt(itemId.toString());
    const item = cartItems.find((item: any) => item.id === id);
    
    if (item) {
      item.quantity = quantity;
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
    }
    
    return { success: true };
  }

  async removeFromCart(itemId: number | string): Promise<void> {
    await this.delay();
    
    const cart = await AsyncStorage.getItem('cart');
    const cartItems = cart ? JSON.parse(cart) : [];
    
    const id = parseInt(itemId.toString());
    const updatedCart = cartItems.filter((item: any) => item.id !== id);
    
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
  }

  // User Profile
  async getUserProfile(): Promise<any> {
    await this.delay();
    
    const profile = await AsyncStorage.getItem('userProfile');
    if (profile) {
      return JSON.parse(profile);
    }
    
    return {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
    };
  }

  async updateUserProfile(profileData: any): Promise<any> {
    await this.delay();
    
    const currentProfile = await this.getUserProfile();
    const updatedProfile = { ...currentProfile, ...profileData };
    
    await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    return updatedProfile;
  }

  // Orders
  async getOrders(): Promise<any> {
    await this.delay();
    return {
      results: [],
    };
  }

  async createOrder(orderData: any): Promise<any> {
    await this.delay();
    
    // Clear cart after creating order
    await AsyncStorage.removeItem('cart');
    
    return {
      id: Date.now(),
      status: 'pending',
      ...orderData,
    };
  }

  // Utility methods
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  }

  async getCurrentUserId(): Promise<string | null> {
    return await AsyncStorage.getItem('userId');
  }
}

export default new MockApiService();
