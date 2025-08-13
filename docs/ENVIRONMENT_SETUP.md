# Environment Configuration Setup

This document explains how to configure different environments (development, staging, production) for the MarketHub Mobile app using react-native-config.

## Overview

The app is configured to support multiple environments through environment-specific `.env` files and corresponding build scripts.

## Environment Files

- `.env.development` - Development environment settings
- `.env.staging` - Staging environment settings  
- `.env.production` - Production environment settings

## Package.json Scripts

The following scripts have been added to `package.json`:

```json
{
  "start:dev": "ENVFILE=.env.development react-native start",
  "android:dev": "ENVFILE=.env.development react-native run-android",
  "ios:dev": "ENVFILE=.env.development react-native run-ios",
  "android:staging": "ENVFILE=.env.staging react-native run-android --variant=stagingDebug",
  "ios:staging": "ENVFILE=.env.staging react-native run-ios",
  "android:prod": "ENVFILE=.env.production react-native run-android --variant=release",
  "ios:prod": "ENVFILE=.env.production react-native run-ios --configuration Release"
}
```

## Android Configuration

### Build Variants

The Android `build.gradle` has been configured with the following build types:

- **debug** - Standard debug build
- **stagingDebug** - Debug build with staging configuration and different package ID
- **release** - Production release build

### React Native Config Integration

- Added `apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"` to `android/app/build.gradle`
- Added proguard rules for react-native-config in `android/app/proguard-rules.pro`

### Usage

```bash
# Development
npm run android:dev

# Staging
npm run android:staging

# Production
npm run android:prod
```

## iOS Configuration

### Manual Setup Required

iOS configuration requires manual setup in Xcode. See `ios/CONFIG.md` for detailed instructions.

### Key Steps:

1. Add build script phase to copy environment file
2. Create staging build configuration
3. Set up schemes for different environments
4. Configure environment variables

### Usage

```bash
# Development
npm run ios:dev

# Staging  
npm run ios:staging

# Production
npm run ios:prod
```

## Metro Server

Environment-specific Metro servers can be started with:

```bash
# Development
npm run start:dev
```

The Metro bundler will use the environment variables from the specified `.env` file during the bundle process.

## Environment Variables

All environment variables defined in the `.env` files are accessible in JavaScript code through:

```javascript
import Config from 'react-native-config';

const apiUrl = Config.API_BASE_URL;
const imageUrl = Config.IMAGE_BASE_URL;
```

## Testing the Setup

1. **Verify Android build variants:**
   ```bash
   cd android && ./gradlew tasks --all | grep assemble
   ```

2. **Test environment switching:**
   ```bash
   npm run android:dev    # Should use development API
   npm run android:staging # Should use staging API
   ```

3. **Check environment variables in app:**
   Add logging to verify the correct environment is loaded:
   ```javascript
   console.log('Current API URL:', Config.API_BASE_URL);
   ```

## Troubleshooting

1. **Android builds fail:** Make sure Android project is synced and build variants are recognized
2. **iOS environment not switching:** Verify the build script phase is added correctly in Xcode
3. **Environment variables undefined:** Ensure the correct `.env` file exists and react-native-config is properly linked

## Build Commands Summary

### Development
```bash
npm run start:dev      # Start Metro with dev env
npm run android:dev    # Android debug with dev env
npm run ios:dev        # iOS debug with dev env
```

### Staging
```bash
npm run android:staging # Android staging debug build
npm run ios:staging     # iOS staging build
```

### Production
```bash
npm run android:prod    # Android release build
npm run ios:prod        # iOS release build
```
