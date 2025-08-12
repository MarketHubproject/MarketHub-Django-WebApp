# Error Handling & Logging Enhancement

## Overview

This document outlines the implementation of strengthened error handling and logging system across the MarketHub Mobile app, completed as part of Step 7 of the development roadmap.

## 🎯 Implementation Goals

✅ **Centralize `console.warn` / `console.error` in utils/logger**  
✅ **In I18nService, throttle repeated missing-key logs**  
✅ **In API layer & HomeScreen, show SnackBar with `t('errors.networkError')` when fetch fails**

## 📁 Files Modified/Added

### New Files Created
- `src/utils/logger.ts` - Centralized logging utility
- `docs/ERROR_HANDLING_AND_LOGGING.md` - This documentation

### Files Modified
- `src/utils/index.ts` - Added logger exports
- `src/services/i18n.ts` - Added throttled missing-key logging
- `src/services/api.ts` - Enhanced error handling with Toast notifications
- `src/services/mockApi.ts` - Updated imports for consistency
- `src/screens/HomeScreen.tsx` - Improved error handling with Toast
- `src/utils/ApiErrorHandler.ts` - Migrated to centralized logger
- `i18n/en.json` - Contains error translation keys (already existed)

## 🛠 Implementation Details

### 1. Centralized Logger (`src/utils/logger.ts`)

A comprehensive logging utility that replaces scattered `console.warn` and `console.error` calls:

#### Features:
- **Log Levels**: DEBUG, INFO, WARN, ERROR with configurable minimum level
- **Contextual Logging**: Automatic inclusion of component, action, and metadata
- **Development/Production Modes**: Verbose logging in dev, minimal in production
- **Remote Logging Ready**: Placeholder for production logging services (Sentry, etc.)
- **Scoped Loggers**: Create loggers with pre-defined context
- **Specialized Methods**: `apiError()` and `networkError()` for common scenarios

#### Usage Examples:
```typescript
import { logger } from '../utils';

// Basic logging
logger.warn('Something unexpected happened', error);
logger.error('Critical failure', error);

// With context
logger.error('API call failed', error, {
  component: 'UserService',
  action: 'getUserProfile',
  metadata: { userId: 123 }
});

// Specialized logging
logger.apiError('GET', '/api/users', 500, error);
logger.networkError('Connection timeout', error);

// Scoped logger
const userLogger = logger.scope({ component: 'UserService' });
userLogger.warn('User not found', null, { metadata: { userId } });
```

### 2. Throttled Missing-Key Logs in I18nService

Enhanced the I18nService to prevent log spam from repeated missing translation keys:

#### Features:
- **Throttling**: Maximum 3 logs per missing key, with 30-second intervals
- **Contextual Logging**: Rich metadata including language info and attempt counts
- **Final Warnings**: Special message on the last allowed log for each key
- **Tracking**: Maintains internal state of logged keys and frequencies

#### Implementation:
```typescript
// Added throttling mechanism
private loggedMissingKeys: Map<string, { count: number; lastLogged: number }> = new Map();
private readonly THROTTLE_INTERVAL_MS = 30000; // 30 seconds
private readonly MAX_LOGS_PER_KEY = 3; // Max 3 logs per missing key

// Enhanced logMissingKey method with throttling
private logMissingKey(key: TranslationKey): void {
  // ... throttling logic
  logger.warn(message, null, {
    component: 'I18nService',
    action: 'translation_lookup',
    metadata: {
      key,
      currentLanguage: this.currentLanguage,
      fallbackLanguage: this.fallbackLanguage,
      attemptCount: count,
    },
  });
}
```

### 3. Enhanced API Error Handling with Toast Notifications

#### API Service (`src/services/api.ts`)
- **Network Error Toasts**: Automatically shows Toast with `t('errors.networkError')` for network failures
- **Centralized Logging**: All API errors logged with rich context (method, URL, status, etc.)
- **Consistent Error Objects**: All errors return standardized ApiError format

#### Implementation:
```typescript
private handleError(error: any): ApiError {
  const url = error.config?.url || 'unknown';
  const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
  
  if (error.request) {
    // Network error - show Toast with translated message
    const networkErrorMessage = i18n.t('errors.networkError');
    
    ErrorToast.show({
      title: i18n.t('common.error'),
      message: networkErrorMessage
    });
    
    // Log network error
    logger.networkError(`Network request failed: ${method} ${url}`, error, {
      component: 'ApiService',
      metadata: { timeout: error.code === 'ECONNABORTED', url, method }
    });
    
    return { title: 'Network Error', message: networkErrorMessage };
  }
  // ... other error handling
}
```

#### HomeScreen (`src/screens/HomeScreen.tsx`)
- **Smart Error Handling**: Distinguishes between network errors (already handled by API) and other errors
- **User-Friendly Messages**: Shows appropriate Toast messages using i18n translations
- **Detailed Logging**: Context-aware logging with component and action information

```typescript
catch (error: any) {
  logger.error('Error loading home data', error, {
    component: 'HomeScreen',
    action: 'loadHomeData',
    metadata: {
      featuredProductsCount: featuredProducts.length,
      categoriesCount: categories.length,
    }
  });
  
  // Show generic error toast for non-network errors
  if (!error?.title && !error?.message) {
    ErrorToast.show({
      title: i18n.t('common.error'),
      message: i18n.t('errors.loadingError')
    });
  }
}
```

### 4. Translation Keys

The following translation keys are used for error handling (already exist in `i18n/en.json`):

```json
{
  "common": {
    "error": "Error",
    "loading": "Loading..."
  },
  "errors": {
    "loadingError": "Failed to load data. Please try again.",
    "networkError": "Network error. Please check your connection.",
    "serverError": "Server error. Please try again later.",
    "authenticationError": "Authentication error. Please login again."
  }
}
```

## 🔧 Configuration

### Logger Configuration
The logger can be configured by setting the log level:

```typescript
import { logger, LogLevel } from '../utils';

// Set minimum log level (default: DEBUG in dev, WARN in production)
logger.setLevel(LogLevel.ERROR); // Only show errors

// Set global context
logger.setContext({
  userId: '12345',
  component: 'MyComponent'
});
```

### I18nService Throttling
The throttling parameters can be adjusted by modifying the constants in `I18nService`:

```typescript
private readonly THROTTLE_INTERVAL_MS = 30000; // 30 seconds
private readonly MAX_LOGS_PER_KEY = 3; // Max 3 logs per missing key
```

## 📊 Benefits

### 1. **Consistent Logging**
- All logging goes through a single, standardized system
- Rich contextual information for better debugging
- Structured logs ready for production monitoring

### 2. **Reduced Log Noise**
- Throttled missing translation key warnings
- Intelligent log levels prevent spam in production
- Contextual grouping makes logs more readable

### 3. **Better User Experience**
- Network errors immediately show user-friendly Toast messages
- Consistent error messaging using i18n translations
- Non-blocking error handling (app continues to function)

### 4. **Developer Experience**
- Easy-to-use logger with TypeScript support
- Scoped loggers for component-specific logging
- Rich metadata for easier debugging and monitoring

### 5. **Production Ready**
- Configurable log levels
- Remote logging service integration ready
- Structured logs for better analysis

## 🚀 Usage Guidelines

### For Developers

1. **Replace direct console calls**:
   ```typescript
   // ❌ Don't do this
   console.warn('Something happened', error);
   
   // ✅ Do this instead
   logger.warn('Something happened', error, {
     component: 'MyComponent',
     action: 'myAction'
   });
   ```

2. **Use appropriate log levels**:
   - `debug()`: Development debugging info
   - `info()`: General information
   - `warn()`: Warnings that don't break functionality
   - `error()`: Errors that need attention

3. **Provide context**:
   ```typescript
   logger.error('API call failed', error, {
     component: 'UserService',
     action: 'fetchUser',
     metadata: { userId, attempt: 2 }
   });
   ```

4. **Use scoped loggers** for components:
   ```typescript
   const componentLogger = logger.scope({ component: 'UserProfile' });
   componentLogger.warn('User data incomplete', null, { 
     metadata: { missingFields: ['email', 'phone'] }
   });
   ```

### For API Error Handling

Network errors are automatically handled by the API service and will show Toast messages. For other errors:

```typescript
try {
  const result = await ApiService.someMethod();
} catch (error) {
  // Network errors already handled by API service
  // Handle business logic errors here if needed
}
```

## 🔮 Future Enhancements

1. **Remote Logging Integration**: Connect to services like Sentry, LogRocket, or custom logging endpoints
2. **Log Analytics**: Implement log aggregation and analysis
3. **Error Reporting**: Automatic error reporting with user consent
4. **Performance Monitoring**: Add performance metrics to logging
5. **Log Filtering**: Advanced filtering and search capabilities for logs

## 📝 Testing

To test the enhanced error handling:

1. **Network Errors**: Disconnect internet and perform API calls - should see Toast notifications
2. **Missing Translation Keys**: Use a non-existent i18n key - should see throttled logging
3. **API Errors**: Trigger server errors - should see appropriate logging and handling
4. **Component Errors**: Trigger errors in HomeScreen - should see contextual logging

## 🏁 Conclusion

The enhanced error handling and logging system provides a robust foundation for debugging, monitoring, and maintaining the MarketHub Mobile app. It improves both the developer experience and user experience by providing consistent, intelligent error handling throughout the application.
