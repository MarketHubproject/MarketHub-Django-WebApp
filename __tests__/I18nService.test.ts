import i18n, { I18nService } from '../src/services/i18n';

describe('I18nService', () => {
  describe('Translation Key Resolution', () => {
    it('should resolve simple translation keys', () => {
      expect(i18n.t('common.loading')).toBe('Loading...');
      expect(i18n.t('common.error')).toBe('Error');
      expect(i18n.t('common.success')).toBe('Success');
    });

    it('should resolve nested translation keys', () => {
      expect(i18n.t('auth.welcomeBack')).toBe('Welcome Back!');
      expect(i18n.t('profile.editProfile')).toBe('Edit Profile');
      expect(i18n.t('products.searchPlaceholder')).toBe('Search products...');
    });

    it('should return the key as fallback when translation not found', () => {
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
      expect(i18n.t('auth.nonexistent')).toBe('auth.nonexistent');
    });

    it('should handle empty or malformed keys gracefully', () => {
      expect(i18n.t('')).toBe('');
      expect(i18n.t('.')).toBe('.');
      expect(i18n.t('...')).toBe('...');
    });
  });

  describe('Parameter Interpolation', () => {
    it('should interpolate single parameters', () => {
      expect(i18n.t('profile.memberSince', { date: 'January 1, 2024' }))
        .toBe('Member since January 1, 2024');
    });

    it('should interpolate multiple parameters', () => {
      expect(i18n.t('cart.checkoutTotal', { amount: '99.99' }))
        .toBe('Total: $99.99\n\nCheckout functionality will be implemented with payment integration.');
    });

    it('should handle numeric parameters', () => {
      expect(i18n.t('products.onlyXLeft', { count: 3 }))
        .toBe('Only 3 left!');
      expect(i18n.t('cart.onlyXAvailable', { count: 5 }))
        .toBe('Only 5 items available in stock.');
    });

    it('should leave missing parameters as placeholders', () => {
      const result = i18n.t('products.onlyXLeft', {});
      expect(result).toBe('Only {{count}} left!');
    });

    it('should handle partial parameter replacement', () => {
      // If we had a string with multiple params but only provided some
      const testString = 'Hello {{name}}, you have {{count}} messages';
      const service = new I18nService();
      // @ts-ignore - accessing private method for testing
      const result = service.interpolate(testString, { name: 'John' });
      expect(result).toBe('Hello John, you have {{count}} messages');
    });
  });

  describe('Translation Key Validation', () => {
    it('should correctly identify existing translation keys', () => {
      expect(i18n.hasTranslation('common.loading')).toBe(true);
      expect(i18n.hasTranslation('auth.welcomeBack')).toBe(true);
      expect(i18n.hasTranslation('profile.editProfile')).toBe(true);
    });

    it('should correctly identify non-existing translation keys', () => {
      expect(i18n.hasTranslation('nonexistent.key')).toBe(false);
      expect(i18n.hasTranslation('common.nonexistent')).toBe(false);
      expect(i18n.hasTranslation('auth')).toBe(false); // Not a leaf node
    });

    it('should handle edge cases in key validation', () => {
      expect(i18n.hasTranslation('')).toBe(false);
      expect(i18n.hasTranslation('.')).toBe(false);
      expect(i18n.hasTranslation('auth.')).toBe(false);
    });
  });

  describe('Translation Coverage', () => {
    it('should have all expected translation sections', () => {
      const allKeys = i18n.getAllKeys();
      
      // Check that we have keys from each major section
      const hasCommon = allKeys.some(key => key.startsWith('common.'));
      const hasAuth = allKeys.some(key => key.startsWith('auth.'));
      const hasNavigation = allKeys.some(key => key.startsWith('navigation.'));
      const hasHome = allKeys.some(key => key.startsWith('home.'));
      const hasProducts = allKeys.some(key => key.startsWith('products.'));
      const hasCart = allKeys.some(key => key.startsWith('cart.'));
      const hasProfile = allKeys.some(key => key.startsWith('profile.'));
      const hasErrors = allKeys.some(key => key.startsWith('errors.'));

      expect(hasCommon).toBe(true);
      expect(hasAuth).toBe(true);
      expect(hasNavigation).toBe(true);
      expect(hasHome).toBe(true);
      expect(hasProducts).toBe(true);
      expect(hasCart).toBe(true);
      expect(hasProfile).toBe(true);
      expect(hasErrors).toBe(true);
    });

    it('should return a sorted list of all translation keys', () => {
      const allKeys = i18n.getAllKeys();
      const sortedKeys = [...allKeys].sort();
      
      expect(allKeys).toEqual(sortedKeys);
      expect(allKeys.length).toBeGreaterThan(50); // We should have a good number of translations
    });

    it('should have specific required translations for core functionality', () => {
      // Test critical translations that the app depends on
      const requiredKeys = [
        'common.loading',
        'common.error',
        'auth.welcomeBack',
        'auth.signIn',
        'navigation.home',
        'navigation.products',
        'navigation.cart',
        'navigation.profile',
        'home.welcomeTitle',
        'products.searchPlaceholder',
        'cart.shoppingCart',
        'profile.profile'
      ];

      requiredKeys.forEach(key => {
        expect(i18n.hasTranslation(key)).toBe(true);
        expect(i18n.t(key)).not.toBe(key); // Should not return the key itself
      });
    });
  });

  describe('Service Instance', () => {
    it('should be a singleton instance', () => {
      // Import the service multiple times and ensure it's the same instance
      const { default: i18n1 } = require('../src/services/i18n');
      const { default: i18n2 } = require('../src/services/i18n');
      
      expect(i18n1).toBe(i18n2);
      expect(i18n1).toBe(i18n);
    });

    it('should be an instance of I18nService class', () => {
      expect(i18n).toBeInstanceOf(I18nService);
    });
  });

  describe('Error Handling', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log warning for missing translation keys', () => {
      const result = i18n.t('missing.translation.key');
      expect(result).toBe('missing.translation.key');
      expect(consoleSpy).toHaveBeenCalledWith("Translation key 'missing.translation.key' not found");
    });

    it('should log warning for non-string translation values', () => {
      // This would happen if a key points to an object instead of a string
      const result = i18n.t('auth'); // 'auth' is an object, not a string
      expect(result).toBe('auth');
      expect(consoleSpy).toHaveBeenCalledWith("Translation key 'auth' does not resolve to a string");
    });

    it('should log warning for missing interpolation parameters', () => {
      const service = new I18nService();
      // @ts-ignore - accessing private method for testing
      const result = service.interpolate('Hello {{name}}, you have {{count}} messages', { name: 'John' });
      expect(result).toBe('Hello John, you have {{count}} messages');
      expect(consoleSpy).toHaveBeenCalledWith("Parameter 'count' not provided for interpolation");
    });
  });
});
