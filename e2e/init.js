const { device, expect, element, by, waitFor } = require('detox');

const adapter = require('detox/runners/jest/adapter');
const specReporter = require('detox/runners/jest/specReporter');

// Set the default test timeout
jest.setTimeout(300000);

// Add Detox-specific matchers
jest.addMatchers(require('detox/runners/jest/adapter'));

// Setup Detox lifecycle hooks
beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', location: 'inuse' },
  });
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  await adapter.afterAll();
  await device.terminateApp();
});

// Custom helper functions for E2E tests
global.LoginHelper = {
  async loginWithCredentials(email, password) {
    await element(by.id('email-input')).typeText(email);
    await element(by.id('password-input')).typeText(password);
    await element(by.id('login-button')).tap();
    
    // Wait for navigation to complete
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  },

  async logout() {
    await element(by.id('profile-tab')).tap();
    await element(by.id('logout-button')).tap();
    await element(by.text('Logout')).tap(); // Confirm logout
    
    // Wait for login screen
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(5000);
  },
};

global.TestDataHelper = {
  testUser: {
    email: 'test@markethub.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
  },
  
  testProduct: {
    id: '12345',
    name: 'Test Product',
    price: '$99.99',
  },
  
  generateRandomEmail() {
    const timestamp = Date.now();
    return `test+${timestamp}@markethub.com`;
  },
};

global.NavigationHelper = {
  async navigateToTab(tabId) {
    await element(by.id(tabId)).tap();
    await device.pressBack(); // Handle any overlays
  },
  
  async goBack() {
    await device.pressBack();
  },
  
  async waitForScreen(screenId, timeout = 5000) {
    await waitFor(element(by.id(screenId)))
      .toBeVisible()
      .withTimeout(timeout);
  },
};

global.DeviceHelper = {
  async reloadApp() {
    await device.reloadReactNative();
  },
  
  async backgroundApp(duration = 5000) {
    await device.sendToHome();
    await device.sleep(duration);
    await device.launchApp({ newInstance: false });
  },
  
  async rotateDevice() {
    await device.setOrientation('landscape');
    await device.setOrientation('portrait');
  },
  
  async scrollToElement(elementId, direction = 'down') {
    await element(by.id('scroll-view')).scrollTo(direction);
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .whileElement(by.id('scroll-view'))
      .scroll(200, direction);
  },
};

global.WaitHelper = {
  async waitForElementToAppear(elementId, timeout = 10000) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(timeout);
  },
  
  async waitForElementToDisappear(elementId, timeout = 10000) {
    await waitFor(element(by.id(elementId)))
      .toBeNotVisible()
      .withTimeout(timeout);
  },
  
  async waitForLoading() {
    // Wait for loading spinner to appear and disappear
    await waitFor(element(by.id('loading-spinner')))
      .toBeVisible()
      .withTimeout(2000);
    await waitFor(element(by.id('loading-spinner')))
      .toBeNotVisible()
      .withTimeout(10000);
  },
};

global.FormHelper = {
  async fillForm(formData) {
    for (const [fieldId, value] of Object.entries(formData)) {
      await element(by.id(fieldId)).replaceText(value);
    }
  },
  
  async selectFromPicker(pickerId, value) {
    await element(by.id(pickerId)).tap();
    await element(by.text(value)).tap();
  },
  
  async toggleSwitch(switchId) {
    await element(by.id(switchId)).tap();
  },
};

global.AssertionHelper = {
  async expectElementToHaveText(elementId, expectedText) {
    await expect(element(by.id(elementId))).toHaveText(expectedText);
  },
  
  async expectElementToContainText(elementId, containedText) {
    await expect(element(by.id(elementId))).toHaveText(containedText);
  },
  
  async expectElementToBeEnabled(elementId) {
    await expect(element(by.id(elementId))).toBeEnabled();
  },
  
  async expectElementToBeDisabled(elementId) {
    await expect(element(by.id(elementId))).toBeDisabled();
  },
};
