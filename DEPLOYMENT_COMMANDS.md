# 🚀 MarketHub Mobile - Deployment Commands

## Quick Reference for Deployment

### 🔧 Pre-Deployment Checks

```bash
# Check project status
.\scripts\quick-test.ps1

# Fix linting issues  
npm run lint --fix
npx prettier --write "src/**/*.{ts,tsx}"

# Run tests
npm run test:ci
npm run test:e2e:android
```

### 🏗️ Build & Deploy

```powershell
# Staging Deployment
.\scripts\deploy.ps1 -Environment staging -Platform android -BuildType release

# Production Deployment (after staging validation)
.\scripts\deploy.ps1 -Environment production -Platform android -BuildType release

# iOS Deployment
.\scripts\deploy.ps1 -Environment production -Platform ios -BuildType release

# Both Platforms
.\scripts\deploy.ps1 -Environment production -Platform both -BuildType release
```

### 📊 Monitoring

```powershell
# Start monitoring (one-time check)
.\scripts\monitor.ps1 -Environment production

# Continuous monitoring (every 5 minutes)
.\scripts\monitor.ps1 -Environment production -ContinuousMonitoring -IntervalMinutes 5

# Check specific metrics
.\scripts\monitor.ps1 -Environment production -CheckType api
.\scripts\monitor.ps1 -Environment production -CheckType analytics
.\scripts\monitor.ps1 -Environment production -CheckType errors
```

### 🔥 Firebase Setup

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy Remote Config
firebase deploy --only remoteconfig

# Deploy Cloud Functions (if applicable)
firebase deploy --only functions
```

### 📱 App Store Deployment

```bash
# Android - Generate signed APK
cd android
./gradlew assembleRelease

# Android - Generate App Bundle
./gradlew bundleRelease

# iOS - Archive for App Store
xcodebuild -workspace ios/MarketHubMobile.xcworkspace -scheme MarketHubMobile -configuration Release archive
```

### 🚨 Emergency Procedures

```powershell
# Quick rollback to previous version
.\scripts\deploy.ps1 -Environment production -Platform android -BuildType release -Rollback

# Emergency monitoring (1-minute intervals)
.\scripts\monitor.ps1 -Environment production -ContinuousMonitoring -IntervalMinutes 1

# Stop all services (if needed)
Get-Process -Name "node" | Stop-Process -Force
```

### 🔄 Feature Flag Management

```javascript
// Update Firebase Remote Config
{
  "enable_ar_features": "true",
  "rewards_program_rollout": "100",
  "maintenance_mode": "false"
}
```

### 📈 Success Metrics Commands

```bash
# Check app performance
adb shell dumpsys meminfo com.markethub.mobile
adb shell dumpsys battery

# Monitor network requests
adb shell tcpdump -i any -w network.pcap

# Check bundle size
npx react-native-bundle-analyzer
```

---

## Environment Variables Quick Reference

### Development
```bash
NODE_ENV=development
API_BASE_URL=https://dev-api.markethub.com
ENABLE_DEBUG_MODE=true
```

### Staging  
```bash
NODE_ENV=staging
API_BASE_URL=https://staging-api.markethub.com
ENABLE_DEBUG_MODE=false
```

### Production
```bash
NODE_ENV=production
API_BASE_URL=https://api.markethub.com
ENABLE_DEBUG_MODE=false
```

---

*Quick tip: Always test in staging before production deployment!* ⚠️
