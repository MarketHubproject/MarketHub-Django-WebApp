/**
 * MarketHub Mobile App
 * React Native e-commerce client for MarketHub Django backend
 *
 * @format
 */

import React from "react";
import { StatusBar, View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import AppNavigator from "./navigation/AppNavigator";
import { I18nProvider } from "./contexts/I18nContext";
import { ChatProvider } from "./contexts/ChatContext";
import { FloatingChat } from "./components/chat";
import { queryClient } from "./shared/api/queryClient";
import { useIsAuthenticated } from "./shared/stores/authStore";

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <AppContent />
        {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
      </I18nProvider>
    </QueryClientProvider>
  );
}

// Separate component to use hooks inside QueryClientProvider
function AppContent(): React.JSX.Element {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ChatProvider>
      <View style={{ flex: 1 }}>
        <AppNavigator isAuthenticated={isAuthenticated} />
        {/* Floating Chat available on every screen */}
        <FloatingChat isVisible={true} showInModal={true} />
      </View>
    </ChatProvider>
  );
}

// Global styles can be added here in the future
// const styles = StyleSheet.create({
//   // Add any global styles here
// });

export default App;
