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
  AppState,
} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ApiService from './src/services';
import { I18nProvider } from './src/contexts/I18nContext';

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
    
    // Set up interval to check auth status periodically
    const authCheckInterval = setInterval(checkAuthStatus, 1000);
    
    // Also check when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkAuthStatus();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearInterval(authCheckInterval);
      subscription?.remove();
    };
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const authenticated = await ApiService.isAuthenticated();
      if (authenticated !== isAuthenticated) {
        setIsAuthenticated(authenticated);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      if (isAuthenticated !== false) {
        setIsAuthenticated(false);
      }
    } finally {
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    // You can create a splash screen component here
    return <></>;
  }

  return (
    <I18nProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator isAuthenticated={isAuthenticated} />
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  // Add any global styles here
});

export default App;
