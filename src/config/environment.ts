// Environment configuration using React Native Config
import Config from "react-native-config";

interface EnvironmentConfig {
  API_BASE_URL: string;
  IMAGE_BASE_URL: string;
  PLACEHOLDER_IMAGE_URL: string;
  TIMEOUT: number;
  USE_MOCK_API: boolean;
}

export const config = {
  API_BASE_URL: Config.API_BASE_URL,
  IMAGE_BASE_URL: Config.IMAGE_BASE_URL,
  PLACEHOLDER_IMAGE_URL: Config.PLACEHOLDER_IMAGE_URL,
  TIMEOUT: Number(Config.TIMEOUT) || 10000,
  USE_MOCK_API: Config.USE_MOCK_API === "true",
};

// Helper functions for image URL construction
export const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) {
    return getPlaceholderImageUrl();
  }

  // If it's already a full URL, return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // If it's a relative path, prepend the base URL
  return `${config.IMAGE_BASE_URL}/${imagePath}`
    .replace(/\/+/g, "/")
    .replace(":/", "://");
};

export const getPlaceholderImageUrl = (
  width: number = 300,
  height: number = 300,
  text?: string
): string => {
  const placeholderText = text ? `?text=${encodeURIComponent(text)}` : "";
  return `${config.PLACEHOLDER_IMAGE_URL}/${width}/${height}${placeholderText}`;
};

export const getProductImageUrl = (product: any): string => {
  if (product.image) {
    return getImageUrl(product.image);
  }

  // Generate a placeholder with product name
  const placeholderText = product.name ? `${product.name}` : "Product Image";
  return getPlaceholderImageUrl(300, 300, placeholderText);
};

export default config;
