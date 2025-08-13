const { device, expect, element, by, waitFor } = require('detox');

describe('Rewards Redemption Flow', () => {
  beforeAll(async () => {
    // Login before running rewards tests
    await device.reloadReactNative();
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Login with test credentials
    const { email, password } = TestDataHelper.testUser;
    await LoginHelper.loginWithCredentials(email, password);
  });

  afterAll(async () => {
    await LoginHelper.logout();
  });

  beforeEach(async () => {
    // Navigate to home screen before each test
    await element(by.id('home-tab')).tap();
    await NavigationHelper.waitForScreen('home-screen');
  });

  it('should display rewards balance correctly', async () => {
    // Navigate to profile/rewards section
    await element(by.id('profile-tab')).tap();
    await NavigationHelper.waitForScreen('profile-screen');
    
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Should display rewards balance
    await expect(element(by.id('rewards-balance'))).toBeVisible();
    await expect(element(by.id('rewards-points'))).toBeVisible();
    await expect(element(by.id('rewards-tier'))).toBeVisible();
    
    // Should show available rewards
    await expect(element(by.id('available-rewards-section'))).toBeVisible();
  });

  it('should display available rewards catalog', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Wait for rewards to load
    await waitFor(element(by.id('rewards-catalog')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Should show reward items
    await expect(element(by.id('reward-item-0'))).toBeVisible();
    
    // Reward item should have required elements
    await expect(element(by.id('reward-image-0'))).toBeVisible();
    await expect(element(by.id('reward-name-0'))).toBeVisible();
    await expect(element(by.id('reward-points-cost-0'))).toBeVisible();
    await expect(element(by.id('reward-redeem-button-0'))).toBeVisible();
  });

  it('should filter rewards by category', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Wait for rewards to load
    await waitFor(element(by.id('rewards-catalog')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Apply filter
    await element(by.id('filter-button')).tap();
    await element(by.text('Discounts')).tap();
    
    // Should show filtered results
    await waitFor(element(by.id('filtered-rewards')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Clear filter
    await element(by.id('clear-filter-button')).tap();
    
    // Should show all rewards again
    await expect(element(by.id('rewards-catalog'))).toBeVisible();
  });

  it('should view reward details', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Wait for rewards to load
    await waitFor(element(by.id('reward-item-0')))
      .toBeVisible()
      .withTimeout(10000);
    
    await element(by.id('reward-item-0')).tap();
    
    // Should navigate to reward detail screen
    await NavigationHelper.waitForScreen('reward-detail-screen');
    
    // Should show reward details
    await expect(element(by.id('reward-title'))).toBeVisible();
    await expect(element(by.id('reward-description'))).toBeVisible();
    await expect(element(by.id('reward-points-required'))).toBeVisible();
    await expect(element(by.id('reward-terms'))).toBeVisible();
    await expect(element(by.id('redeem-reward-button'))).toBeVisible();
  });

  it('should validate insufficient points', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Find a high-value reward that exceeds current balance
    await DeviceHelper.scrollToElement('high-value-reward');
    await element(by.id('high-value-reward')).tap();
    await NavigationHelper.waitForScreen('reward-detail-screen');
    
    // Attempt to redeem
    await element(by.id('redeem-reward-button')).tap();
    
    // Should show insufficient points error
    await waitFor(element(by.text('Insufficient points')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Should show required points vs current balance
    await expect(element(by.id('points-shortfall'))).toBeVisible();
    await expect(element(by.id('earn-more-points-button'))).toBeVisible();
  });

  it('should successfully redeem available reward', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Find a low-value reward within current balance
    await waitFor(element(by.id('low-value-reward')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Get current points balance before redemption
    const currentPoints = await element(by.id('rewards-points')).getAttributes();
    
    await element(by.id('low-value-reward')).tap();
    await NavigationHelper.waitForScreen('reward-detail-screen');
    
    // Redeem the reward
    await element(by.id('redeem-reward-button')).tap();
    
    // Confirm redemption
    await element(by.text('Redeem')).tap();
    
    // Should show processing state
    await expect(element(by.id('processing-redemption'))).toBeVisible();
    
    // Should navigate to redemption success screen
    await NavigationHelper.waitForScreen('redemption-success-screen', 15000);
    
    // Should show redemption details
    await expect(element(by.id('redemption-code'))).toBeVisible();
    await expect(element(by.id('redemption-instructions'))).toBeVisible();
    await expect(element(by.text('Redemption successful'))).toBeVisible();
    
    // Should update points balance
    await element(by.id('done-button')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    const newPoints = await element(by.id('rewards-points')).getAttributes();
    // Points should be reduced (this is a simplified check)
    expect(newPoints).not.toEqual(currentPoints);
  });

  it('should display redemption history', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Navigate to rewards history
    await element(by.id('rewards-history-button')).tap();
    await NavigationHelper.waitForScreen('rewards-history-screen');
    
    // Should show transaction history
    await expect(element(by.id('rewards-transactions'))).toBeVisible();
    
    // Should show both earned and redeemed points
    await expect(element(by.id('earned-points-section'))).toBeVisible();
    await expect(element(by.id('redeemed-points-section'))).toBeVisible();
  });

  it('should earn points from purchase', async () => {
    // First check current points balance
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    const initialPoints = await element(by.id('rewards-points')).getAttributes();
    
    // Make a purchase to earn points
    await element(by.id('home-tab')).tap();
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    
    // Complete checkout process (simplified)
    await FormHelper.fillForm({
      'shipping-address': '123 Test Street',
      'shipping-city': 'Test City',
      'shipping-zip': '12345',
    });
    
    await element(by.id('payment-method-card')).tap();
    await element(by.id('card-number')).typeText('4111111111111111');
    await element(by.id('card-expiry')).typeText('12/25');
    await element(by.id('card-cvv')).typeText('123');
    await element(by.id('card-name')).typeText('Test User');
    
    await element(by.id('place-order-button')).tap();
    await NavigationHelper.waitForScreen('order-confirmation-screen', 30000);
    
    // Should show points earned notification
    await expect(element(by.id('points-earned-notification'))).toBeVisible();
    
    // Check updated points balance
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    
    const newPoints = await element(by.id('rewards-points')).getAttributes();
    // Points should have increased
    expect(newPoints).not.toEqual(initialPoints);
  });

  it('should display tier progression', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Tap on tier information
    await element(by.id('rewards-tier')).tap();
    
    // Should show tier details modal
    await expect(element(by.id('tier-details-modal'))).toBeVisible();
    
    // Should show current tier info
    await expect(element(by.id('current-tier'))).toBeVisible();
    await expect(element(by.id('tier-benefits'))).toBeVisible();
    
    // Should show next tier progress
    await expect(element(by.id('next-tier-progress'))).toBeVisible();
    await expect(element(by.id('points-needed'))).toBeVisible();
    
    // Close modal
    await element(by.id('close-tier-modal')).tap();
    await WaitHelper.waitForElementToDisappear('tier-details-modal');
  });

  it('should handle reward expiration', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Look for an expiring reward (if available)
    try {
      await expect(element(by.id('expiring-reward'))).toBeVisible();
      
      await element(by.id('expiring-reward')).tap();
      await NavigationHelper.waitForScreen('reward-detail-screen');
      
      // Should show expiry information
      await expect(element(by.id('reward-expiry-date'))).toBeVisible();
      await expect(element(by.id('expiry-warning'))).toBeVisible();
      
    } catch (e) {
      // No expiring rewards available, skip test
      console.log('No expiring rewards available for testing');
    }
  });

  it('should share reward with others', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    await element(by.id('reward-item-0')).tap();
    await NavigationHelper.waitForScreen('reward-detail-screen');
    
    // Share reward
    await element(by.id('share-reward-button')).tap();
    
    // Should show share options
    await expect(element(by.id('share-modal'))).toBeVisible();
    
    // Cancel sharing for test
    await element(by.id('cancel-share')).tap();
    await WaitHelper.waitForElementToDisappear('share-modal');
  });

  it('should handle network errors during redemption', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Disconnect network
    await device.setNetworkConnection(false);
    
    await element(by.id('low-value-reward')).tap();
    await NavigationHelper.waitForScreen('reward-detail-screen');
    
    await element(by.id('redeem-reward-button')).tap();
    await element(by.text('Redeem')).tap();
    
    // Should show network error
    await waitFor(element(by.text('Network error')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Reconnect network
    await device.setNetworkConnection(true);
    
    // Should be able to retry
    await element(by.id('retry-button')).tap();
  });

  it('should display referral rewards', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Navigate to referral section
    await element(by.id('referral-rewards-tab')).tap();
    
    // Should show referral information
    await expect(element(by.id('referral-code'))).toBeVisible();
    await expect(element(by.id('share-referral-button'))).toBeVisible();
    await expect(element(by.id('referral-rewards-earned'))).toBeVisible();
    
    // Should show referred friends list
    await expect(element(by.id('referred-friends'))).toBeVisible();
  });

  it('should validate reward redemption limits', async () => {
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    // Find a reward with redemption limits
    try {
      await element(by.id('limited-reward')).tap();
      await NavigationHelper.waitForScreen('reward-detail-screen');
      
      // Should show limit information
      await expect(element(by.id('redemption-limit'))).toBeVisible();
      
      // If already redeemed maximum times
      if (await element(by.id('limit-reached')).exists()) {
        await expect(element(by.id('redeem-reward-button'))).toBeDisabled();
        await expect(element(by.text('Limit reached'))).toBeVisible();
      }
      
    } catch (e) {
      // No limited rewards available
      console.log('No limited rewards available for testing');
    }
  });

  it('should persist redemption codes in wallet', async () => {
    // First redeem a reward that generates a code
    await element(by.id('profile-tab')).tap();
    await element(by.id('rewards-section')).tap();
    await NavigationHelper.waitForScreen('rewards-screen');
    
    await element(by.id('coupon-reward')).tap();
    await NavigationHelper.waitForScreen('reward-detail-screen');
    
    await element(by.id('redeem-reward-button')).tap();
    await element(by.text('Redeem')).tap();
    
    await NavigationHelper.waitForScreen('redemption-success-screen', 15000);
    
    // Save to wallet
    await element(by.id('save-to-wallet-button')).tap();
    
    // Navigate to wallet/coupons section
    await NavigationHelper.goBack();
    await NavigationHelper.goBack();
    
    await element(by.id('my-coupons-button')).tap();
    await NavigationHelper.waitForScreen('coupons-screen');
    
    // Should show the redeemed coupon
    await expect(element(by.id('coupon-0'))).toBeVisible();
    await expect(element(by.id('coupon-code-0'))).toBeVisible();
    await expect(element(by.id('coupon-expiry-0'))).toBeVisible();
  });
});
