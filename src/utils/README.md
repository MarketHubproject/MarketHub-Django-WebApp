# Error Handling System

This directory contains utilities for consistent global API error handling in the MarketHub mobile app.

## Files

- **`ErrorToast.ts`**: Main utility for displaying user-friendly toast messages
- **`ApiErrorHandler.ts`**: Centralized error handler for API calls
- **`ErrorHandlingExamples.ts`**: Code examples showing how to use the error handling system
- **`index.ts`**: Exports for easy importing

## Key Features

### 1. Consistent Error Objects

Both `api.ts` and `mockApi.ts` now return consistent error objects with this structure:

```typescript
interface ApiError {
  title: string;    // User-friendly error title
  message: string;  // Detailed error message
}
```

### 2. Toast Messages

The `ErrorToast` utility provides methods for displaying different types of toast messages:

```typescript
// Show API error
ErrorToast.show({ title: 'Error', message: 'Something went wrong' });

// Show success message
ErrorToast.showSuccess('Success!', 'Operation completed');

// Show generic error
ErrorToast.showGeneric('An error occurred');

// Show network error
ErrorToast.showNetwork();
```

### 3. Centralized Error Handling

The `ApiErrorHandler` provides consistent error handling across the app:

```typescript
// Basic error handling with toast
ApiErrorHandler.handle(error);

// Silent error handling (no toast)
ApiErrorHandler.logOnly(error);

// Custom error message
ApiErrorHandler.handle(error, true, 'Custom message');

// Auth error with callback
ApiErrorHandler.handleAuth(error, () => navigateToLogin());
```

## Usage in Components

### Basic Pattern

```typescript
import { ApiErrorHandler, ErrorToast } from '../utils';
import api from '../services/api';

const MyComponent = () => {
  const handleApiCall = async () => {
    try {
      const result = await api.someMethod();
      ErrorToast.showSuccess('Success!', 'Operation completed');
      // Handle success...
    } catch (error) {
      ApiErrorHandler.handle(error);
    }
  };
};
```

### Advanced Patterns

```typescript
// Silent error handling
try {
  const data = await api.getData();
} catch (error) {
  ApiErrorHandler.logOnly(error);
  // Use fallback data...
}

// Custom error message
try {
  await api.deleteItem(id);
} catch (error) {
  ApiErrorHandler.handle(error, true, 'Failed to delete item. Please try again.');
}

// Authentication errors
try {
  const profile = await api.getUserProfile();
} catch (error) {
  ApiErrorHandler.handleAuth(error, () => {
    // Handle logout
    navigation.navigate('Login');
  });
}
```

## Setup Requirements

### 1. Install Dependencies

The error handling system requires `react-native-toast-message`:

```bash
npm install react-native-toast-message
```

### 2. Add Toast Provider to App

In your main App component, add the Toast component:

```typescript
import Toast from 'react-native-toast-message';

const App = () => {
  return (
    <NavigationContainer>
      {/* Your app content */}
      <Toast />
    </NavigationContainer>
  );
};
```

### 3. Optional: Custom Toast Configuration

You can customize toast appearance and behavior:

```typescript
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: 'green' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '400'
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 17,
        fontWeight: 'bold'
      }}
      text2Style={{
        fontSize: 15
      }}
    />
  ),
};

// In your App component:
<Toast config={toastConfig} />
```

## Error Types Handled

### API Errors (from api.ts)
- **400**: Invalid Request - "Please check your input and try again"
- **401**: Authentication Failed - "Invalid email or password"
- **403**: Access Denied - "You do not have permission to perform this action"
- **404**: Not Found - "The requested resource was not found"
- **422**: Validation Error - "Please check your input"
- **500**: Server Error - "Something went wrong on our end. Please try again later"
- **Network**: Connection issues - "Please check your internet connection and try again"

### Mock API Errors (from mockApi.ts)
- Authentication failures
- Product not found
- General errors with user-friendly messages

## Best Practices

1. **Always use try-catch blocks** with API calls
2. **Use ApiErrorHandler.handle()** for most error scenarios
3. **Show success messages** for important operations
4. **Use silent error handling** for background operations
5. **Customize error messages** for specific use cases
6. **Handle authentication errors** with proper navigation
7. **Log errors** for debugging purposes

## Migration Guide

If you have existing error handling, replace it with the new system:

### Before
```typescript
try {
  const result = await api.login(email, password);
} catch (error) {
  Alert.alert('Error', error.message);
}
```

### After
```typescript
try {
  const result = await api.login(email, password);
  ErrorToast.showSuccess('Welcome!', 'Login successful');
} catch (error) {
  ApiErrorHandler.handle(error);
}
```

This provides a much better user experience with consistent, professional-looking error messages.
