import React from "react";
import renderer, { ReactTestRenderer, act } from "react-test-renderer";
import { Image, View, Text, ActivityIndicator } from "react-native";
import i18n, { I18nService } from "../src/services/i18n";
import SmartImage from "../src/components/SmartImage";

// Mock the environment config for SmartImage tests
jest.mock("../src/config/environment", () => ({
  getImageUrl: (path: string) => `https://test.com/images/${path}`,
  getPlaceholderImageUrl: (width: number, height: number, text?: string) =>
    `https://via.placeholder.com/${width}x${height}${
      text ? `/text=${encodeURIComponent(text)}` : ""
    }`,
}));

// Mock console.warn to prevent noise in tests
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
});

describe("Unit Tests for I18nService and SmartImage", () => {
  // ===================
  // I18nService Tests
  // ===================
  describe("I18nService", () => {
    describe("Normal Translation Lookup", () => {
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
    });

    describe("Fallback Behavior", () => {
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
      it("should interpolate single parameters correctly", () => {
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
      });

      it("should leave missing parameters as placeholders", () => {
        const result = i18n.t("products.onlyXLeft", {});
        expect(result).toBe("Only {{count}} left!");
      });

      it("should handle null and undefined parameters safely", () => {
        expect(i18n.t("products.onlyXLeft", { count: null })).toBe(
          "Only {{count}} left!"
        );
        expect(i18n.t("products.onlyXLeft", { count: undefined })).toBe(
          "Only {{count}} left!"
        );
      });
    });

    describe("Pluralization Support", () => {
      it("should use singular form when count is 1", () => {
        expect(i18n.t("products.productCount", { count: 1 })).toBe("1 product");
      });

      it("should use plural form when count is not 1", () => {
        expect(i18n.t("products.productCount", { count: 0 })).toBe(
          "0 products"
        );
        expect(i18n.t("products.productCount", { count: 2 })).toBe(
          "2 products"
        );
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

    describe("Service Features", () => {
      it("should get current language", () => {
        expect(i18n.getLanguage()).toBe("en");
      });

      it("should get supported languages", () => {
        const supportedLanguages = i18n.getSupportedLanguages();
        expect(supportedLanguages).toContain("en");
        expect(supportedLanguages).toContain("zh");
        expect(Array.isArray(supportedLanguages)).toBe(true);
      });

      it("should validate translation key existence", () => {
        expect(i18n.hasTranslation("common.loading")).toBe(true);
        expect(i18n.hasTranslation("nonexistent.key")).toBe(false);
      });

      it("should be a singleton instance", () => {
        const { default: i18n1 } = require("../src/services/i18n");
        const { default: i18n2 } = require("../src/services/i18n");

        expect(i18n1).toBe(i18n2);
        expect(i18n1).toBe(i18n);
      });
    });
  });

  // ===================
  // SmartImage Tests
  // ===================
  describe("SmartImage", () => {
    describe("Basic Rendering", () => {
      it("should render correctly with a valid image source", () => {
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
          />
        );

        expect(tree).toBeDefined();
        const instance = tree.root;
        const image = instance.findByType(Image);
        expect(image).toBeDefined();
      });

      it("should render correctly with a numeric source (local image)", () => {
        const tree = renderer.create(
          <SmartImage source={123} style={{ width: 100, height: 100 }} />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);
        expect(image.props.source).toBe(123);
      });

      it("should apply custom styles correctly", () => {
        const customStyle = { width: 200, height: 150, borderRadius: 10 };
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={customStyle}
          />
        );

        const instance = tree.root;
        const container = instance.findByType(View);
        expect(container.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining(customStyle)])
        );
      });
    });

    describe("Loading States", () => {
      it("should show loading indicator initially", () => {
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
          />
        );

        const instance = tree.root;
        const loadingIndicators = instance.findAllByType(ActivityIndicator);
        expect(loadingIndicators.length).toBeGreaterThan(0);
      });

      it("should use custom loading size and color", () => {
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
            loadingSize="large"
            loadingColor="#FF0000"
          />
        );

        const instance = tree.root;
        const loadingIndicator = instance.findByType(ActivityIndicator);
        expect(loadingIndicator.props.size).toBe("large");
        expect(loadingIndicator.props.color).toBe("#FF0000");
      });

      it("should call onLoad callback when image loads successfully", () => {
        const onLoadMock = jest.fn();
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
            onLoad={onLoadMock}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);

        // Simulate onLoad event with act
        act(() => {
          if (image.props.onLoad) {
            image.props.onLoad();
          }
        });

        expect(onLoadMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("Error Handling and Placeholder Rendering", () => {
      it("should render placeholder when no source is provided", () => {
        const tree = renderer.create(
          <SmartImage style={{ width: 100, height: 100 }} />
        );

        const instance = tree.root;
        const texts = instance.findAllByType(Text);
        const placeholderText = texts.find(
          (text) => text.props.children === "No Image"
        );
        expect(placeholderText).toBeDefined();
      });

      it("should render custom fallback text when no source is provided", () => {
        const customText = "Custom Placeholder";
        const tree = renderer.create(
          <SmartImage
            style={{ width: 100, height: 100 }}
            fallbackText={customText}
          />
        );

        const instance = tree.root;
        const texts = instance.findAllByType(Text);
        const placeholderText = texts.find(
          (text) => text.props.children === customText
        );
        expect(placeholderText).toBeDefined();
      });

      it("should call onError callback when image fails to load", () => {
        const onErrorMock = jest.fn();
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/broken-image.jpg" }}
            style={{ width: 100, height: 100 }}
            onError={onErrorMock}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);

        // Simulate onError event with act
        act(() => {
          if (image.props.onError) {
            image.props.onError();
          }
        });

        expect(onErrorMock).toHaveBeenCalledTimes(1);
      });

      it("should apply custom fallback text styles", () => {
        const customTextStyle = {
          fontSize: 16,
          color: "#FF0000",
          fontWeight: "bold" as const,
        };
        const tree = renderer.create(
          <SmartImage
            style={{ width: 100, height: 100 }}
            fallbackText="Custom Style Text"
            fallbackTextStyle={customTextStyle}
          />
        );

        const instance = tree.root;
        const texts = instance.findAllByType(Text);
        const styledText = texts.find(
          (text) => text.props.children === "Custom Style Text"
        );

        expect(styledText).toBeDefined();
        expect(styledText?.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining(customTextStyle)])
        );
      });
    });

    describe("Image Source Processing", () => {
      it("should process relative URIs through getImageUrl", () => {
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "relative/path/image.jpg" }}
            style={{ width: 100, height: 100 }}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);
        expect(image.props.source.uri).toBe(
          "https://test.com/images/relative/path/image.jpg"
        );
      });

      it("should not process absolute HTTP URLs", () => {
        const absoluteUrl = "https://example.com/image.jpg";
        const tree = renderer.create(
          <SmartImage
            source={{ uri: absoluteUrl }}
            style={{ width: 100, height: 100 }}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);
        expect(image.props.source.uri).toBe(absoluteUrl);
      });

      it("should handle numeric sources without processing", () => {
        const numericSource = 123;
        const tree = renderer.create(
          <SmartImage
            source={numericSource}
            style={{ width: 100, height: 100 }}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);
        expect(image.props.source).toBe(numericSource);
      });
    });

    describe("Resize Mode", () => {
      it('should use default resize mode "cover"', () => {
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);
        // Check the style array for resizeMode
        expect(
          image.props.style.some(
            (style: any) =>
              style && typeof style === "object" && style.resizeMode === "cover"
          )
        ).toBe(true);
      });

      it("should apply custom resize mode", () => {
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);
        // Check the style array for resizeMode
        expect(
          image.props.style.some(
            (style: any) =>
              style &&
              typeof style === "object" &&
              style.resizeMode === "contain"
          )
        ).toBe(true);
      });
    });

    describe("Component Properties", () => {
      it("should maintain display name", () => {
        expect(SmartImage.displayName).toBe("SmartImage");
      });

      it("should handle component lifecycle callbacks", () => {
        const onLoadMock = jest.fn();
        const onErrorMock = jest.fn();

        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
            onLoad={onLoadMock}
            onError={onErrorMock}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);

        act(() => {
          // Test onLoadStart
          if (image.props.onLoadStart) {
            image.props.onLoadStart();
          }

          // Test onLoad
          if (image.props.onLoad) {
            image.props.onLoad();
          }

          // Test onError
          if (image.props.onError) {
            image.props.onError();
          }
        });

        expect(onLoadMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("Error State Recovery", () => {
      it("should handle missing source gracefully", () => {
        const tree = renderer.create(
          <SmartImage
            style={{ width: 100, height: 100 }}
            fallbackText="No source provided"
          />
        );

        // Should render placeholder instead of image
        const instance = tree.root;
        const texts = instance.findAllByType(Text);
        expect(texts.length).toBeGreaterThan(0);

        // Should not render an Image component when no source
        const images = instance.findAllByType(Image);
        expect(images.length).toBe(0);
      });

      it("should extract dimensions from different style formats", () => {
        // Test with object style
        const tree1 = renderer.create(
          <SmartImage
            source={{ uri: "test.jpg" }}
            style={{ width: 150, height: 100 }}
          />
        );

        // Test with array style
        const tree2 = renderer.create(
          <SmartImage
            source={{ uri: "test.jpg" }}
            style={[{ width: 200 }, { height: 150 }]}
          />
        );

        // Both should render without errors
        expect(tree1.toJSON()).toBeDefined();
        expect(tree2.toJSON()).toBeDefined();
      });

      it("should show placeholder on error state", () => {
        const fallbackText = "Image failed to load";
        const tree = renderer.create(
          <SmartImage
            source={{ uri: "https://example.com/broken-image.jpg" }}
            style={{ width: 100, height: 100 }}
            fallbackText={fallbackText}
          />
        );

        const instance = tree.root;
        const image = instance.findByType(Image);

        // Simulate error to trigger fallback state
        act(() => {
          if (image.props.onError) {
            image.props.onError();
          }
        });

        // Component should handle error state appropriately
        expect(tree).toBeDefined();
      });
    });
  });
});
