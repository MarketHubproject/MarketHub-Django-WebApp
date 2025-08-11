import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Type definitions
type AppNavigatorProps = {
  isAuthenticated: boolean;
};

// Import screens
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import {
  ProductsScreen,
  ProductDetailScreen,
  FavoritesScreen,
  CartScreen,
  ProfileScreen,
  SignupScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Products Stack Navigator
const ProductsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ProductsList" 
      component={ProductsScreen} 
      options={{ title: 'Products' }}
    />
    <Stack.Screen 
      name="ProductDetail" 
      component={ProductDetailScreen} 
      options={{ title: 'Product Details' }}
    />
  </Stack.Navigator>
);

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Products':
            iconName = 'shopping-bag';
            break;
          case 'Favorites':
            iconName = focused ? 'favorite' : 'favorite-border';
            break;
          case 'Cart':
            iconName = 'shopping-cart';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'home';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Products" component={ProductsStack} />
    <Tab.Screen name="Favorites" component={FavoritesScreen} />
    <Tab.Screen name="Cart" component={CartScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Main App Navigator
const AppNavigator = ({ isAuthenticated }: AppNavigatorProps): React.JSX.Element => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
