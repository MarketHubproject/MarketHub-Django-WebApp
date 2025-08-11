import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import actual screens
import ProductsScreenComponent from './ProductsScreen';
import ProductDetailScreenComponent from './ProductDetailScreen';
import CartScreenComponent from './CartScreen';
import SignupScreenComponent from './SignupScreen';
import FavoritesScreenComponent from './FavoritesScreen';
import ProfileScreenComponent from './ProfileScreen';

// Export all actual screens
export const ProductsScreen = ProductsScreenComponent;
export const ProductDetailScreen = ProductDetailScreenComponent;
export const CartScreen = CartScreenComponent;
export const SignupScreen = SignupScreenComponent;
export const FavoritesScreen = FavoritesScreenComponent;
export const ProfileScreen = ProfileScreenComponent;

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
