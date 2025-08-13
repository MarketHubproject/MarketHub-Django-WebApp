# Social Sharing & Referral System Implementation

This implementation provides a comprehensive social sharing and referral system for the MarketHub mobile app using Branch.io for deep linking and `react-native-share` for native sharing functionality.

## Features Implemented

### 1. 📱 **Shareable Deep Links with Branch.io**
- ✅ Product sharing with referral codes
- ✅ Order success sharing with referral rewards
- ✅ General referral link generation
- ✅ Deep link handling and navigation
- ✅ Referral link click tracking

### 2. 🔗 **One-Tap Sharing Integration**
- ✅ `react-native-share` integration
- ✅ Share from ProductDetail screen
- ✅ Share from OrderSuccess screen  
- ✅ Platform-specific sharing options
- ✅ Copy to clipboard functionality

### 3. 🎁 **Backend Referral Tracking**
- ✅ Referral code generation and validation
- ✅ Automatic coupon rewards for both parties
- ✅ Referral status tracking (pending/successful/expired)
- ✅ Comprehensive analytics and reporting

### 4. 📊 **Profile Referral Statistics**
- ✅ Complete referral dashboard
- ✅ Statistics visualization (total, successful, pending referrals)
- ✅ Available coupons management
- ✅ Referral history with user details
- ✅ Earnings tracking

## Files Created/Modified

### New Services
- `src/services/referralService.ts` - Core referral functionality
- `src/services/sharingService.ts` - Social sharing utilities

### Updated Services
- `src/services/deepLinkService.ts` - Added referral link handling

### New Components
- `src/components/ReferralStats.tsx` - Comprehensive referral statistics UI

### Updated Screens
- `src/screens/ProductDetailScreen.tsx` - Added referral-based sharing
- `src/screens/OrderConfirmationScreen.tsx` - Added order success sharing
- `src/screens/ProfileScreen.tsx` - Added referral program access

### Backend Example
- `src/api/referralApi.example.js` - Complete backend API implementation

## Installation & Setup

### 1. Install Dependencies

```bash
npm install react-native-share
```

### 2. Branch.io Configuration

The app already has `react-native-branch` installed. Ensure your Branch.io dashboard is configured with:

- **Deep Link Domains**: Your custom domain for deep links
- **Universal Links** (iOS): Configured in your Apple Developer account
- **App Links** (Android): Configured in your Google Play Console
- **Custom URL Schemes**: `markethub://` for fallback

### 3. Backend Integration

Implement the referral API endpoints using the provided example:

```javascript
// Express.js example
const express = require('express');
const referralRoutes = require('./src/api/referralApi.example');
const app = express();

app.use(express.json());
app.use('/api/referrals', referralRoutes);
```

### 4. Database Setup

Create the following database tables (PostgreSQL example):

```sql
-- Referral codes table
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  total_successful_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referrals table
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referral_code VARCHAR(20) REFERENCES referral_codes(referral_code),
  referrer_user_id INTEGER REFERENCES users(id),
  referred_user_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

-- Referral coupons table
CREATE TABLE referral_coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- referrer, referee
  discount DECIMAL(10,2) NOT NULL,
  discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
  user_id INTEGER REFERENCES users(id),
  referral_id INTEGER REFERENCES referrals(id),
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  order_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### 1. Sharing a Product

```typescript
// In ProductDetailScreen
import sharingService from '../services/sharingService';

const handleShare = async () => {
  const success = await sharingService.shareProduct({
    productId: product.id.toString(),
    productName: product.name,
    productPrice: product.price,
    productImage: product.image,
    userId: currentUser.id,
    referralCode: userReferralCode,
  });
  
  if (success) {
    Alert.alert('Shared!', 'Product shared with your referral code!');
  }
};
```

### 2. Accessing Referral Statistics

```typescript
// In ProfileScreen
import ReferralStats from '../components/ReferralStats';

<ReferralStats
  userId={user.id}
  userName={`${user.first_name} ${user.last_name}`}
  userReferralCode={referralCode}
/>
```

### 3. Backend Referral Processing

```javascript
// When a new user registers with a referral code
app.post('/api/referrals/apply', async (req, res) => {
  const { referralCode, newUserId } = req.body;
  
  // Process referral and create rewards
  const result = await referralService.applyReferralCode(referralCode, newUserId);
  
  res.json(result);
});
```

## Referral Flow

### 1. **User Shares Product/Order**
- User taps share button on ProductDetail or OrderConfirmation
- App generates Branch.io deep link with referral code
- Share options presented via `react-native-share`

### 2. **Friend Clicks Referral Link**
- Branch.io handles deep link routing
- App stores referral data locally
- User guided to registration/product page

### 3. **Friend Registers/Makes Purchase**
- App applies stored referral code
- Backend creates referral record
- Both users receive coupon rewards

### 4. **Rewards Tracking**
- Referral marked as successful when referee makes first purchase
- Statistics updated in real-time
- Users can view earnings and history in Profile

## Customization

### Referral Rewards
Modify reward values in the backend API:

```javascript
// In referralApi.example.js
const refereeCoupon = {
  discount: 10, // 10% discount for new users
  discountType: 'percentage',
  // ...
};

const referrerCoupon = {
  discount: 50, // R50 reward for referrer
  discountType: 'fixed',
  // ...
};
```

### Share Messages
Customize share messages in `referralService.ts`:

```typescript
return {
  url,
  title: 'Join MarketHub!',
  message: `Hey! I'm using MarketHub for amazing deals and thought you'd love it too. Join with my referral code ${referralCode} and we both get exclusive rewards! ${url}`,
};
```

### Deep Link Routing
Add custom deep link handling in `deepLinkService.ts`:

```typescript
case 'special-offer':
  return {
    screen: 'SpecialOffer',
    params: { 
      offerId: secondSegment,
      referralCode: searchParams.get('ref') 
    },
  };
```

## Analytics & Monitoring

### Key Metrics to Track
- **Referral Link Clicks**: How many people clicked referral links
- **Conversion Rate**: Percentage of clicks that result in registrations
- **Referral Success Rate**: Percentage of referrals that make first purchase
- **Average Referral Value**: Revenue generated per successful referral
- **Top Referrers**: Users generating most successful referrals

### Implementation
The system tracks:
- Link clicks (via Branch.io and backend)
- Referral registrations
- First purchase completions
- Coupon usage rates
- User engagement with referral features

## Security Considerations

1. **Referral Code Validation**: All codes validated server-side
2. **One-Time Use**: Prevents users from using multiple referral codes
3. **Expiry Dates**: Coupons have expiration dates
4. **Fraud Prevention**: Track unusual patterns in referral activity
5. **Rate Limiting**: Prevent abuse of referral link generation

## Testing

### Test Scenarios
1. **Share Product** → Verify deep link generation and sharing
2. **Click Referral Link** → Verify deep link handling and data storage
3. **Register with Referral** → Verify coupon creation for both users
4. **Make First Purchase** → Verify referral completion and rewards
5. **View Statistics** → Verify accurate data display

### Debug Tools
- Branch.io dashboard for link analytics
- App logs for referral processing
- Backend API logs for reward creation
- Database queries for data verification

## Troubleshooting

### Common Issues

**1. Deep Links Not Working**
- Check Branch.io SDK configuration
- Verify Universal Links/App Links setup
- Test URL scheme fallbacks

**2. Sharing Not Working**
- Ensure `react-native-share` is properly linked
- Check app permissions for sharing
- Verify platform-specific configurations

**3. Referral Data Not Storing**
- Check AsyncStorage permissions
- Verify API endpoints are accessible
- Check network connectivity

**4. Statistics Not Loading**
- Verify user authentication
- Check API endpoint responses
- Ensure proper error handling

## Future Enhancements

### Potential Features
- **Referral Leaderboards**: Gamify the referral experience
- **Social Media Integration**: Direct sharing to specific platforms
- **Advanced Analytics**: More detailed referral performance metrics
- **Custom Rewards**: Different reward tiers based on referral volume
- **Referral Contests**: Time-limited campaigns with special rewards

### Technical Improvements
- **Offline Support**: Cache referral data for offline scenarios
- **Push Notifications**: Notify users about referral rewards
- **A/B Testing**: Test different referral messages and rewards
- **Machine Learning**: Predict referral success rates
- **Advanced Fraud Detection**: AI-powered abuse prevention

This implementation provides a solid foundation for a comprehensive social sharing and referral system that can drive user acquisition and engagement for the MarketHub mobile application.
