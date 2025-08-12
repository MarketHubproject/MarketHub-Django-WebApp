# SmartImage Components

This directory contains universal image components with graceful fallback handling for the MarketHub Mobile app.

## Components

### SmartImage
A memoized image component that provides:
- **Loading States**: Shows ActivityIndicator while images are loading
- **Error Fallback**: Displays placeholder images with text when image loading fails
- **URL Processing**: Automatically processes image URLs through `getImageUrl` helper
- **Memoization**: React.memo optimization to prevent unnecessary re-renders

**Props:**
- `source`: Image source (URI or require)
- `style`: Image/View styles
- `resizeMode`: Image resize mode ('cover', 'contain', etc.)
- `fallbackText`: Text to display on error (optional)
- `loadingSize`: ActivityIndicator size ('small' | 'large')
- `loadingColor`: Loading indicator color
- `onLoad`: Callback when image loads successfully
- `onError`: Callback when image fails to load

### SmartAvatar
A specialized avatar component that provides:
- **Profile Images**: Displays user profile images when available
- **Initials Fallback**: Shows user initials when no image is provided
- **Loading States**: ActivityIndicator while loading profile images
- **Error Handling**: Falls back to initials on image load errors
- **Customizable**: Configurable size, colors, and styling

**Props:**
- `imageUri`: Profile image URI (optional)
- `name`: User's full name for generating initials
- `size`: Avatar diameter in pixels (default: 80)
- `backgroundColor`: Background color for initials
- `textColor`: Text color for initials
- `style`: Container styles
- `textStyle`: Text styles for initials
- `loadingColor`: Loading indicator color

## Usage Examples

### Product Images
```tsx
import { SmartImage } from '../components';

<SmartImage
  source={{ uri: getProductImageUrl(product) }}
  style={styles.productImage}
  resizeMode="cover"
  fallbackText={product.name}
/>
```

### Profile Avatars
```tsx
import { SmartAvatar } from '../components';

<SmartAvatar
  name="John Doe"
  imageUri={user.profileImage}
  size={80}
  backgroundColor="#F0F8FF"
  textColor="#007AFF"
/>
```

## Implementation Details

### Key Features
1. **Reuses Existing Utilities**: Leverages `getImageUrl` and `getPlaceholderImageUrl` from `config/environment.ts`
2. **Memoization**: Both components use React.memo to prevent unnecessary re-renders
3. **TypeScript**: Full TypeScript support with proper prop interfaces
4. **Error Handling**: Graceful fallbacks with user-friendly placeholder content
5. **Loading States**: Consistent loading indicators across all image components

### Files Updated
- `src/screens/HomeScreen.tsx` - Product cards in featured products
- `src/screens/ProductsScreen.tsx` - Product grid images
- `src/screens/ProductDetailScreen.tsx` - Main product image
- `src/screens/FavoritesScreen.tsx` - Favorite product images
- `src/screens/CartScreen.tsx` - Cart item images
- `src/screens/ProfileScreen.tsx` - User avatar (replaced icon with SmartAvatar)

### Benefits
- **Consistent UX**: All images now have loading states and error fallbacks
- **Better Performance**: Memoization reduces unnecessary re-renders
- **User Feedback**: Loading indicators provide visual feedback
- **Graceful Degradation**: Meaningful fallbacks when images fail to load
- **Maintainability**: Centralized image handling logic
