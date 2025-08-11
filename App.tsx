/**
 * MarketHub Mobile App
 * React Native e-commerce client for MarketHub Django backend
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ApiService from './src/services/api';

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const authenticated = await ApiService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // You can create a splash screen component here
    return <></>;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator isAuthenticated={isAuthenticated} />
    </>
  );
}

const styles = StyleSheet.create({
  // Add any global styles here
});

export default App;
