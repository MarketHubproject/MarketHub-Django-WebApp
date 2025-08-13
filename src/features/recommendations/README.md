# Personalized Recommendation Engine

This document describes the implementation of the personalized recommendation engine for MarketHub Mobile, which provides intelligent product suggestions to increase CTR and AOV.

## Architecture Overview

### Backend API
- **Endpoint**: `/api/v1/recommendations/?user_id={userId}`
- **Fallback**: Returns trending products when user-specific data is insufficient
- **Event Tracking**: `/api/v1/recommendations/events/` for impression and click logging

### Mobile Implementation

#### Core Components

1. **useRecommendations Hook** (`src/shared/hooks/useRecommendations.ts`)
   - React Query-powered hook for fetching and caching recommendations
   - Automatic offline caching with AsyncStorage
   - Impression and click tracking with mutations
   - Error handling with fallback to cached data
   - Configurable refresh intervals and contexts

2. **ProductCarousel Component** (`src/shared/ui/ProductCarousel.tsx`)
   - Reusable horizontal scrollable carousel for product recommendations
   - Automatic impression tracking when products become visible
   - Click tracking with ML feedback logging
   - Responsive design with different card sizes
   - Loading states and error handling

3. **API Integration** (`src/services/api.ts`)
   - New `getRecommendations(userId)` method
   - `logProductImpression()` and `logProductClick()` for ML feedback
   - Non-blocking logging (failures don't affect user experience)

#### Key Features

##### 1. Smart Caching Strategy
- **React Query**: 5-minute stale time, 30-minute garbage collection
- **Offline Cache**: AsyncStorage fallback for network failures
- **Cache Validation**: 1-hour expiry for offline data
- **Prefetching**: Proactive loading for better UX

##### 2. Impression & Click Tracking
- **Automatic Impressions**: Logged when products are 50% visible for 1 second
- **Click Events**: Tracked with context and user information
- **ML Feedback Loop**: Data sent to backend for algorithm improvements
- **Non-intrusive**: Failures don't impact user experience

##### 3. Multi-Context Support
- **Home Screen**: General recommendations and trending
- **Product Detail**: Similar and related products
- **Cart Screen**: Cross-sell and upsell suggestions
- **Context-Aware**: Different recommendation types per screen

##### 4. Recommendation Types
- `personal`: "Just for you" - personalized recommendations
- `trending`: Popular products across all users
- `similar`: "Because you viewed..." - similar products
- `recently_viewed`: Recently browsed products
- `category_based`: Category-specific suggestions

## Implementation Details

### HomeScreen Integration
```typescript
// Hook initialization
const {
  sections: recommendationSections,
  isLoading: recommendationsLoading,
  logImpression,
  logClick,
  error: recommendationsError
} = useRecommendations(userId || undefined, {
  context: 'home',
  enabled: true
});

// Carousel rendering
{recommendationSections && recommendationSections.length > 0 && (
  <View style={styles.recommendationsContainer}>
    {recommendationSections.map((section) => (
      <ProductCarousel
        key={section.id}
        section={section}
        onProductImpression={logImpression}
        onProductClick={logClick}
        onProductPress={handleProductPress}
        testID={`recommendation-section-${section.type}`}
      />
    ))}
  </View>
)}
```

### Data Flow
1. **User Context**: User ID fetched from AsyncStorage
2. **API Request**: Recommendations fetched via React Query
3. **Caching**: Data cached both in-memory (React Query) and offline (AsyncStorage)
4. **Display**: Products shown in horizontal carousels
5. **Interaction Tracking**: Impressions and clicks logged for ML feedback
6. **Fallback**: Trending products shown when personalized data unavailable

### Performance Optimizations
- **Lazy Loading**: Recommendations load independently from main content
- **Image Optimization**: Placeholder handling for missing images
- **Memory Management**: Proper cleanup with React Query garbage collection
- **Network Efficiency**: Retry logic with exponential backoff

## Screen Integration Status

### ✅ Implemented
- **HomeScreen**: Full recommendation carousels with impression tracking

### 🚧 Next Steps
- **ProductDetailScreen**: Similar products and cross-sell recommendations
- **CartScreen**: Upsell and related product suggestions

## Configuration

### Environment Variables
```javascript
// API endpoints configured in src/config/environment.js
API_BASE_URL: 'https://api.markethub.com'
```

### Customization Options
```typescript
// Hook configuration
useRecommendations(userId, {
  context: 'home',           // Context for recommendations
  enabled: true,             // Enable/disable fetching
  refreshInterval: 300000,   // 5 minutes auto-refresh
});

// Carousel configuration
<ProductCarousel
  section={section}
  cardWidth={screenWidth * 0.7}  // Custom card width
  showTitle={true}               // Show section titles
/>
```

## Analytics & KPIs

### Tracked Metrics
- **CTR**: Click-through rate from recommendations
- **AOV**: Average order value from recommended products
- **Impression Rate**: How often recommendations are viewed
- **Conversion Rate**: Purchases from recommendations

### Event Logging
```typescript
// Automatic impression tracking
onProductImpression: (productId, context) => {
  apiService.logProductImpression(productId, userId, context);
}

// Click tracking
onProductClick: (productId, context) => {
  apiService.logProductClick(productId, userId, context);
}
```

## Error Handling

### Graceful Degradation
1. **API Failures**: Fall back to cached data
2. **Network Issues**: Show cached recommendations
3. **No Data**: Hide recommendation sections
4. **Image Errors**: Display placeholder icons

### Logging Strategy
- **API Errors**: Full error logging with context
- **Network Issues**: Warning logs with retry attempts
- **Tracking Failures**: Silent failures, no user impact

## Testing Strategy

### Unit Tests
- Hook functionality with different user states
- Component rendering with various data scenarios
- Error handling and fallback behavior

### Integration Tests
- End-to-end recommendation flow
- Impression and click tracking validation
- Cache behavior verification

### Performance Tests
- Memory usage with large datasets
- Scroll performance with many carousels
- Network efficiency measurements

## Future Enhancements

### Planned Features
1. **A/B Testing**: Different recommendation algorithms
2. **Real-time Updates**: WebSocket-based live recommendations
3. **Advanced Filtering**: User preference-based filtering
4. **Push Notifications**: Personalized product alerts

### Architecture Improvements
1. **Machine Learning**: On-device recommendation scoring
2. **Advanced Caching**: Multi-layered cache strategy
3. **Analytics Dashboard**: Real-time performance monitoring
4. **Personalization Engine**: More sophisticated user profiling

## Troubleshooting

### Common Issues
1. **No Recommendations**: Check user authentication and API connectivity
2. **Slow Loading**: Verify cache configuration and network conditions
3. **Missing Images**: Ensure proper placeholder handling
4. **Tracking Issues**: Validate user ID and network connectivity

### Debug Tools
```typescript
// Enable debug logging
logger.setLevel('debug');

// Monitor recommendation data
console.log('Recommendations:', recommendationSections);

// Track API calls
console.log('API Response:', recommendations);
```
