const { device, expect, element, by, waitFor } = require('detox');

describe('Purchase Flow', () => {
  beforeAll(async () => {
    // Login before running purchase tests
    await device.reloadReactNative();
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Login with test credentials
    const { email, password } = TestDataHelper.testUser;
    await LoginHelper.loginWithCredentials(email, password);
  });

  afterAll(async () => {
    // Clear cart and logout
    try {
      await element(by.id('cart-tab')).tap();
      await element(by.id('clear-cart-button')).tap();
      await element(by.text('Clear')).tap();
    } catch (e) {
      // Cart might be empty
    }
    
    await LoginHelper.logout();
  });

  beforeEach(async () => {
    // Navigate to home screen before each test
    await element(by.id('home-tab')).tap();
    await NavigationHelper.waitForScreen('home-screen');
  });

  it('should display product catalog correctly', async () => {
    await NavigationHelper.waitForScreen('home-screen');
    
    // Check if products are loaded
    await waitFor(element(by.id('product-list')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Should show at least one product
    await expect(element(by.id('product-card-0'))).toBeVisible();
    
    // Product card should have required elements
    await expect(element(by.id('product-image-0'))).toBeVisible();
    await expect(element(by.id('product-name-0'))).toBeVisible();
    await expect(element(by.id('product-price-0'))).toBeVisible();
    await expect(element(by.id('add-to-cart-0'))).toBeVisible();
  });

  it('should search for products', async () => {
    await NavigationHelper.waitForScreen('home-screen');
    
    await element(by.id('search-input')).typeText('test product');
    await element(by.id('search-button')).tap();
    
    // Wait for search results
    await WaitHelper.waitForLoading();
    
    // Should show filtered results
    await expect(element(by.id('search-results'))).toBeVisible();
  });

  it('should view product details', async () => {
    await NavigationHelper.waitForScreen('home-screen');
    
    // Wait for products to load
    await waitFor(element(by.id('product-card-0')))
      .toBeVisible()
      .withTimeout(10000);
    
    await element(by.id('product-card-0')).tap();
    
    // Should navigate to product detail screen
    await NavigationHelper.waitForScreen('product-detail-screen');
    
    // Should show product details
    await expect(element(by.id('product-title'))).toBeVisible();
    await expect(element(by.id('product-description'))).toBeVisible();
    await expect(element(by.id('product-price'))).toBeVisible();
    await expect(element(by.id('add-to-cart-button'))).toBeVisible();
    await expect(element(by.id('quantity-selector'))).toBeVisible();
  });

  it('should add product to cart from product details', async () => {
    await NavigationHelper.waitForScreen('home-screen');
    
    // Navigate to product detail
    await element(by.id('product-card-0')).tap();
    await NavigationHelper.waitForScreen('product-detail-screen');
    
    // Set quantity
    await element(by.id('quantity-plus-button')).tap();
    await expect(element(by.id('quantity-display'))).toHaveText('2');
    
    // Add to cart
    await element(by.id('add-to-cart-button')).tap();
    
    // Should show success message
    await waitFor(element(by.text('Added to cart')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Cart badge should update
    await expect(element(by.id('cart-badge'))).toHaveText('2');
  });

  it('should add product to cart from product list', async () => {
    await NavigationHelper.waitForScreen('home-screen');
    
    // Wait for products to load
    await waitFor(element(by.id('product-card-0')))
      .toBeVisible()
      .withTimeout(10000);
    
    await element(by.id('add-to-cart-0')).tap();
    
    // Should show success message
    await waitFor(element(by.text('Added to cart')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Cart badge should update
    await expect(element(by.id('cart-badge'))).toHaveText('1');
  });

  it('should view and manage cart items', async () => {
    // First add an item to cart
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    
    // Navigate to cart
    await element(by.id('cart-tab')).tap();
    await NavigationHelper.waitForScreen('cart-screen');
    
    // Should show cart items
    await expect(element(by.id('cart-item-0'))).toBeVisible();
    await expect(element(by.id('cart-item-name-0'))).toBeVisible();
    await expect(element(by.id('cart-item-price-0'))).toBeVisible();
    await expect(element(by.id('cart-item-quantity-0'))).toBeVisible();
    
    // Should show cart total
    await expect(element(by.id('cart-total'))).toBeVisible();
    await expect(element(by.id('checkout-button'))).toBeVisible();
  });

  it('should update cart item quantity', async () => {
    // Add item to cart first
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    
    // Navigate to cart
    await element(by.id('cart-tab')).tap();
    await NavigationHelper.waitForScreen('cart-screen');
    
    // Increase quantity
    await element(by.id('quantity-plus-0')).tap();
    
    // Should update quantity display and total
    await expect(element(by.id('cart-item-quantity-0'))).toHaveText('2');
    
    // Decrease quantity
    await element(by.id('quantity-minus-0')).tap();
    await expect(element(by.id('cart-item-quantity-0'))).toHaveText('1');
  });

  it('should remove item from cart', async () => {
    // Add item to cart first
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    
    // Navigate to cart
    await element(by.id('cart-tab')).tap();
    await NavigationHelper.waitForScreen('cart-screen');
    
    // Remove item
    await element(by.id('remove-item-0')).tap();
    await element(by.text('Remove')).tap(); // Confirm
    
    // Should show empty cart
    await expect(element(by.id('empty-cart-message'))).toBeVisible();
    await expect(element(by.id('checkout-button'))).toBeNotVisible();
  });

  it('should proceed to checkout', async () => {
    // Add item to cart first
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    
    // Navigate to cart
    await element(by.id('cart-tab')).tap();
    await NavigationHelper.waitForScreen('cart-screen');
    
    // Proceed to checkout
    await element(by.id('checkout-button')).tap();
    
    // Should navigate to checkout screen
    await NavigationHelper.waitForScreen('checkout-screen');
    
    // Should show checkout sections
    await expect(element(by.id('shipping-section'))).toBeVisible();
    await expect(element(by.id('payment-section'))).toBeVisible();
    await expect(element(by.id('order-summary'))).toBeVisible();
    await expect(element(by.id('place-order-button'))).toBeVisible();
  });

  it('should fill shipping information', async () => {
    // Add item and proceed to checkout
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    await NavigationHelper.waitForScreen('checkout-screen');
    
    // Fill shipping form
    const shippingData = {
      'shipping-address': '123 Test Street',
      'shipping-city': 'Test City',
      'shipping-state': 'Test State',
      'shipping-zip': '12345',
      'shipping-phone': '555-0123',
    };
    
    await FormHelper.fillForm(shippingData);
    
    // Should enable payment section
    await expect(element(by.id('payment-section'))).toBeEnabled();
  });

  it('should select payment method', async () => {
    // Add item and proceed to checkout
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    await NavigationHelper.waitForScreen('checkout-screen');
    
    // Fill shipping first
    const shippingData = {
      'shipping-address': '123 Test Street',
      'shipping-city': 'Test City',
      'shipping-zip': '12345',
    };
    await FormHelper.fillForm(shippingData);
    
    // Select payment method
    await element(by.id('payment-method-card')).tap();
    
    // Fill card details
    await element(by.id('card-number')).typeText('4111111111111111');
    await element(by.id('card-expiry')).typeText('12/25');
    await element(by.id('card-cvv')).typeText('123');
    await element(by.id('card-name')).typeText('Test User');
    
    // Should enable place order button
    await expect(element(by.id('place-order-button'))).toBeEnabled();
  });

  it('should place order successfully', async () => {
    // Add item and proceed to checkout
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    await NavigationHelper.waitForScreen('checkout-screen');
    
    // Fill shipping information
    const shippingData = {
      'shipping-address': '123 Test Street',
      'shipping-city': 'Test City',
      'shipping-zip': '12345',
    };
    await FormHelper.fillForm(shippingData);
    
    // Fill payment information
    await element(by.id('payment-method-card')).tap();
    await element(by.id('card-number')).typeText('4111111111111111');
    await element(by.id('card-expiry')).typeText('12/25');
    await element(by.id('card-cvv')).typeText('123');
    await element(by.id('card-name')).typeText('Test User');
    
    // Place order
    await element(by.id('place-order-button')).tap();
    
    // Should show loading state
    await expect(element(by.id('processing-order'))).toBeVisible();
    
    // Should navigate to order confirmation
    await NavigationHelper.waitForScreen('order-confirmation-screen', 30000);
    
    // Should show order details
    await expect(element(by.id('order-number'))).toBeVisible();
    await expect(element(by.id('order-total'))).toBeVisible();
    await expect(element(by.text('Order placed successfully'))).toBeVisible();
  });

  it('should apply promo code', async () => {
    // Add item and proceed to checkout
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    await NavigationHelper.waitForScreen('checkout-screen');
    
    // Apply promo code
    await element(by.id('promo-code-input')).typeText('TESTCODE');
    await element(by.id('apply-promo-button')).tap();
    
    // Should show discount applied
    await waitFor(element(by.text('Promo code applied')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Should update order total
    await expect(element(by.id('discount-amount'))).toBeVisible();
  });

  it('should handle payment failure', async () => {
    // Add item and proceed to checkout
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    await NavigationHelper.waitForScreen('checkout-screen');
    
    // Fill shipping information
    const shippingData = {
      'shipping-address': '123 Test Street',
      'shipping-city': 'Test City',
      'shipping-zip': '12345',
    };
    await FormHelper.fillForm(shippingData);
    
    // Use invalid card for payment failure test
    await element(by.id('payment-method-card')).tap();
    await element(by.id('card-number')).typeText('4000000000000002'); // Declined card
    await element(by.id('card-expiry')).typeText('12/25');
    await element(by.id('card-cvv')).typeText('123');
    await element(by.id('card-name')).typeText('Test User');
    
    // Attempt to place order
    await element(by.id('place-order-button')).tap();
    
    // Should show error message
    await waitFor(element(by.text('Payment failed')))
      .toBeVisible()
      .withTimeout(15000);
    
    // Should remain on checkout screen
    await expect(element(by.id('checkout-screen'))).toBeVisible();
  });

  it('should save order to history', async () => {
    // Complete a successful order first
    await NavigationHelper.waitForScreen('home-screen');
    await element(by.id('add-to-cart-0')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('checkout-button')).tap();
    
    // Fill and submit order (simplified for test)
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
    
    // Navigate to profile to check order history
    await element(by.id('profile-tab')).tap();
    await element(by.id('order-history-button')).tap();
    
    await NavigationHelper.waitForScreen('order-history-screen');
    
    // Should show the recent order
    await expect(element(by.id('order-item-0'))).toBeVisible();
  });
});
