# Environment Configuration

This project uses React Native Config for managing environment variables across different deployment stages.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` with your development configuration:
   ```bash
   API_BASE_URL=https://your-dev-api.com/api
   IMAGE_BASE_URL=https://your-dev-api.com/media
   PLACEHOLDER_IMAGE_URL=https://picsum.photos
   API_TIMEOUT=10000
   ```

## Environment Files

- `.env` - Development environment (default)
- `.env.staging` - Staging environment
- `.env.production` - Production environment
- `.env.example` - Template with all required variables

## Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Base URL for API endpoints | `https://api.example.com/api` |
| `IMAGE_BASE_URL` | Base URL for images | `https://api.example.com/media` |
| `PLACEHOLDER_IMAGE_URL` | Service for placeholder images | `https://picsum.photos` |
| `API_TIMEOUT` | Request timeout in milliseconds | `10000` |

## Running with Different Environments

### Development (default)
```bash
npm start
npm run android
npm run ios
```

### Staging
```bash
npm run start:staging
npm run android:staging
npm run ios:staging
```

### Production
```bash
npm run start:production
npm run android:production
npm run ios:production
```

## Platform-Specific Setup

### Android
React Native Config automatically handles Android configuration. No additional setup required.

### iOS
After installing react-native-config, you need to run:
```bash
cd ios && pod install && cd ..
```

This will configure the iOS project to use the environment variables.

## Usage in Code

```typescript
import Config from 'react-native-config';

// Direct access
const apiUrl = Config.API_BASE_URL;

// Or use the configured environment helper
import { config } from './src/config/environment';
const apiUrl = config.API_BASE_URL;
```

## Security Notes

- Environment files (`.env`, `.env.production`, `.env.staging`) are included in `.gitignore`
- Only commit `.env.example` to show required variables
- Never commit sensitive API keys or secrets to version control
- Use different API endpoints and keys for different environments

## Troubleshooting

### Variables not loading
1. Ensure you're using the correct environment file name
2. Restart Metro bundler after changing environment files
3. For iOS, clean and rebuild the project

### Build issues
1. Make sure all required variables are present in the environment file
2. Check that variable names match exactly (case-sensitive)
3. For production builds, ensure `.env.production` exists and is properly configured
