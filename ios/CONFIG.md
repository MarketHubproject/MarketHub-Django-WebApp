# iOS Configuration for react-native-config

## Manual Configuration Required

To properly configure react-native-config for iOS with environment-specific builds, you need to add a build script phase in Xcode. Follow these steps:

### 1. Open the iOS project in Xcode
```bash
open ios/MarketHubMobile.xcworkspace
```

### 2. Add Environment Setup Build Script

1. Select your project in the Project Navigator
2. Select the `MarketHubMobile` target
3. Go to the "Build Phases" tab
4. Click the "+" button and select "New Run Script Phase"
5. Rename the script phase to "Setup Environment Variables"
6. Move this script phase to be BEFORE "Bundle React Native code and images" phase
7. Add the following script:

```bash
#!/bin/bash

# Setup environment file for react-native-config
ENVFILE=${ENVFILE:-.env}
PROJECT_ROOT="$PROJECT_DIR/.."

echo "Setting up environment from: $ENVFILE"

# Copy the specified environment file to .env if it exists
if [ -f "$PROJECT_ROOT/$ENVFILE" ]; then
    cp "$PROJECT_ROOT/$ENVFILE" "$PROJECT_ROOT/.env"
    echo "Copied $ENVFILE to .env"
else
    echo "Warning: $ENVFILE not found, using default .env"
fi

# Run react-native-config setup
"$PROJECT_ROOT/node_modules/react-native-config/ios/ReactNativeConfig/BuildXCConfig.rb" "$PROJECT_ROOT" "$PROJECT_ROOT/ios/tmp.xcconfig"
```

### 3. Create Build Configurations for Staging

1. In the Project Navigator, select your project (not the target)
2. In the "Info" tab, under "Configurations", duplicate the existing "Debug" configuration
3. Rename the duplicate to "Staging"

### 4. Configure Scheme for Staging

1. Click on the scheme dropdown (next to the stop button) and select "Edit Scheme..."
2. Duplicate the existing scheme by clicking "Duplicate Scheme"
3. Rename it to "MarketHubMobile Staging"
4. Under "Run" → "Info", set Build Configuration to "Staging"
5. Under "Archive" → "Info", set Build Configuration to "Staging"

### 5. Environment Variables in Xcode

For each script that needs the environment file, ensure the ENVFILE variable is set:

- For development: `ENVFILE=.env.development`
- For staging: `ENVFILE=.env.staging`  
- For production: `ENVFILE=.env.production`

You can set these in the scheme environment variables or pass them when running from command line.

## Testing the Configuration

After setting up the build script, you can test with:

```bash
# Development
ENVFILE=.env.development npx react-native run-ios

# Staging
ENVFILE=.env.staging npx react-native run-ios

# Production
ENVFILE=.env.production npx react-native run-ios --configuration Release
```
