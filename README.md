# MarketHub Mobile 📱

[![React Native](https://img.shields.io/badge/React%20Native-0.75.4-blue.svg)](https://reactnative.dev/)
[![Version](https://img.shields.io/badge/Version-0.0.1-green.svg)](package.json)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](#)

A comprehensive e-commerce mobile application built with React Native, featuring advanced analytics, chat support, rewards program, offline performance, and social sharing capabilities.

## 🚀 Key Features

### Core E-commerce
- **Product Catalog**: Browse, search, and filter products
- **Shopping Cart**: Add, update, and manage cart items
- **User Authentication**: Secure login and registration
- **Order Management**: Place orders and track history
- **Favorites**: Save and manage favorite products

### Advanced Features
- **🏆 Rewards & Loyalty Program**: Earn points, redeem vouchers, tier-based benefits
- **💬 In-App Chat Support**: Live chat with FAQ system and bot escalation
- **📊 Advanced Analytics**: Firebase Analytics, Crashlytics, and custom event tracking
- **📱 Push Notifications**: Real-time notifications via Firebase Cloud Messaging
- **🔄 Offline Performance**: Offline-first architecture with data synchronization
- **🔗 Social Sharing**: Share products with deep linking via Branch.io
- **🌍 Internationalization**: Multi-language support (English, Chinese)
- **♿ Accessibility**: WCAG compliant with screen reader support

### Technical Highlights
- **Real-time Chat**: Stream Chat SDK integration
- **Performance Monitoring**: Shopify Performance monitoring
- **State Management**: Zustand for global state
- **Data Fetching**: TanStack Query with offline persistence
- **Type Safety**: Full TypeScript implementation
- **Testing**: Unit, integration, and E2E test coverage

## Prerequisites

### System Requirements
- **Node.js** >= 18.x
- **React Native CLI** ([Setup Guide](https://reactnative.dev/docs/environment-setup))
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Git**

### Development Tools
- VS Code or your preferred editor
- Android Emulator or physical Android device
- iOS Simulator or physical iPhone (macOS only)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MarketHubMobile
```

### 2. Install Dependencies
```bash
npm install

# For iOS only (macOS required)
cd ios && pod install && cd ..
```

### 3. Environment Configuration

The app uses environment-specific configuration files. Create the necessary `.env` files:

```bash
# Copy the example file
cp .env.example .env.development
```

Create additional environment files:
```bash
# Staging environment
cp .env.example .env.staging

# Production environment  
cp .env.example .env.production
```

## Environment Variables

Each `.env` file should contain the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Backend API base URL | `http://10.0.2.2:8000/api` (Android emulator)<br/>`http://localhost:8000/api` (iOS simulator) |
| `IMAGE_BASE_URL` | Base URL for product images | `http://10.0.2.2:8000/media` |
| `PLACEHOLDER_IMAGE_URL` | Service for placeholder images | `https://picsum.photos` |
| `TIMEOUT` | API request timeout in milliseconds | `10000` |
| `USE_MOCK_API` | Enable/disable mock API mode | `true` or `false` |

### Environment-Specific Configuration

#### Development (`.env.development`)
```env
API_BASE_URL=http://10.0.2.2:8000/api
IMAGE_BASE_URL=http://10.0.2.2:8000/media
PLACEHOLDER_IMAGE_URL=https://picsum.photos
TIMEOUT=10000
USE_MOCK_API=true
```

#### Staging (`.env.staging`)
```env
API_BASE_URL=https://staging-api.markethub.com/api
IMAGE_BASE_URL=https://staging-api.markethub.com/media
PLACEHOLDER_IMAGE_URL=https://picsum.photos
TIMEOUT=10000
USE_MOCK_API=false
```

#### Production (`.env.production`)
```env
API_BASE_URL=https://api.markethub.com/api
IMAGE_BASE_URL=https://api.markethub.com/media
PLACEHOLDER_IMAGE_URL=https://picsum.photos
TIMEOUT=15000
USE_MOCK_API=false
```

## Running the Application

### Development Mode

#### Start Metro Bundler
```bash
# Start with development environment
npm run start:dev

# OR use default start command
npm start
```

#### Run on Android
```bash
# Development build
npm run android:dev

# OR use default android command
npm run android
```

#### Run on iOS
```bash
# Development build
npm run ios:dev

# OR use default ios command  
npm run ios
```

### Staging Environment

```bash
# Android
npm run android:staging

# iOS
npm run ios:staging
```

### Production Environment

```bash
# Android (Release build)
npm run android:prod

# iOS (Release build)
npm run ios:prod
```

## Switching Between Mock and Real API

The app supports two API modes:

### Mock API Mode (Default for Development)
- **Purpose**: Test app functionality without backend
- **Features**: Pre-populated data, simulated network delays
- **Login Credentials**: 
  - Email: `test@example.com`
  - Password: `password`

### Real API Mode
- **Purpose**: Connect to actual backend server
- **Requirements**: Running backend server

### How to Switch

#### Method 1: Environment Variable (Recommended)
Update your `.env` file:
```env
# Enable mock API
USE_MOCK_API=true

# Disable mock API (use real backend)
USE_MOCK_API=false
```

#### Method 2: Code Configuration
Modify `src/services/index.ts`:
```javascript
import { config } from '../config/environment';
import RealApi from './api';
import MockApi from './mockApi';

// Force mock API
const SelectedApi = MockApi;

// Force real API
// const SelectedApi = RealApi;

// Use environment setting (recommended)
// const SelectedApi = config.USE_MOCK_API ? MockApi : RealApi;

export default SelectedApi;
```

**Note**: After changing the API mode, restart Metro bundler and rebuild the app.

## Troubleshooting Common Issues

### SSL Certificate Issues

#### Problem
```
Network Error: Unable to resolve host / SSL handshake failed
```

#### Solutions

1. **Development with Self-Signed Certificates**:
   ```bash
   # Android: Add network security config
   # Create android/app/src/main/res/xml/network_security_config.xml
   ```
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <network-security-config>
       <domain-config cleartextTrafficPermitted="true">
           <domain includeSubdomains="true">10.0.2.2</domain>
           <domain includeSubdomains="true">localhost</domain>
       </domain-config>
   </network-security-config>
   ```

2. **iOS Simulator SSL Issues**:
   ```bash
   # Use HTTP instead of HTTPS for development
   API_BASE_URL=http://localhost:8000/api
   ```

### Android Emulator Network Issues

#### Problem
```
Network Error: Connection refused to localhost:8000
```

#### Solutions

1. **Use Android Emulator IP**:
   ```env
   # Replace localhost with emulator IP
   API_BASE_URL=http://10.0.2.2:8000/api
   ```

2. **Check Backend Server**:
   ```bash
   # Ensure backend is running and accessible
   curl http://localhost:8000/api/health
   ```

3. **Enable Network Bridge**:
   ```bash
   # Start emulator with DNS
   emulator -avd YourAVD -dns-server 8.8.8.8
   ```

### iOS Simulator Network Issues

#### Problem
```
Network Error: localhost connection issues
```

#### Solutions

1. **Use Localhost for iOS**:
   ```env
   # iOS Simulator can use localhost directly
   API_BASE_URL=http://localhost:8000/api
   ```

2. **Check macOS Firewall**:
   ```bash
   # Temporarily disable firewall for testing
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
   ```

### Metro Bundler Issues

#### Problem
```
Error: Unable to resolve module react-native-config
```

#### Solutions

1. **Clear Cache and Reinstall**:
   ```bash
   # Clear Metro cache
   npx react-native start --reset-cache
   
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Android: Clean Build**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **iOS: Clean Build**:
   ```bash
   cd ios
   xcodebuild clean
   rm -rf build/
   pod install
   cd ..
   ```

### Environment Variables Not Loading

#### Problem
App shows `undefined` for environment variables

#### Solutions

1. **Verify File Names**:
   ```bash
   # Check files exist
   ls -la .env*
   ```

2. **Check File Format**:
   ```env
   # No spaces around = sign
   API_BASE_URL=http://localhost:8000/api
   
   # Not this:
   API_BASE_URL = http://localhost:8000/api
   ```

3. **Restart Everything**:
   ```bash
   # Kill Metro bundler
   pkill -f metro
   
   # Restart with clean cache
   npx react-native start --reset-cache
   ```

### Build Failures

#### Problem
```
Build failed: Environment file not found
```

#### Solutions

1. **Create Missing Environment Files**:
   ```bash
   # Ensure all environment files exist
   touch .env.development .env.staging .env.production
   ```

2. **Use Default Environment**:
   ```bash
   # Fallback to default commands if env-specific fails
   npm run android  # instead of android:dev
   npm run ios      # instead of ios:dev
   ```

## Development Tips

### Debugging Network Requests

1. **Enable Network Logging**:
   ```javascript
   // Add to App.tsx for debugging
   import { XMLHttpRequest } from 'react-native';
   
   const originalOpen = XMLHttpRequest.prototype.open;
   XMLHttpRequest.prototype.open = function(method, url) {
     console.log('API Request:', method, url);
     return originalOpen.apply(this, arguments);
   };
   ```

2. **React Native Debugger**:
   - Install React Native Debugger
   - Enable Network tab to monitor API calls

### Testing Different Environments

```bash
# Quick environment test
npm run android:dev     # Should show mock data
npm run android:staging # Should connect to staging API
npm run android:prod    # Should connect to production API
```

### Hot Reload Issues

If hot reload stops working after environment changes:

```bash
# Reload the app manually
# Android: Press 'R' twice in terminal or Cmd+M → Reload
# iOS: Cmd+R in simulator
```

# Code Quality & Internationalization

## Chinese Unicode Prevention

This project enforces strict internationalization standards by preventing Chinese Unicode characters in source code.

### Quick Check

```bash
# Check for Chinese Unicode characters
npm run lint:chinese

# Run full CI checks (Chinese + ESLint)
npm run ci:check-chinese
```

### Why This Matters

- **🌍 Internationalization**: All text should use translation keys
- **🔧 Maintainability**: Prevents hardcoded text in source code
- **✅ Quality**: Automated CI checks prevent regression

### Example

```javascript
// ❌ Don't do this
const title = "产品列表";

// ✅ Do this instead
import i18n from './src/services/i18n';
const title = i18n.t('products.listTitle');
```

**See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.**

---

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
