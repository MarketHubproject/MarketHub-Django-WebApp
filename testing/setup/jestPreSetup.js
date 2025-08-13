import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useIsFocused: () => true,
  useFocusEffect: jest.fn(),
}));

// Mock React Native Config
jest.mock('react-native-config', () => ({
  API_URL: 'https://api.test.com',
  ENVIRONMENT: 'test',
  SENTRY_DSN: 'test-dsn',
  FIREBASE_PROJECT_ID: 'test-project',
}));

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock React Native Toast Message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  app: () => ({
    delete: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  logScreenView: jest.fn(),
  logPurchase: jest.fn(),
  setCurrentScreen: jest.fn(),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  recordError: jest.fn(),
  log: jest.fn(),
  setUserId: jest.fn(),
  setAttribute: jest.fn(),
  setAttributes: jest.fn(),
  crash: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  hasPermission: jest.fn(() => Promise.resolve(true)),
  subscribeToTopic: jest.fn(),
  unsubscribeFromTopic: jest.fn(),
  requestPermission: jest.fn(() => Promise.resolve(true)),
  getToken: jest.fn(() => Promise.resolve('token')),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  configureScope: jest.fn(),
  withScope: jest.fn((fn) => fn({})),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  useNetInfo: () => ({
    isConnected: true,
    type: 'wifi',
  }),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'wifi' })),
}));

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

// Mock React Native Share
jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
  shareSingle: jest.fn(() => Promise.resolve()),
}));

// Mock Device Info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getBundleId: jest.fn(() => 'com.test.app'),
  getUniqueId: jest.fn(() => 'unique-id'),
  getDeviceId: jest.fn(() => 'device-id'),
  getSystemVersion: jest.fn(() => '14.0'),
  getModel: jest.fn(() => 'iPhone'),
  getBrand: jest.fn(() => 'Apple'),
  hasNotch: jest.fn(() => false),
  isTablet: jest.fn(() => false),
}));

// Mock Branch
jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  openURL: jest.fn(),
  setIdentity: jest.fn(),
  logout: jest.fn(),
  getLatestReferringParams: jest.fn(() => Promise.resolve({})),
  getFirstReferringParams: jest.fn(() => Promise.resolve({})),
}));

// Mock Background Fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  finish: jest.fn(),
  status: jest.fn(() => Promise.resolve(0)),
}));

// Mock Performance
jest.mock('@shopify/react-native-performance', () => ({
  Performance: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () =>
  require('react-native-gesture-handler/jestSetup'),
);

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// Silence console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
