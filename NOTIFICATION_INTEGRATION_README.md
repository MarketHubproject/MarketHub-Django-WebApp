# Firebase Cloud Messaging + Notifee + Branch.io Integration

A comprehensive push notification and deep linking solution for MarketHub Mobile App with Firebase Cloud Messaging, Notifee for local notifications, and Branch.io for deep linking.

## 🚀 Features Implemented

### ✅ Push Notifications
- **Firebase Cloud Messaging (FCM)** integration
- **Notifee** for rich local notifications with actions
- Notification categories with user preferences
- Background and foreground message handling
- Notification channels for Android
- Analytics tracking for open/conversion rates

### ✅ Notification Types
- **Order Status Updates** - Order confirmations, shipping, delivery
- **Price Drop Alerts** - Wishlist item price reductions
- **Abandoned Cart Reminders** - Automatic cart abandonment detection
- **Promotional Campaigns** - Marketing notifications with promo codes
- **General Notifications** - App updates and announcements

### ✅ Deep Linking
- **Branch.io** integration for attribution and deep links
- **Custom URL schemes** (markethub://)
- Universal link handling
- Deep link navigation to specific screens
- Campaign tracking and analytics

### ✅ User Preferences
- Toggle notification categories on/off
- Test notifications for each category
- Automatic topic subscription management
- Persistent preferences storage

### ✅ Analytics & Tracking
- Firebase Analytics integration
- Notification open/conversion tracking
- Campaign performance metrics
- Deep link attribution

## 📁 Project Structure

```
src/
├── services/
│   ├── firebase.ts              # Firebase service (FCM + Analytics)
│   ├── notificationService.ts   # Notifee local notifications
│   ├── deepLinkService.ts       # Branch.io + URL schemes
│   ├── navigationService.ts     # Navigation utilities
│   ├── appInitService.ts        # Main initialization service
│   └── index.ts                 # Service exports
├── screens/
│   └── NotificationPreferencesScreen.tsx  # User preferences UI
└── navigation/
    └── AppNavigator.tsx         # Updated with deep linking
```

## 🛠 Installation & Setup

### 1. Dependencies Installed
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging @react-native-firebase/analytics @notifee/react-native react-native-branch --legacy-peer-deps
```

### 2. Firebase Configuration Required
- Add `google-services.json` to `android/app/`
- Add `GoogleService-Info.plist` to `ios/[YourAppName]/`
- Follow setup instructions in `FIREBASE_SETUP.md`

### 3. Branch.io Configuration Required
- Sign up at [Branch.io Dashboard](https://branch.io/)
- Get your Branch keys and configure them
- Add URL schemes and intent filters

## 📱 Usage Examples

### Initialize Services
```typescript
import { appInitService } from './src/services';

// In your main App component
useEffect(() => {
  appInitService.initialize();
}, []);
```

### Send Notifications
```typescript
// Order status notification
await appInitService.handleOrderStatusUpdate('ORDER123', 'shipped', 'TRACK123');

// Price drop alert
await appInitService.handlePriceDrop('PROD123', 'iPhone 15', 999, 799);

// Abandoned cart reminder
await appInitService.handlePromotionalCampaign(
  'Don\'t Miss Out! 🛒',
  'Complete your purchase and save 20%',
  'SAVE20',
  '/cart'
);
```

### Track Cart Activity
```typescript
// Call when user adds/removes items from cart
await appInitService.trackCartActivity();
```

### Create Shareable Links
```typescript
const shareLink = await appInitService.createProductShareLink(
  'product-123',
  'Amazing Product',
  'https://example.com/image.jpg'
);
```

### Navigate to Notification Preferences
```typescript
navigation.navigate('NotificationPreferences');
```

## 🔧 Configuration

### Notification Categories
- `ORDER_STATUS` - Order updates and tracking
- `PRICE_DROP` - Price alerts for watched items  
- `ABANDONED_CART` - Cart abandonment reminders
- `PROMOTIONAL` - Marketing campaigns and offers
- `GENERAL` - App announcements and updates

### Deep Link Patterns
- `markethub://product/123` - Product details
- `markethub://order/456` - Order details
- `markethub://cart` - Shopping cart
- `markethub://search?q=query` - Search results

### Firebase Topics
Users are automatically subscribed/unsubscribed from topics based on preferences:
- `order-status`
- `price-drop`
- `abandoned-cart`
- `promotional`
- `general`

## 📊 Analytics Events

### Automatically Tracked
- `notification_opened` - When user opens notification
- `notification_conversion` - When user takes action
- Custom events per notification type

### View in Firebase Console
- Go to Firebase Analytics → Events
- Monitor engagement and conversion rates
- Track campaign performance

## 🧪 Testing

### Test Notifications
1. Open app and navigate to Settings
2. Tap "Notification Preferences"
3. Enable categories you want to test
4. Tap "Send Test" button for each category

### Test Deep Links
```bash
# Android ADB
adb shell am start -W -a android.intent.action.VIEW -d "markethub://product/123" com.markethubmobile

# iOS Simulator
# Open Safari and navigate to: markethub://product/123
```

### Test Branch Links
1. Create test links in Branch.io dashboard
2. Share links and test on different devices
3. Monitor attribution in Branch dashboard

## 🔒 Privacy & Permissions

### Android Permissions Added
- `INTERNET` - Network communication
- `WAKE_LOCK` - Background processing
- `VIBRATE` - Notification vibrations
- `RECEIVE_BOOT_COMPLETED` - Persistent notifications

### iOS Permissions
- Notification permissions requested automatically
- Location services (optional, for location-based features)

## 🚨 Troubleshooting

### Common Issues

1. **Notifications not received**
   - Check Firebase project configuration
   - Verify FCM token generation
   - Ensure app has notification permissions

2. **Deep links not working**
   - Verify URL schemes in AndroidManifest.xml / Info.plist
   - Check Branch.io configuration
   - Test with simple custom URL scheme first

3. **Build errors**
   - Clean and rebuild project
   - Check all configuration files are in place
   - Verify pod install (iOS) and gradle sync (Android)

### Debug Tools
- Firebase console for message delivery
- Branch.io dashboard for link analytics
- React Native Flipper for debugging
- Device logs for error messages

## 🔮 Future Enhancements

### Planned Features
- **Rich media notifications** - Images, videos, custom layouts
- **Notification scheduling** - Time-based delivery
- **Geofencing** - Location-based notifications
- **A/B testing** - Campaign optimization
- **Push notification templates** - Reusable designs

### Backend Integration
- Server-side FCM token management
- Campaign management dashboard
- Real-time notification delivery
- Advanced analytics and reporting

## 📚 Documentation Links

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Notifee Documentation](https://notifee.app/react-native/docs/overview)
- [Branch.io React Native SDK](https://help.branch.io/developers-hub/docs/react-native)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking)

## 🤝 Support

For technical support or questions:
1. Check troubleshooting section above
2. Review setup documentation in `FIREBASE_SETUP.md`
3. Test with provided examples in `INTEGRATION_EXAMPLE.tsx`
4. Monitor console logs for detailed error messages

---

**Note**: This integration requires Firebase project setup and Branch.io account configuration. Follow the setup instructions carefully and test on both iOS and Android platforms.
