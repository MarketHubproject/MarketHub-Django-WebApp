import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import actual screens
import ProductsScreenComponent from './ProductsScreen';

// Basic placeholder component for screens
const PlaceholderScreen: React.FC<{
  title: string;
  icon: string;
  navigation?: any;
}> = ({ title, icon, navigation }) => (
  <View style={styles.container}>
    <Icon name={icon} size={60} color="#007AFF" />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Coming Soon</Text>
    <Text style={styles.description}>
      This screen is under development.{'\n'}
      Check back later for updates!
    </Text>
    
    {navigation && (
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Export the actual ProductsScreen
export const ProductsScreen = ProductsScreenComponent;

export const ProductDetailScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen title="Product Details" icon="info" navigation={navigation} />
);

export const FavoritesScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen title="Favorites" icon="favorite" navigation={navigation} />
);

export const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen title="Cart" icon="shopping-cart" navigation={navigation} />
);

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen title="Profile" icon="person" navigation={navigation} />
);

export const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <View style={styles.container}>
    <Icon name="person-add" size={60} color="#007AFF" />
    <Text style={styles.title}>Sign Up</Text>
    <Text style={styles.subtitle}>Create your account</Text>
    
    <TouchableOpacity 
      style={styles.backButton}
      onPress={() => navigation.goBack()}
    >
      <Text style={styles.backButtonText}>Back to Login</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
