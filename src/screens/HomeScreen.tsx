import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services';
import i18n from '../services/i18n';
import { getProductImageUrl } from '../config/environment';
import { SmartImage } from '../components';
import { logger, ErrorToast } from '../utils';

const { width } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  category: string;
  description: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const HomeScreen = ({ navigation }: any): React.JSX.Element => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Load featured products and categories in parallel
      const [productsResponse, categoriesResponse] = await Promise.all([
        ApiService.getFeaturedProducts(),
        ApiService.getCategories(),
      ]);
      
      setFeaturedProducts(productsResponse.results || productsResponse);
      setCategories(categoriesResponse.results || categoriesResponse);
    } catch (error: any) {
      // Log error using centralized logger
      logger.error('Error loading home data', error, {
        component: 'HomeScreen',
        action: 'loadHomeData',
        metadata: {
          featuredProductsCount: featuredProducts.length,
          categoriesCount: categories.length,
        }
      });
      
      // Check if it's a network error and show Toast if not already shown
      // (The API service already shows Toast for network errors, but for non-network errors we show a generic one)
      if (error?.title && error?.message) {
        // This is already an ApiError from our service, no need to show Toast again
        // as it was already handled by the API service
      } else {
        // Show a generic error toast for unexpected errors
        ErrorToast.show({
          title: i18n.t('common.error'),
          message: i18n.t('errors.loadingError')
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderProductCard = ({ item }: { item: Product }): React.JSX.Element => {
    // Guard against undefined item data
    if (!item) {
      return <View style={styles.productCard} />;
    }

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => navigation.navigate('Products', { 
          screen: 'ProductDetail', 
          params: { productId: item.id } 
        })}
      >
        <SmartImage 
          source={{ 
            uri: getProductImageUrl(item) 
          }} 
          style={styles.productImage}
          resizeMode="cover"
          fallbackText={item.name}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name || ''}</Text>
          <Text style={styles.productPrice}>${item.price || '0'}</Text>
          <Text style={styles.productCategory}>{item.category || ''}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryCard = ({ item }: { item: Category }): React.JSX.Element => {
    // Guard against undefined item data
    if (!item) {
      return <View style={styles.categoryCard} />;
    }

    return (
      <TouchableOpacity 
        style={styles.categoryCard}
        onPress={() => navigation.navigate('Products', { 
          screen: 'ProductsList',
          params: { category: item.slug }
        })}
      >
        <Icon name="category" size={32} color="#007AFF" />
        <Text style={styles.categoryName}>{item.name || ''}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('home.marketHub')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Icon name="shopping-cart" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>{i18n.t('home.welcomeTitle')}</Text>
        <Text style={styles.welcomeSubtitle}>
          {i18n.t('home.welcomeSubtitle')}
        </Text>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('home.shopByCategory')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Products')}>
            <Text style={styles.seeAllText}>{i18n.t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={categories.slice(0, 6)} // Show first 6 categories
          renderItem={renderCategoryCard}
          keyExtractor={(item, index) => item?.id?.toString() ?? String(index)}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.categoriesGrid}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{i18n.t('products.noProductsFound')}</Text>
            </View>
          }
        />
      </View>

      {/* Featured Products Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('home.featuredProducts')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Products')}>
            <Text style={styles.seeAllText}>{i18n.t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={featuredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item, index) => item?.id?.toString() ?? String(index)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{i18n.t('products.noProductsFound')}</Text>
            </View>
          }
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('home.quickActions')}</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Favorites')}
          >
            <Icon name="favorite" size={24} color="#FF6B6B" />
            <Text style={styles.quickActionText}>{i18n.t('navigation.favorites')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person" size={24} color="#4ECDC4" />
            <Text style={styles.quickActionText}>{i18n.t('navigation.profile')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Products')}
          >
            <Icon name="search" size={24} color="#45B7D1" />
            <Text style={styles.quickActionText}>{i18n.t('common.search')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  categoriesGrid: {
    alignItems: 'center',
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 5,
    marginVertical: 8,
    paddingVertical: 20,
    borderRadius: 12,
    minHeight: 80,
  },
  categoryName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  productsContainer: {
    paddingLeft: 0,
  },
  productCard: {
    width: width * 0.4,
    marginRight: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 15,
  },
  quickActionText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;
