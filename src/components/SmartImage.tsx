import React, { useState, useCallback, memo } from "react";
import {
  Image,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ImageStyle,
  ViewStyle,
  TextStyle,
} from "react-native";
import { getImageUrl, getPlaceholderImageUrl } from "../config/environment";

interface SmartImageProps {
  source?: { uri: string } | number;
  style?: ImageStyle | ViewStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  fallbackText?: string;
  loadingSize?: "small" | "large";
  loadingColor?: string;
  fallbackTextStyle?: TextStyle;
  placeholderStyle?: ViewStyle;
  onLoad?: () => void;
  onError?: () => void;
}

const SmartImage: React.FC<SmartImageProps> = memo(
  ({
    source,
    style,
    resizeMode = "cover",
    fallbackText,
    loadingSize = "small",
    loadingColor = "#007AFF",
    fallbackTextStyle,
    placeholderStyle,
    onLoad,
    onError,
  }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleLoad = useCallback(() => {
      setLoading(false);
      setError(false);
      onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
      setLoading(false);
      setError(true);
      onError?.();
    }, [onError]);

    const handleLoadStart = useCallback(() => {
      setLoading(true);
      setError(false);
    }, []);

    // Extract dimensions from style for placeholder
    const extractDimensions = (): { width?: number; height?: number } => {
      if (Array.isArray(style)) {
        const flatStyle = StyleSheet.flatten(style);
        return {
          width: flatStyle.width as number,
          height: flatStyle.height as number,
        };
      }
      return {
        width: style?.width as number,
        height: style?.height as number,
      };
    };

    const { width = 300, height = 300 } = extractDimensions();

    // Generate fallback image URL with text
    const getFallbackImageUrl = useCallback((): string => {
      return getPlaceholderImageUrl(width, height, fallbackText);
    }, [width, height, fallbackText]);

    // Determine the image source to use
    const getImageSource = (): { uri: string } | number | null => {
      if (!source) return null;

      // Handle numeric sources (local images)
      if (typeof source === "number") {
        return source;
      }

      // Handle URI sources
      if (source.uri) {
        if (error) {
          // Use fallback image on error
          return { uri: getFallbackImageUrl() };
        }

        // Use original source or process through getImageUrl
        const processedUri = source.uri.startsWith("http")
          ? source.uri
          : getImageUrl(source.uri);

        return { uri: processedUri };
      }

      return null;
    };

    const imageSource = getImageSource();

    if (!imageSource) {
      // No valid source provided, show fallback placeholder
      return (
        <View style={[styles.container, style, placeholderStyle]}>
          <View style={styles.placeholderContainer}>
            <Text style={[styles.placeholderText, fallbackTextStyle]}>
              {fallbackText || "No Image"}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <Image
          source={imageSource}
          style={[StyleSheet.absoluteFillObject, { resizeMode }]}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size={loadingSize} color={loadingColor} />
          </View>
        )}

        {error && fallbackText && typeof imageSource === "object" && (
          <View style={styles.errorOverlay}>
            <Text
              style={[styles.errorText, fallbackTextStyle]}
              numberOfLines={2}
            >
              {fallbackText}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

SmartImage.displayName = "SmartImage";

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SmartImage;
