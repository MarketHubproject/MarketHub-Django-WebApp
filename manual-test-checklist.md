# Manual QA Test Checklist

## Environment: Dev Mock API (USE_MOCK_API=true)
### Android Simulator:
- [ ] Launch app on Android simulator
- [ ] Verify mock login works (test@example.com / password)
- [ ] Check product list displays mock products with placeholder images
- [ ] Test auth flows (login/signup/logout)
- [ ] Verify error messages appear correctly
- [ ] Test navigation between screens

### iOS Simulator:
- [ ] Launch app on iOS simulator
- [ ] Verify mock login works (test@example.com / password)
- [ ] Check product list displays mock products with placeholder images
- [ ] Test auth flows (login/signup/logout)
- [ ] Verify error messages appear correctly
- [ ] Test navigation between screens

## Environment: Dev Real API (USE_MOCK_API=false)
### Android Simulator with Local Backend:
- [ ] Ensure local backend is running
- [ ] Launch app on Android simulator
- [ ] Test real authentication against local backend
- [ ] Verify product list fetches from real API
- [ ] Test error handling when server is down
- [ ] Verify images load from backend

### iOS Simulator with Local Backend:
- [ ] Ensure local backend is running
- [ ] Launch app on iOS simulator
- [ ] Test real authentication against local backend
- [ ] Verify product list fetches from real API
- [ ] Test error handling when server is down
- [ ] Verify images load from backend

## Environment: Staging
- [ ] Build staging version
- [ ] Test against staging server
- [ ] Verify all API endpoints work
- [ ] Test auth flows with staging accounts
- [ ] Check error handling for server issues
- [ ] Validate image loading from staging

## Environment: Production
- [ ] Build release version
- [ ] Test against production server (if safe)
- [ ] Verify production configuration is correct
- [ ] Check performance with production builds
- [ ] Validate all features work in release mode

## Critical Test Scenarios:
1. **Auth Flows:**
   - [ ] Login with valid credentials
   - [ ] Login with invalid credentials
   - [ ] Registration with new account
   - [ ] Logout functionality
   - [ ] Session persistence

2. **Product Features:**
   - [ ] Product list loading
   - [ ] Product detail view
   - [ ] Image loading and fallbacks
   - [ ] Search functionality
   - [ ] Category filtering

3. **Error Handling:**
   - [ ] Network timeout errors
   - [ ] Server unavailable errors
   - [ ] Invalid API responses
   - [ ] Image loading failures

4. **Environment Switching:**
   - [ ] Toggle USE_MOCK_API from true to false
   - [ ] Verify API endpoints change correctly
   - [ ] Test different environment files
   - [ ] Validate configuration loading