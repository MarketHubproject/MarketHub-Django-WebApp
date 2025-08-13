/**
 * Example of how to integrate the Toast component in your main App.tsx file
 *
 * IMPORTANT: This is an example only. You need to add the <Toast /> component
 * to your actual App.tsx file for the error handling system to work.
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Toast from "react-native-toast-message";

// Your existing imports...
// import YourRootNavigator from './navigation/RootNavigator';

const App = () => {
  return (
    <NavigationContainer>
      {/* Your existing navigation and components */}
      {/* <YourRootNavigator /> */}

      {/* 
        IMPORTANT: Add this Toast component at the bottom of your App component
        This enables the error handling system to display toast messages
      */}
      <Toast />
    </NavigationContainer>
  );
};

export default App;

/**
 * Optional: Custom Toast Configuration
 *
 * If you want to customize the appearance of toast messages,
 * you can create a custom configuration like this:
 */

import {
  BaseToast,
  ErrorToast as RNErrorToast,
} from "react-native-toast-message";

const toastConfig = {
  // Success toast customization
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#28a745",
        borderLeftWidth: 7,
        width: "90%",
        height: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      }}
      text2Style={{
        fontSize: 14,
        color: "#666",
      }}
    />
  ),

  // Error toast customization
  error: (props: any) => (
    <RNErrorToast
      {...props}
      style={{
        borderLeftColor: "#dc3545",
        borderLeftWidth: 7,
        width: "90%",
        height: 70,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      }}
      text2Style={{
        fontSize: 14,
        color: "#666",
      }}
    />
  ),

  // Info toast customization
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#17a2b8",
        borderLeftWidth: 7,
        width: "90%",
        height: 70,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      }}
      text2Style={{
        fontSize: 14,
        color: "#666",
      }}
    />
  ),
};

// Then use it in your App component:
const AppWithCustomToast = () => {
  return (
    <NavigationContainer>
      {/* Your app content */}

      {/* Custom configured Toast */}
      <Toast config={toastConfig} />
    </NavigationContainer>
  );
};
