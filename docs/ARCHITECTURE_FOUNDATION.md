# MarketHub Mobile - Architecture Foundation

## Overview

This document outlines the new architecture foundation established for the MarketHub Mobile app, implementing modern React Native best practices with TypeScript, React Query, Zustand, and Feature-Slice Design pattern.

## 🏗️ Architecture Overview

### Feature-Slice Design (FSD)

The app now follows Feature-Slice Design methodology for better scalability and maintainability:

```
src/
├── features/                 # Feature-specific code
│   ├── auth/
│   │   ├── api/             # Auth API calls
│   │   ├── hooks/           # Auth React Query hooks
│   │   ├── ui/              # Auth UI components
│   │   └── utils/           # Auth utility functions
│   ├── products/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── ui/
│   │   └── utils/
│   ├── cart/
│   ├── favorites/
│   ├── profile/
│   └── orders/
├── shared/                   # Shared resources
│   ├── api/                 # Query client, common API logic
│   ├── stores/              # Zustand global stores
│   ├── ui/                  # Reusable UI components
│   ├── hooks/               # Reusable hooks
│   ├── types/               # TypeScript type definitions
│   └── constants/           # App constants
├── components/              # Legacy shared components (to be migrated)
├── screens/                 # Screen components
├── navigation/              # Navigation configuration
├── services/                # API services
├── utils/                   # Utility functions
└── contexts/                # React Context providers
```

## 🛠️ Technology Stack

### State Management

1. **React Query (@tanstack/react-query)** - Server state management
   - Caching, synchronization, and background updates
   - Optimistic updates and error handling
   - Automatic retries and stale-while-revalidate

2. **Zustand** - Client state management
   - Authentication state
   - App preferences and settings
   - Loyalty program data
   - Non-server-backed state

### Type Safety

- **TypeScript 5.0+** with strict configuration
- Comprehensive type definitions in `src/shared/types/`
- Absolute imports with path mapping (`@/` prefix)

### Code Quality

- **ESLint** with React Native, TypeScript, and custom rules
- **Prettier** for consistent code formatting
- **Feature-slice architecture enforcement** via ESLint rules

## 📊 State Management Strategy

### Server State (React Query)

Used for data that comes from the server:

```typescript
// Products
const { data: products, isLoading, error } = useProducts(1, { category: 'electronics' });

// Single product
const { data: product } = useProduct(productId);

// Mutations
const loginMutation = useLogin();
```

### Client State (Zustand)

Used for app-level state that doesn't come from the server:

```typescript
// Auth store
const { user, isAuthenticated, login, logout } = useAuthStore();

// App preferences
const { preferences, updatePreferences } = useAppStore();
```

## 🔧 Configuration

### Absolute Imports

Configured via TypeScript and Metro:

```typescript
import { ProductCard } from '@/features/products/ui/ProductCard';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { queryClient } from '@/shared/api/queryClient';
```

### ESLint Rules

- Enforces feature-slice architecture boundaries
- Prevents cross-feature imports (use shared layer instead)
- Maintains import order and formatting

### React Query Setup

```typescript
// src/shared/api/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      retry: 3,
    },
  },
});
```

## 📱 Usage Examples

### Feature Hook Usage

```typescript
// In a component
import { useProducts } from '@/features/products/hooks/useProducts';
import { useAuth } from '@/features/auth/hooks/useAuth';

const ProductsScreen = () => {
  const { data: products, isLoading } = useProducts(1);
  const { user, isAuthenticated } = useAuth();

  if (isLoading) return <Loading />;
  
  return (
    <FlatList 
      data={products?.data}
      renderItem={({ item }) => <ProductCard product={item} />}
    />
  );
};
```

### Global State Usage

```typescript
import { useAuthStore } from '@/shared/stores/authStore';
import { useAppStore } from '@/shared/stores/appStore';

const ProfileScreen = () => {
  const { user, logout } = useAuthStore();
  const { preferences, updatePreferences } = useAppStore();
  
  return (
    <View>
      <Text>Welcome, {user?.firstName}!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
};
```

## 🔄 Migration Strategy

### From Old Context to New Architecture

1. **Auth Context → Auth Store + Hooks**
   - ✅ `AuthContext` → `useAuthStore` + `useAuth` hook
   - ✅ Server state moved to React Query
   - ✅ Client state moved to Zustand

2. **Component Migration**
   - Move components to appropriate feature folders
   - Update imports to use absolute paths
   - Add proper TypeScript types

3. **API Layer Modernization**
   - Wrap existing API service with React Query
   - Add proper error handling and retries
   - Implement optimistic updates where appropriate

## 🎯 Benefits

### Developer Experience

- **Better IntelliSense** with strict TypeScript
- **Faster development** with absolute imports
- **Consistent code** with ESLint + Prettier
- **Better debugging** with React Query DevTools

### Performance

- **Automatic caching** with React Query
- **Optimized re-renders** with Zustand selectors
- **Background updates** without user intervention
- **Offline support** with stale-while-revalidate

### Maintainability

- **Clear separation** of concerns with FSD
- **Scalable architecture** for new features
- **Type safety** prevents runtime errors
- **Easy testing** with isolated features

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Test React Query hooks
import { renderHook, waitFor } from '@testing-library/react-native';
import { useProducts } from '@/features/products/hooks/useProducts';

test('should fetch products', async () => {
  const { result } = renderHook(() => useProducts());
  
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  
  expect(result.current.data).toBeDefined();
});
```

### Integration Tests

- Test feature workflows end-to-end
- Mock API responses consistently
- Test error handling and retry logic

## 🚀 Next Steps

### Immediate

1. **Complete component migration** to feature folders
2. **Add remaining React Query hooks** for all API endpoints
3. **Implement optimistic updates** for mutations
4. **Add error boundaries** and loading states

### Future Enhancements

1. **Offline support** with React Query persistence
2. **Background sync** for critical operations
3. **Advanced caching strategies** per feature
4. **Performance monitoring** and analytics

## 📚 Resources

- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Native TypeScript](https://reactnative.dev/docs/typescript)

## 🤝 Contributing

When adding new features:

1. Follow the feature-slice structure
2. Use React Query for server state
3. Use Zustand for client state
4. Add proper TypeScript types
5. Update this documentation

---

*This architecture foundation provides a scalable, maintainable, and type-safe foundation for the MarketHub Mobile app. The combination of React Query, Zustand, and Feature-Slice Design ensures the app can grow efficiently while maintaining code quality.*
