import React from "react";
import renderer, { ReactTestRenderer } from "react-test-renderer";
import { Image, View, Text, ActivityIndicator } from "react-native";
import SmartImage from "../src/components/SmartImage";

// Mock the environment config
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

describe("SmartImage", () => {
  describe("Basic Rendering", () => {
    it("should render with a valid image source", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      expect(getByTestId("smart-image")).toBeTruthy();
    });

    it("should render with a numeric source (local image)", () => {
      const { getByTestId } = render(
        <SmartImage
          source={123}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      expect(getByTestId("smart-image")).toBeTruthy();
    });

    it("should apply custom styles", () => {
      const customStyle = { width: 200, height: 150, borderRadius: 10 };
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={customStyle}
          testID="smart-image"
        />
      );

      const imageContainer = getByTestId("smart-image");
      expect(imageContainer.props.style).toEqual(
        expect.objectContaining(customStyle)
      );
    });

    it("should handle array styles", () => {
      const styles = [{ width: 100, height: 100 }, { borderRadius: 5 }];
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={styles}
          testID="smart-image"
        />
      );

      expect(getByTestId("smart-image")).toBeTruthy();
    });
  });

  describe("Loading States", () => {
    it("should show loading indicator initially", async () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      // Loading indicator should be present initially
      expect(() => getByTestId("loading-indicator")).not.toThrow();
    });

    it("should use custom loading size and color", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          loadingSize="large"
          loadingColor="#FF0000"
          testID="smart-image"
        />
      );

      const loadingIndicator =
        getByTestId("smart-image").findByType(ActivityIndicator);
      expect(loadingIndicator.props.size).toBe("large");
      expect(loadingIndicator.props.color).toBe("#FF0000");
    });

    it("should hide loading indicator after successful load", async () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);

      // Simulate successful image load
      fireEvent(image, "onLoad");

      await waitFor(() => {
        expect(() =>
          getByTestId("smart-image").findByType(ActivityIndicator)
        ).toThrow();
      });
    });

    it("should call onLoad callback when image loads successfully", () => {
      const onLoadMock = jest.fn();
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          onLoad={onLoadMock}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onLoad");

      expect(onLoadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling and Placeholder Rendering", () => {
    it("should render placeholder when no source is provided", () => {
      const { getByText } = render(
        <SmartImage style={{ width: 100, height: 100 }} testID="smart-image" />
      );

      expect(getByText("No Image")).toBeTruthy();
    });

    it("should render custom fallback text when no source is provided", () => {
      const customText = "Custom Placeholder";
      const { getByText } = render(
        <SmartImage
          style={{ width: 100, height: 100 }}
          fallbackText={customText}
          testID="smart-image"
        />
      );

      expect(getByText(customText)).toBeTruthy();
    });

    it("should show error placeholder when image fails to load", async () => {
      const fallbackText = "Failed to load image";
      const { getByTestId, getByText } = render(
        <SmartImage
          source={{ uri: "https://example.com/broken-image.jpg" }}
          style={{ width: 100, height: 100 }}
          fallbackText={fallbackText}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);

      // Simulate image load error
      fireEvent(image, "onError");

      await waitFor(() => {
        expect(getByText(fallbackText)).toBeTruthy();
      });
    });

    it("should call onError callback when image fails to load", () => {
      const onErrorMock = jest.fn();
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/broken-image.jpg" }}
          style={{ width: 100, height: 100 }}
          onError={onErrorMock}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      expect(onErrorMock).toHaveBeenCalledTimes(1);
    });

    it("should use fallback image URL when original image fails to load", async () => {
      const fallbackText = "Error Image";
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/broken-image.jpg" }}
          style={{ width: 200, height: 150 }}
          fallbackText={fallbackText}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);

      // Simulate image load error
      fireEvent(image, "onError");

      await waitFor(() => {
        // After error, the image source should be the placeholder URL
        expect(image.props.source.uri).toContain("placeholder.com");
        expect(image.props.source.uri).toContain("200x150");
        expect(image.props.source.uri).toContain(
          encodeURIComponent(fallbackText)
        );
      });
    });

    it("should show error overlay with fallback text on error", async () => {
      const fallbackText = "Image not available";
      const { getByTestId, getByText } = render(
        <SmartImage
          source={{ uri: "https://example.com/broken-image.jpg" }}
          style={{ width: 100, height: 100 }}
          fallbackText={fallbackText}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      await waitFor(() => {
        const errorText = getByText(fallbackText);
        expect(errorText).toBeTruthy();
        expect(errorText.props.numberOfLines).toBe(2);
      });
    });

    it("should apply custom fallback text styles", () => {
      const customTextStyle = {
        fontSize: 16,
        color: "#FF0000",
        fontWeight: "bold",
      };
      const { getByText } = render(
        <SmartImage
          style={{ width: 100, height: 100 }}
          fallbackText="Custom Style Text"
          fallbackTextStyle={customTextStyle}
          testID="smart-image"
        />
      );

      const text = getByText("Custom Style Text");
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customTextStyle)])
      );
    });

    it("should apply custom placeholder styles", () => {
      const customPlaceholderStyle = {
        backgroundColor: "#F0F0F0",
        borderWidth: 1,
      };
      const { getByTestId } = render(
        <SmartImage
          style={{ width: 100, height: 100 }}
          fallbackText="Styled Placeholder"
          placeholderStyle={customPlaceholderStyle}
          testID="smart-image"
        />
      );

      const container = getByTestId("smart-image");
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customPlaceholderStyle),
        ])
      );
    });
  });

  describe("Image Source Processing", () => {
    it("should process relative URIs through getImageUrl", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "relative/path/image.jpg" }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      expect(image.props.source.uri).toBe(
        "https://test.com/images/relative/path/image.jpg"
      );
    });

    it("should not process absolute HTTP URLs", () => {
      const absoluteUrl = "https://example.com/image.jpg";
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: absoluteUrl }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      expect(image.props.source.uri).toBe(absoluteUrl);
    });

    it("should not process absolute HTTPS URLs", () => {
      const absoluteUrl = "https://secure.example.com/image.jpg";
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: absoluteUrl }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      expect(image.props.source.uri).toBe(absoluteUrl);
    });

    it("should handle numeric sources without processing", () => {
      const numericSource = 123;
      const { getByTestId } = render(
        <SmartImage
          source={numericSource}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      expect(image.props.source).toBe(numericSource);
    });
  });

  describe("Dimension Extraction", () => {
    it("should extract width and height from style object", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "test-image.jpg" }}
          style={{ width: 300, height: 200 }}
          fallbackText="Size Test"
          testID="smart-image"
        />
      );

      // Trigger error to test fallback URL generation with extracted dimensions
      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      // The fallback URL should contain the extracted dimensions
      expect(image.props.source.uri).toContain("300x200");
    });

    it("should use default dimensions when style dimensions are not provided", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "test-image.jpg" }}
          style={{}} // No dimensions
          fallbackText="Default Size"
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      // Should use default 300x300 dimensions
      expect(image.props.source.uri).toContain("300x300");
    });

    it("should handle array styles for dimension extraction", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "test-image.jpg" }}
          style={[{ width: 150 }, { height: 100 }]}
          fallbackText="Array Style"
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      expect(image.props.source.uri).toContain("150x100");
    });
  });

  describe("Resize Mode", () => {
    it('should use default resize mode "cover"', () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      expect(image.props.style.resizeMode).toBe("cover");
    });

    it("should apply custom resize mode", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      expect(image.props.style.resizeMode).toBe("contain");
    });

    it("should support all resize modes", () => {
      const resizeModes = ["cover", "contain", "stretch", "center"] as const;

      resizeModes.forEach((mode) => {
        const { getByTestId } = render(
          <SmartImage
            source={{ uri: "https://example.com/image.jpg" }}
            style={{ width: 100, height: 100 }}
            resizeMode={mode}
            testID={`smart-image-${mode}`}
          />
        );

        const image = getByTestId(`smart-image-${mode}`).findByType(Image);
        expect(image.props.style.resizeMode).toBe(mode);
      });
    });
  });

  describe("Loading State Management", () => {
    it("should show loading on load start", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onLoadStart");

      // Loading indicator should be visible
      expect(() =>
        getByTestId("smart-image").findByType(ActivityIndicator)
      ).not.toThrow();
    });

    it("should reset error state on load start", async () => {
      const { getByTestId, queryByText } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          fallbackText="Error State"
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);

      // First cause an error
      fireEvent(image, "onError");
      await waitFor(() => {
        expect(queryByText("Error State")).toBeTruthy();
      });

      // Then trigger load start (simulating retry)
      fireEvent(image, "onLoadStart");

      // Error text should be gone, loading should be shown
      expect(queryByText("Error State")).toBeFalsy();
      expect(() =>
        getByTestId("smart-image").findByType(ActivityIndicator)
      ).not.toThrow();
    });
  });

  describe("Placeholder URL Generation", () => {
    it("should generate placeholder URL with custom text", () => {
      const customText = "Custom Placeholder Text";
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "broken-image.jpg" }}
          style={{ width: 400, height: 300 }}
          fallbackText={customText}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      const expectedUrl = `https://via.placeholder.com/400x300/text=${encodeURIComponent(
        customText
      )}`;
      expect(image.props.source.uri).toBe(expectedUrl);
    });

    it("should generate placeholder URL without text when not provided", () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "broken-image.jpg" }}
          style={{ width: 250, height: 250 }}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      expect(image.props.source.uri).toBe(
        "https://via.placeholder.com/250x250"
      );
    });
  });

  describe("Component Lifecycle", () => {
    it("should handle multiple load cycles", async () => {
      const onLoadMock = jest.fn();
      const onErrorMock = jest.fn();

      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/image.jpg" }}
          style={{ width: 100, height: 100 }}
          onLoad={onLoadMock}
          onError={onErrorMock}
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);

      // First load cycle - success
      fireEvent(image, "onLoadStart");
      fireEvent(image, "onLoad");

      // Second load cycle - error
      fireEvent(image, "onLoadStart");
      fireEvent(image, "onError");

      // Third load cycle - success again
      fireEvent(image, "onLoadStart");
      fireEvent(image, "onLoad");

      expect(onLoadMock).toHaveBeenCalledTimes(2);
      expect(onErrorMock).toHaveBeenCalledTimes(1);
    });

    it("should maintain display name", () => {
      expect(SmartImage.displayName).toBe("SmartImage");
    });
  });

  describe("Error State Recovery", () => {
    it("should show fallback image when error occurs with URI source", async () => {
      const { getByTestId } = render(
        <SmartImage
          source={{ uri: "https://example.com/broken.jpg" }}
          style={{ width: 100, height: 100 }}
          fallbackText="Backup Image"
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      await waitFor(() => {
        // Should now show the fallback placeholder image
        expect(image.props.source.uri).toContain("placeholder");
      });
    });

    it("should not show error overlay for numeric sources", async () => {
      const { getByTestId, queryByText } = render(
        <SmartImage
          source={123}
          style={{ width: 100, height: 100 }}
          fallbackText="This should not appear"
          testID="smart-image"
        />
      );

      const image = getByTestId("smart-image").findByType(Image);
      fireEvent(image, "onError");

      await waitFor(() => {
        // Error overlay should not appear for numeric sources
        expect(queryByText("This should not appear")).toBeFalsy();
      });
    });
  });
});
