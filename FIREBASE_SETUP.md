# Firebase Cloud Messaging + Notifee Integration Setup

## Prerequisites

1. **Firebase Project Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firebase Cloud Messaging
   - Enable Firebase Analytics
   - Download configuration files

2. **Configuration Files**
   - Android: `google-services.json` → place in `android/app/`
   - iOS: `GoogleService-Info.plist` → place in `ios/[YourAppName]/`

## Android Setup

### 1. Add Google Services Plugin

Add to `android/build.gradle`:
```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'

android {
  compileSdkVersion 34
  
  defaultConfig {
    multiDexEnabled true
  }
}

dependencies {
  implementation 'com.google.firebase:firebase-analytics:21.2.0'
  implementation 'com.google.firebase:firebase-messaging:23.1.2'
  implementation 'androidx.multidex:multidex:2.0.1'
}
```

### 2. Add Permissions

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<application android:name=".MainApplication">
  
  <!-- Firebase Messaging Service -->
  <service
    android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
      <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
  </service>

  <!-- Notifee Service -->
  <service android:name="app.notifee.core.ForegroundService" />

  <!-- URL Scheme for Deep Linking -->
  <activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop">
    
    <intent-filter android:autoVerify="true">
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="markethub" />
    </intent-filter>
    
    <!-- Branch.io Intent Filter -->
    <intent-filter android:autoVerify="true">
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="https"
            android:host="yourdomain.app.link" />
    </intent-filter>
    
  </activity>
</application>
```

### 3. MainApplication.java

Update `android/app/src/main/java/.../MainApplication.java`:
```java
import io.branch.rnbranch.RNBranchModule;

@Override
public void onCreate() {
  super.onCreate();
  RNBranchModule.getAutoInstance(this);
}

@Override
protected ReactActivityDelegate createReactActivityDelegate() {
  return new ReactActivityDelegate(this, getMainComponentName()) {
    @Override
    protected Bundle getLaunchOptions() {
      Bundle initialProps = new Bundle();
      initialProps.putString("branch", RNBranchModule.getAutoInstance(MainActivity.this).getLatestReferringParams().toString());
      return initialProps;
    }
  };
}
```

## iOS Setup

### 1. Add Firebase SDK

In `ios/Podfile`:
```ruby
target 'YourAppName' do
  pod 'Firebase/Core'
  pod 'Firebase/Messaging'
  pod 'Firebase/Analytics'
end
```

Run: `cd ios && pod install`

### 2. Configure AppDelegate

Update `ios/YourAppName/AppDelegate.m`:
```objc
#import <Firebase.h>
#import <RNBranch/RNBranch.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  [RNBranch initSessionWithLaunchOptions:launchOptions isReferrable:YES];
  
  // Request notification permissions
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge) completionHandler:^(BOOL granted, NSError * _Nullable error) {
    if (granted) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [[UIApplication sharedApplication] registerForRemoteNotifications];
      });
    }
  }];
  
  return YES;
}

// Branch.io URL Handling
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  if ([RNBranch application:app openURL:url options:options]) {
    return YES;
  }
  return NO;
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  return [RNBranch continueUserActivity:userActivity];
}

@end
```

### 3. URL Schemes

Add to `ios/YourAppName/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>markethub</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>markethub</string>
    </array>
  </dict>
  <dict>
    <key>CFBundleURLName</key>
    <string>branch</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yourdomain</string>
    </array>
  </dict>
</array>

<key>branch_key</key>
<dict>
  <key>live</key>
  <string>key_live_YOUR_BRANCH_KEY</string>
  <key>test</key>
  <string>key_test_YOUR_BRANCH_KEY</string>
</dict>
```

## Integration in App

### 1. Initialize Services

In your main App component:
```typescript
import { appInitService } from './src/services';

export default function App() {
  useEffect(() => {
    appInitService.initialize();
  }, []);
  
  // ... rest of your app
}
```

### 2. Usage Examples

```typescript
import { 
  notificationService,
  appInitService,
  deepLinkService 
} from './src/services';

// Send order status notification
appInitService.handleOrderStatusUpdate('ORDER123', 'shipped', 'TRACK123');

// Send price drop alert
appInitService.handlePriceDrop('PROD123', 'iPhone 15', 999, 799);

// Send promotional notification
appInitService.handlePromotionalCampaign(
  'Black Friday Sale!',
  'Up to 50% off on all items',
  'BLACKFRIDAY50',
  '/products?category=sale'
);

// Create shareable product link
const shareLink = await appInitService.createProductShareLink(
  'PROD123',
  'iPhone 15',
  'https://example.com/image.jpg'
);

// Track cart activity (call when user adds/removes items)
appInitService.trackCartActivity();
```

## Branch.io Configuration

1. Sign up at [Branch.io Dashboard](https://branch.io/)
2. Create a new app
3. Get your Branch keys from Settings → App
4. Configure domain and link settings
5. Update the configuration in your app

## Testing

1. **Test Notifications**: Use the notification preferences screen to send test notifications
2. **Test Deep Links**: Use Branch.io dashboard to create test links
3. **Test Analytics**: Check Firebase Analytics console for events

## Troubleshooting

### Android
- Ensure `google-services.json` is in the correct location
- Check Logcat for Firebase initialization messages
- Verify Gradle sync completed successfully

### iOS
- Ensure `GoogleService-Info.plist` is added to Xcode project
- Check iOS device logs for Firebase initialization
- Verify pod installation was successful

### Deep Links
- Test URL schemes with ADB: `adb shell am start -W -a android.intent.action.VIEW -d "markethub://product/123" com.markethubmobile`
- Test on iOS Simulator with Safari: Open `markethub://product/123`

## Analytics Events

The integration automatically tracks:
- `notification_opened`: When user opens a notification
- `notification_conversion`: When user takes action from notification
- Custom events for each notification type

View these in Firebase Analytics console under Events.
