/**
 * @format
 */

// Safely import gesture handler
try {
  require('react-native-gesture-handler');
} catch (gestureHandlerError) {
  console.warn('React Native Gesture Handler not available:', gestureHandlerError.message);
}

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Conditionally import and set up notifications
try {
  // Import Firebase messaging
  const messaging = require('@react-native-firebase/messaging').default;
  
  // Try to import Notifee
  let notifee;
  try {
    notifee = require('@notifee/react-native').default;
  } catch (notifeeError) {
    console.warn('Notifee not available:', notifeeError.message);
  }
  
  // Register background handler for FCM
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    
    // Display notification using Notifee if available
    if (remoteMessage.notification && notifee) {
      try {
        await notifee.displayNotification({
          title: remoteMessage.notification.title,
          body: remoteMessage.notification.body,
          data: remoteMessage.data,
          android: {
            channelId: 'default',
            importance: 4, // AndroidImportance.HIGH
          },
        });
      } catch (displayError) {
        console.warn('Failed to display notification:', displayError.message);
      }
    }
  });
  
} catch (messagingError) {
  console.warn('Firebase messaging not available:', messagingError.message);
}

AppRegistry.registerComponent(appName, () => App);
