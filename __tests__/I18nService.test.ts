// Mock the utils that cause issues with react-native-toast-message
jest.mock("../src/utils", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import i18n, { I18nService } from "../src/services/i18n";

describe("I18nService", () => {
  describe("Translation Key Resolution", () => {
    it("should resolve simple translation keys", () => {
      expect(i18n.t("common.loading")).toBe("Loading...");
      expect(i18n.t("common.error")).toBe("Error");
      expect(i18n.t("common.success")).toBe("Success");
    });

    it("should resolve nested translation keys", () => {
      expect(i18n.t("auth.welcomeBack")).toBe("Welcome Back!");
      expect(i18n.t("profile.editProfile")).toBe("Edit Profile");
      expect(i18n.t("products.searchPlaceholder")).toBe("Search products...");
    });

    it("should return the key as fallback when translation not found", () => {
      expect(i18n.t("nonexistent.key")).toBe("nonexistent.key");
      expect(i18n.t("auth.nonexistent")).toBe("auth.nonexistent");
    });

    it("should handle empty or malformed keys gracefully", () => {
      expect(i18n.t("")).toBe("");
      expect(i18n.t(".")).toBe(".");
      expect(i18n.t("...")).toBe("...");
    });
  });

  describe("Parameter Interpolation", () => {
    it("should interpolate single parameters", () => {
      expect(i18n.t("profile.memberSince", { date: "January 1, 2024" })).toBe(
        "Member since January 1, 2024"
      );
    });

    it("should interpolate multiple parameters", () => {
      expect(i18n.t("cart.checkoutTotal", { amount: "99.99" })).toBe(
        "Total: $99.99\n\nCheckout functionality will be implemented with payment integration."
      );
    });

    it("should handle numeric parameters", () => {
      expect(i18n.t("products.onlyXLeft", { count: 3 })).toBe("Only 3 left!");
      expect(i18n.t("cart.onlyXAvailable", { count: 5 })).toBe(
        "Only 5 items available in stock."
      );
    });

    it("should leave missing parameters as placeholders", () => {
      const result = i18n.t("products.onlyXLeft", {});
      expect(result).toBe("Only {{count}} left!");
    });

    it("should handle partial parameter replacement", () => {
      // If we had a string with multiple params but only provided some
      const testString = "Hello {{name}}, you have {{count}} messages";
      const service = new I18nService();
      // @ts-ignore - accessing private method for testing
      const result = service.interpolate(testString, { name: "John" });
      expect(result).toBe("Hello John, you have {{count}} messages");
    });
  });

  describe("Translation Key Validation", () => {
    it("should correctly identify existing translation keys", () => {
      expect(i18n.hasTranslation("common.loading")).toBe(true);
      expect(i18n.hasTranslation("auth.welcomeBack")).toBe(true);
      expect(i18n.hasTranslation("profile.editProfile")).toBe(true);
    });

    it("should correctly identify non-existing translation keys", () => {
      expect(i18n.hasTranslation("nonexistent.key")).toBe(false);
      expect(i18n.hasTranslation("common.nonexistent")).toBe(false);
      expect(i18n.hasTranslation("auth")).toBe(false); // Not a leaf node
    });

    it("should handle edge cases in key validation", () => {
      expect(i18n.hasTranslation("")).toBe(false);
      expect(i18n.hasTranslation(".")).toBe(false);
      expect(i18n.hasTranslation("auth.")).toBe(false);
    });
  });

  describe("Translation Coverage", () => {
    it("should have all expected translation sections", () => {
      const allKeys = i18n.getAllKeys();

      // Check that we have keys from each major section
      const hasCommon = allKeys.some((key) => key.startsWith("common."));
      const hasAuth = allKeys.some((key) => key.startsWith("auth."));
      const hasNavigation = allKeys.some((key) =>
        key.startsWith("navigation.")
      );
      const hasHome = allKeys.some((key) => key.startsWith("home."));
      const hasProducts = allKeys.some((key) => key.startsWith("products."));
      const hasCart = allKeys.some((key) => key.startsWith("cart."));
      const hasProfile = allKeys.some((key) => key.startsWith("profile."));
      const hasErrors = allKeys.some((key) => key.startsWith("errors."));

      expect(hasCommon).toBe(true);
      expect(hasAuth).toBe(true);
      expect(hasNavigation).toBe(true);
      expect(hasHome).toBe(true);
      expect(hasProducts).toBe(true);
      expect(hasCart).toBe(true);
      expect(hasProfile).toBe(true);
      expect(hasErrors).toBe(true);
    });

    it("should return a sorted list of all translation keys", () => {
      const allKeys = i18n.getAllKeys();
      const sortedKeys = [...allKeys].sort();

      expect(allKeys).toEqual(sortedKeys);
      expect(allKeys.length).toBeGreaterThan(50); // We should have a good number of translations
    });

    it("should have specific required translations for core functionality", () => {
      // Test critical translations that the app depends on
      const requiredKeys = [
        "common.loading",
        "common.error",
        "auth.welcomeBack",
        "auth.signIn",
        "navigation.home",
        "navigation.products",
        "navigation.cart",
        "navigation.profile",
        "home.welcomeTitle",
        "products.searchPlaceholder",
        "cart.shoppingCart",
        "profile.profile",
      ];

      requiredKeys.forEach((key) => {
        expect(i18n.hasTranslation(key)).toBe(true);
        expect(i18n.t(key)).not.toBe(key); // Should not return the key itself
      });
    });
  });

  describe("Service Instance", () => {
    it("should be a singleton instance", () => {
      // Import the service multiple times and ensure it's the same instance
      const { default: i18n1 } = require("../src/services/i18n");
      const { default: i18n2 } = require("../src/services/i18n");

      expect(i18n1).toBe(i18n2);
      expect(i18n1).toBe(i18n);
    });

    it("should be an instance of I18nService class", () => {
      expect(i18n).toBeInstanceOf(I18nService);
    });
  });

  describe("Pluralization Support", () => {
    it("should use singular form when count is 1", () => {
      expect(i18n.t("products.productCount", { count: 1 })).toBe("1 product");
    });

    it("should use plural form when count is not 1", () => {
      expect(i18n.t("products.productCount", { count: 0 })).toBe("0 products");
      expect(i18n.t("products.productCount", { count: 2 })).toBe("2 products");
      expect(i18n.t("products.productCount", { count: 10 })).toBe(
        "10 products"
      );
    });

    it("should handle negative counts as plural", () => {
      expect(i18n.t("products.productCount", { count: -1 })).toBe(
        "-1 products"
      );
    });

    it("should handle decimal counts as plural", () => {
      expect(i18n.t("products.productCount", { count: 1.5 })).toBe(
        "1.5 products"
      );
    });

    it("should fallback to singular form when plural key does not exist", () => {
      // Test with a key that doesn't have a plural form
      const service = new I18nService();
      // @ts-ignore - accessing private method for testing
      const result = service.resolvePluralKey("common.loading", 5);
      expect(result).toBe("common.loading"); // Should return original key since no plural exists
    });
  });

  describe("Missing Key Behavior", () => {
    let testService: I18nService;

    beforeEach(() => {
      testService = new I18nService();
    });

    it("should track missing keys in collection", () => {
      testService.t("missing.key.one");
      testService.t("missing.key.two");
      testService.t("missing.key.one"); // Duplicate

      const missingKeys = testService.getMissingKeys();
      expect(missingKeys).toContain("missing.key.one");
      expect(missingKeys).toContain("missing.key.two");
      expect(missingKeys.length).toBe(2); // Should not contain duplicates
    });

    it("should clear missing keys collection", () => {
      testService.t("missing.key.test");
      expect(testService.getMissingKeys().length).toBe(1);

      testService.clearMissingKeys();
      expect(testService.getMissingKeys().length).toBe(0);
    });

    it("should return sorted missing keys", () => {
      testService.t("zzz.missing");
      testService.t("aaa.missing");
      testService.t("mmm.missing");

      const missingKeys = testService.getMissingKeys();
      const sortedKeys = [...missingKeys].sort();
      expect(missingKeys).toEqual(sortedKeys);
    });
  });

  describe("Fallback Behavior", () => {
    it("should handle null and undefined parameters safely", () => {
      expect(i18n.t("products.onlyXLeft", { count: null })).toBe(
        "Only {{count}} left!"
      );
      expect(i18n.t("products.onlyXLeft", { count: undefined })).toBe(
        "Only {{count}} left!"
      );
    });

    it("should handle empty string parameters", () => {
      expect(i18n.t("profile.memberSince", { date: "" })).toBe("Member since ");
      expect(i18n.t("products.onlyXLeft", { count: "" })).toBe("Only  left!");
    });

    it("should get current language", () => {
      expect(i18n.getLanguage()).toBe("en");
    });

    it("should get supported languages", () => {
      const supportedLanguages = i18n.getSupportedLanguages();
      expect(supportedLanguages).toContain("en");
      expect(supportedLanguages).toContain("zh");
      expect(Array.isArray(supportedLanguages)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should handle missing translation keys gracefully", () => {
      const result = i18n.t("missing.translation.key");
      expect(result).toBe("missing.translation.key");
      // The service should handle missing keys without throwing errors
    });

    it("should handle invalid key types gracefully", () => {
      // Test with object keys (should return the key as string)
      const result = i18n.t("auth"); // 'auth' is an object, not a string
      expect(result).toBe("auth");
    });

    it("should handle interpolation with missing parameters", () => {
      const service = new I18nService();
      // @ts-ignore - accessing private method for testing
      const result = service.interpolate(
        "Hello {{name}}, you have {{count}} messages",
        { name: "John" }
      );
      expect(result).toBe("Hello John, you have {{count}} messages");
    });
  });
});
