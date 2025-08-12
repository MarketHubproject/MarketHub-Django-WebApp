declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    IMAGE_BASE_URL?: string;
    PLACEHOLDER_IMAGE_URL?: string;
    API_TIMEOUT?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
