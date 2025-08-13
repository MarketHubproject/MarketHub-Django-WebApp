# Firebase Analytics Reintegration Ticket

## Issue Title
**[HOTFIX FOLLOWUP] Restore Firebase Analytics functionality after temporary removal**

## Priority
**Medium** (Technical debt - functionality temporarily disabled)

## Description
Firebase Analytics was temporarily disabled and stubbed out to resolve critical build/runtime issues in the application. This ticket tracks the work required to properly reintegrate Firebase Analytics once the underlying issues are resolved.

## Background
- **Branch**: `hotfix/disable-firebase-analytics`
- **Commit**: `60cf3d6`
- **Date Removed**: December 19, 2024
- **Reason**: Build/runtime issues preventing application from functioning

## What Was Removed/Stubbed

### Dependencies
- `@react-native-firebase/analytics` package removed from package.json

### Code Changes
1. **Firebase Configuration** (`src/services/firebase.ts`)
   - Removed analytics initialization
   - Commented out analytics import

2. **Analytics Service** (`src/services/analytics.ts`)
   - All tracking functions stubbed with no-op implementations
   - Maintains API compatibility

3. **Analytics Stub Utility** (`src/utils/analyticsStub.ts`)
   - Created comprehensive stub implementations
   - Console logging for development tracking

4. **Screen Updates**
   - `AnalyticsDashboardScreen.tsx`: Mock data display
   - `CheckoutScreen.tsx`: Stubbed purchase tracking
   - `ProductCategoriesScreen.tsx`: Stubbed view tracking

5. **Context Updates**
   - `CartContext.tsx`: Stubbed cart analytics events

6. **AR Service** (`src/services/arService.ts`)
   - Stubbed AR interaction tracking

## Reintegration Steps

### Phase 1: Investigation & Resolution
- [ ] Investigate root cause of original Firebase Analytics issues
- [ ] Verify Firebase project configuration
- [ ] Test Firebase Analytics in isolation
- [ ] Resolve any iOS/Android platform-specific issues
- [ ] Ensure proper Firebase SDK versions compatibility

### Phase 2: Dependency Restoration
- [ ] Add `@react-native-firebase/analytics` back to package.json
- [ ] Update to latest compatible version
- [ ] Run `npm install` or `yarn install`
- [ ] Update iOS Podfile if necessary (`cd ios && pod install`)

### Phase 3: Code Restoration
- [ ] **Firebase Service** (`src/services/firebase.ts`)
  - [ ] Uncomment analytics import
  - [ ] Restore analytics initialization
  - [ ] Test Firebase connection

- [ ] **Analytics Service** (`src/services/analytics.ts`)
  - [ ] Replace stub implementations with real Firebase calls
  - [ ] Restore all tracking methods:
    - [ ] `logEvent()`
    - [ ] `setUserProperties()`
    - [ ] `setUserId()`
    - [ ] `logScreenView()`
    - [ ] `logPurchase()`

- [ ] **Screen Restorations**
  - [ ] `AnalyticsDashboardScreen.tsx`: Restore real analytics data fetching
  - [ ] `CheckoutScreen.tsx`: Restore purchase event tracking
  - [ ] `ProductCategoriesScreen.tsx`: Restore view tracking
  - [ ] `CartContext.tsx`: Restore cart analytics
  - [ ] `arService.ts`: Restore AR interaction tracking

### Phase 4: Testing
- [ ] Unit tests for analytics service
- [ ] Integration tests for Firebase connection
- [ ] Manual testing on iOS simulator
- [ ] Manual testing on Android emulator
- [ ] Verify analytics data appears in Firebase console
- [ ] Test all analytics events are firing correctly

### Phase 5: Cleanup
- [ ] Remove `src/utils/analyticsStub.ts`
- [ ] Remove `ANALYTICS_REMOVAL_NOTE.md`
- [ ] Update any remaining stub references
- [ ] Remove console.log statements from stub period

### Phase 6: Documentation
- [ ] Update README with analytics setup instructions
- [ ] Document Firebase configuration requirements
- [ ] Add troubleshooting section for analytics issues

## Files to Restore/Modify

```
package.json                              # Add analytics dependency
src/services/firebase.ts                  # Restore analytics init
src/services/analytics.ts                 # Replace all stubs with real implementations
src/screens/AnalyticsDashboardScreen.tsx  # Restore real data fetching
src/screens/CheckoutScreen.tsx            # Restore purchase tracking
src/screens/ProductCategoriesScreen.tsx   # Restore view tracking
src/contexts/CartContext.tsx              # Restore cart analytics
src/services/arService.ts                 # Restore AR tracking

Files to remove:
src/utils/analyticsStub.ts               # Delete stub utility
ANALYTICS_REMOVAL_NOTE.md                # Delete temporary documentation
```

## Testing Checklist
- [ ] App builds successfully on both platforms
- [ ] Firebase connection established
- [ ] Analytics events visible in Firebase Console
- [ ] No console errors related to analytics
- [ ] All screen tracking working
- [ ] Purchase events recording correctly
- [ ] User property setting functional
- [ ] Performance impact acceptable

## Acceptance Criteria
- [ ] All analytics functionality restored to pre-removal state
- [ ] No build or runtime errors
- [ ] Analytics data flowing to Firebase console
- [ ] Code cleanup completed (stubs removed)
- [ ] Documentation updated
- [ ] Tests passing

## Risk Assessment
**Low Risk** - The stubbing approach maintained API compatibility, so restoration should be straightforward once underlying issues are resolved.

## Dependencies
- Resolution of original Firebase Analytics build/runtime issues
- Access to Firebase project configuration
- Testing devices/simulators for both platforms

## Notes
- All analytics API calls were preserved during stubbing to minimize integration effort
- Consider adding error handling and fallback mechanisms during reintegration
- Monitor analytics data quality after restoration
- Document any configuration changes needed for future reference

---
**Created**: December 19, 2024  
**Reporter**: Development Team  
**Assignee**: [TBD]  
**Epic**: Technical Debt Resolution
