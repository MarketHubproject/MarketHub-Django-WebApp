const { device, expect, element, by, waitFor } = require('detox');

describe('Login Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    
    // Wait for the app to load
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Navigate to login screen if not already there
    try {
      await element(by.id('get-started-button')).tap();
    } catch (e) {
      // Already on login screen or logged in
    }
  });

  afterEach(async () => {
    // Logout if logged in
    try {
      await LoginHelper.logout();
    } catch (e) {
      // Not logged in, continue
    }
  });

  it('should display login screen elements correctly', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await expect(element(by.id('app-logo'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
    await expect(element(by.id('forgot-password-button'))).toBeVisible();
    await expect(element(by.id('signup-button'))).toBeVisible();
  });

  it('should show validation errors for empty fields', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('login-button')).tap();
    
    await expect(element(by.id('email-error'))).toBeVisible();
    await expect(element(by.id('password-error'))).toBeVisible();
    
    await expect(element(by.id('email-error'))).toHaveText('Email is required');
    await expect(element(by.id('password-error'))).toHaveText('Password is required');
  });

  it('should show validation error for invalid email format', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('login-button')).tap();
    
    await expect(element(by.id('email-error'))).toBeVisible();
    await expect(element(by.id('email-error'))).toHaveText('Please enter a valid email');
  });

  it('should show validation error for short password', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('email-input')).typeText('test@test.com');
    await element(by.id('password-input')).typeText('123');
    await element(by.id('login-button')).tap();
    
    await expect(element(by.id('password-error'))).toBeVisible();
    await expect(element(by.id('password-error'))).toHaveText('Password must be at least 6 characters');
  });

  it('should successfully login with valid credentials', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    const { email, password } = TestDataHelper.testUser;
    
    await element(by.id('email-input')).typeText(email);
    await element(by.id('password-input')).typeText(password);
    await element(by.id('login-button')).tap();
    
    // Should show loading state
    await expect(element(by.id('loading-indicator'))).toBeVisible();
    
    // Should navigate to home screen
    await NavigationHelper.waitForScreen('home-screen', 15000);
    await expect(element(by.id('welcome-message'))).toBeVisible();
  });

  it('should show error for invalid credentials', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('email-input')).typeText('wrong@test.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();
    
    // Wait for error message
    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Should remain on login screen
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should toggle password visibility', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('password-input')).typeText('password123');
    
    // Password should be hidden by default
    await expect(element(by.id('password-input'))).toHaveSecureText();
    
    // Tap toggle button
    await element(by.id('password-toggle-button')).tap();
    
    // Password should now be visible
    await expect(element(by.id('password-input'))).not.toHaveSecureText();
    
    // Tap toggle button again
    await element(by.id('password-toggle-button')).tap();
    
    // Password should be hidden again
    await expect(element(by.id('password-input'))).toHaveSecureText();
  });

  it('should navigate to signup screen', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('signup-button')).tap();
    
    await NavigationHelper.waitForScreen('signup-screen');
    await expect(element(by.text('Create Account'))).toBeVisible();
  });

  it('should navigate to forgot password screen', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('forgot-password-button')).tap();
    
    await NavigationHelper.waitForScreen('forgot-password-screen');
    await expect(element(by.text('Reset Password'))).toBeVisible();
  });

  it('should handle biometric login if available', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    // Only test if biometric button is visible (device supports it)
    try {
      await expect(element(by.id('biometric-login-button'))).toBeVisible();
      
      await element(by.id('biometric-login-button')).tap();
      
      // Should show biometric prompt
      await waitFor(element(by.text('Use Touch ID to login')))
        .toBeVisible()
        .withTimeout(5000);
        
    } catch (e) {
      // Biometric not available, skip test
      console.log('Biometric login not available on this device');
    }
  });

  it('should remember email after failed login', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    const email = 'test@example.com';
    await element(by.id('email-input')).typeText(email);
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();
    
    // Wait for error
    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Email should still be populated
    await expect(element(by.id('email-input'))).toHaveText(email);
    // Password should be cleared
    await expect(element(by.id('password-input'))).toHaveText('');
  });

  it('should handle network error gracefully', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    // Disconnect network
    await device.setNetworkConnection(false);
    
    const { email, password } = TestDataHelper.testUser;
    
    await element(by.id('email-input')).typeText(email);
    await element(by.id('password-input')).typeText(password);
    await element(by.id('login-button')).tap();
    
    // Should show network error
    await waitFor(element(by.text('Network connection error')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Reconnect network
    await device.setNetworkConnection(true);
  });

  it('should auto-focus next field on keyboard navigation', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    await element(by.id('email-input')).typeText('test@test.com');
    
    // Tap next on keyboard (should focus password field)
    await element(by.id('email-input')).tapReturnKey();
    
    // Password field should be focused (we can test by typing)
    await device.typeText('password123');
    
    await expect(element(by.id('password-input'))).toHaveText('password123');
  });

  it('should handle app state changes during login', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    const { email, password } = TestDataHelper.testUser;
    
    await element(by.id('email-input')).typeText(email);
    await element(by.id('password-input')).typeText(password);
    
    // Start login process
    await element(by.id('login-button')).tap();
    
    // Immediately background the app
    await device.sendToHome();
    await device.sleep(2000);
    await device.launchApp({ newInstance: false });
    
    // Should either complete login or return to login screen
    try {
      await NavigationHelper.waitForScreen('home-screen', 5000);
    } catch {
      await NavigationHelper.waitForScreen('login-screen', 5000);
    }
  });

  it('should persist form data during orientation changes', async () => {
    await NavigationHelper.waitForScreen('login-screen');
    
    const email = 'test@example.com';
    await element(by.id('email-input')).typeText(email);
    
    // Rotate device
    await device.setOrientation('landscape');
    await device.setOrientation('portrait');
    
    // Form data should persist
    await expect(element(by.id('email-input'))).toHaveText(email);
  });
});
