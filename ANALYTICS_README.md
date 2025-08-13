# Analytics, A/B Testing & Feature Flags Implementation

This implementation provides comprehensive analytics tracking, A/B testing capabilities, and feature flagging using Firebase Analytics and Firebase Remote Config.

## 🚀 Features Implemented

### ✅ Firebase Analytics Events
- **Complete Funnel Tracking**: browse → view → add to cart → checkout → purchase
- **Standardized Event Names** via `analytics.ts` helper
- **Rich Event Parameters** for detailed analysis
- **Error Tracking** and API monitoring

### ✅ Firebase Remote Config
- **Feature Flags** for gradual rollouts
- **A/B Testing Support** with user bucketing
- **Real-time Configuration** updates
- **Percentage-based Rollouts** (e.g., AR feature to 10% of users)

### ✅ Analytics Dashboard
- **Key Metrics Visualization** (DAU, conversion rates, revenue)
- **Funnel Analysis** with drop-off rates
- **Feature Flag Management** with toggle controls
- **A/B Test Monitoring** with live results

## 📊 Funnel Events Tracked

### 1. Browse Products (`browse_products`)
**Triggered:** When users view product categories or search
```typescript
AnalyticsService.trackProductBrowse({
  category: 'electronics',
  search_term: 'headphones',
  results_count: 25
});
```

### 2. View Product (`view_item`)
**Triggered:** When users view individual product details
```typescript
AnalyticsService.trackProductView({
  item_id: '123',
  item_name: 'Wireless Headphones',
  item_category: 'electronics',
  price: 299.99,
  currency: 'ZAR'
});
```

### 3. Add to Cart (`add_to_cart`)
**Triggered:** When users add products to cart
```typescript
AnalyticsService.trackAddToCart({
  item_id: '123',
  item_name: 'Wireless Headphones',
  price: 299.99,
  currency: 'ZAR',
  quantity: 1
});
```

### 4. Begin Checkout (`begin_checkout`)
**Triggered:** When users start the checkout process
```typescript
AnalyticsService.trackCheckoutBegin({
  value: 599.98,
  currency: 'ZAR',
  items: [...],
  coupon: 'SAVE10'
});
```

### 5. Complete Purchase (`purchase`)
**Triggered:** When users complete an order
```typescript
AnalyticsService.trackPurchase({
  transaction_id: 'ORD-123456',
  value: 599.98,
  currency: 'ZAR',
  items: [...],
  payment_method: 'card'
});
```

## 🎯 Feature Flags Configuration

### Available Feature Flags
```typescript
export const FEATURE_FLAGS = {
  AR_ROLLOUT_PERCENTAGE: 'ar_rollout_percentage',      // 10% rollout
  NEW_CHECKOUT_FLOW: 'enable_new_checkout_flow',       // Boolean
  RECOMMENDATION_ENGINE: 'enable_recommendations',      // Boolean  
  CHAT_SUPPORT: 'enable_chat_support',                 // Boolean
  SUBSCRIPTION_FEATURE: 'enable_subscriptions',        // Boolean
  ADVANCED_FILTERS: 'enable_advanced_filters',         // Boolean
  DARK_MODE: 'enable_dark_mode',                       // Boolean
};
```

### Usage Examples
```typescript
// Check if AR feature is enabled for current user
const isAREnabled = await AnalyticsService.isAREnabled();

// Get specific feature flag
const hasNewCheckout = await AnalyticsService.getFeatureFlag(
  FEATURE_FLAGS.NEW_CHECKOUT_FLOW, 
  false
);

// Get all feature flags
const allFlags = await AnalyticsService.getAllFeatureFlags();
```

## 🔧 Implementation Files

### Core Analytics Service
- **`src/services/analytics.ts`** - Main analytics service with all tracking methods
- **`src/services/firebase.ts`** - Updated to initialize analytics service

### Updated Components with Tracking
- **`src/contexts/CartContext.tsx`** - Add to cart tracking
- **`src/screens/CheckoutScreen.tsx`** - Checkout and purchase tracking  
- **`src/screens/ProductCategoriesScreen.tsx`** - Browse and view tracking

### Analytics Dashboard
- **`src/screens/AnalyticsDashboardScreen.tsx`** - Complete dashboard for monitoring metrics and managing feature flags

## 📈 Dashboard Features

### Key Metrics Cards
- **Daily Active Users** with trend indicators
- **Conversion Rate** tracking  
- **Revenue** monitoring
- **Cart Abandonment** rates

### Conversion Funnel Visualization
- Step-by-step funnel with user counts
- Conversion rates at each stage
- Drop-off rate calculations
- Visual progress bars

### Feature Flag Management
- **Toggle Controls** for boolean flags
- **Percentage Sliders** for rollout flags
- **Real-time Updates** with confirmation
- **Status Indicators** for active experiments

### A/B Test Monitoring
- **Active Experiments** display
- **Live Metrics** (engagement, conversion, bounce rate)
- **Rollout Percentage** tracking
- **Status Management** (Active, Paused, Completed)

## 🛠 Setup Instructions

### 1. Install Dependencies
```bash
# Firebase Remote Config already installed
npm install @react-native-firebase/remote-config@20.5.0
```

### 2. Initialize Analytics Service
The service is automatically initialized when Firebase service starts up.

### 3. Firebase Console Configuration
1. Go to Firebase Console → Remote Config
2. Add the feature flag parameters:
   - `ar_rollout_percentage` (Number, default: 10)
   - `enable_new_checkout_flow` (Boolean, default: false)
   - `enable_recommendations` (Boolean, default: true)
   - etc.

### 4. Add Dashboard to Navigation
```typescript
// Add to your navigation stack
<Stack.Screen 
  name="AnalyticsDashboard" 
  component={AnalyticsDashboardScreen} 
  options={{ title: 'Analytics' }}
/>
```

## 📊 Analytics Events Reference

### Standard E-commerce Events
All events follow Google Analytics 4 Enhanced Ecommerce specification:

- `browse_products` - Product browsing
- `view_item` - Product detail views  
- `add_to_cart` - Cart additions
- `remove_from_cart` - Cart removals
- `view_cart` - Cart views
- `begin_checkout` - Checkout starts
- `purchase` - Completed orders

### Custom Events
- `search` - Product searches
- `share` - Product sharing
- `add_to_wishlist` - Wishlist additions
- `ar_view_start` - AR feature usage
- `ar_view_end` - AR session completion
- `error_occurred` - Error tracking
- `feature_flag_changed` - Flag modifications

## 🎯 A/B Testing Implementation

### User Bucketing
Users are consistently bucketed using a hash of their user ID:
```typescript
private simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

### AR Feature Rollout Example
```typescript
async isAREnabled(): Promise<boolean> {
  const rolloutPercentage = await this.getFeatureFlag(
    FEATURE_FLAGS.AR_ROLLOUT_PERCENTAGE, 
    10
  );
  
  const userId = this.userProperties.user_id || 'anonymous';
  const hash = this.simpleHash(userId) % 100;
  
  return hash < rolloutPercentage;
}
```

## 🔍 Monitoring & Debugging

### Analytics Tracking
All events are logged to console in development:
```
Analytics event tracked: add_to_cart {
  item_id: "123",
  item_name: "Wireless Headphones", 
  value: 299.99,
  timestamp: 1642678800000
}
```

### Feature Flag Changes
Flag modifications are tracked:
```typescript
await AnalyticsService.trackEvent('feature_flag_changed', {
  flag_key: 'ar_rollout_percentage',
  new_value: 25,
  changed_by: 'admin_dashboard'
});
```

### Error Handling
Automatic error tracking with context:
```typescript
await AnalyticsService.trackError(error, {
  component: 'CheckoutScreen',
  action: 'handlePlaceOrder',
  user_id: currentUser.id
});
```

## 📱 Dashboard Access

The analytics dashboard provides a complete view of:

1. **Real-time Metrics** - Key performance indicators
2. **Funnel Analysis** - Step-by-step conversion tracking  
3. **Feature Management** - Toggle flags and adjust rollouts
4. **Experiment Results** - A/B test performance data
5. **Error Monitoring** - Application health metrics

### Mobile-Optimized UI
- **Responsive Design** for mobile devices
- **Touch-friendly Controls** for feature flag management
- **Pull-to-refresh** for real-time data updates
- **Loading States** and error handling

## 🚀 Next Steps

### Enhanced Analytics
1. **Custom Dimensions** for user segmentation
2. **Cohort Analysis** for retention tracking
3. **Attribution Modeling** for marketing channels
4. **Real-time Reporting** integration

### Advanced A/B Testing  
1. **Multi-variate Testing** support
2. **Statistical Significance** calculations
3. **Automated Flag Management** based on performance
4. **Integration with Marketing Tools**

### Performance Monitoring
1. **App Performance Metrics** (load times, crashes)
2. **User Experience Tracking** (rage clicks, session duration)  
3. **Business Intelligence** integration
4. **Automated Alerting** for anomalies

---

## 📞 Support

For questions about the analytics implementation:
1. Check Firebase Console for real-time data
2. Use the built-in dashboard for monitoring
3. Review console logs for debugging
4. Test feature flags in development mode

The implementation provides a solid foundation for data-driven decision making and continuous optimization of the mobile commerce experience.
