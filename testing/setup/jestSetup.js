import 'react-native-gesture-handler/jestSetup';

// Configure testing environment
global.__DEV__ = true;

// Mock global fetch if not available in test environment
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map(),
    })
  );
}

// Mock XMLHttpRequest for testing
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  readyState: 4,
  status: 200,
  responseText: '{}',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock FormData
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
}));

// Mock File and Blob APIs
global.File = jest.fn((chunks, filename, options) => ({
  chunks,
  filename,
  options,
  size: chunks.reduce((acc, chunk) => acc + chunk.length, 0),
  type: options?.type || '',
  lastModified: Date.now(),
}));

global.Blob = jest.fn((chunks, options) => ({
  chunks,
  options,
  size: chunks ? chunks.reduce((acc, chunk) => acc + chunk.length, 0) : 0,
  type: options?.type || '',
}));

// Mock WebSocket for chat functionality
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock URL and URLSearchParams
global.URL = jest.fn((url) => ({
  href: url,
  protocol: 'https:',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
  pathname: '/path',
  search: '',
  hash: '',
  origin: 'https://localhost',
  toString: () => url,
}));

global.URLSearchParams = jest.fn(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  sort: jest.fn(),
  toString: jest.fn(() => ''),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
}));

// Mock timers for better test control
jest.useFakeTimers();

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.createMockNavigationProp = (params = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  getId: jest.fn(() => 'test-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({ index: 0, routes: [{ name: 'Test', params }] })),
});

global.createMockRouteProp = (params = {}, name = 'Test') => ({
  key: 'test-key',
  name,
  params,
  path: '/test',
});

// Test data generators
global.generateMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

global.generateMockProduct = (overrides = {}) => ({
  id: '1',
  name: 'Test Product',
  description: 'Test product description',
  price: 99.99,
  currency: 'USD',
  imageUrl: 'https://example.com/image.jpg',
  category: 'Electronics',
  inStock: true,
  rating: 4.5,
  reviewCount: 10,
  ...overrides,
});

global.generateMockCartItem = (overrides = {}) => ({
  id: '1',
  productId: '1',
  quantity: 1,
  price: 99.99,
  product: generateMockProduct(),
  ...overrides,
});

global.generateMockOrder = (overrides = {}) => ({
  id: '1',
  userId: '1',
  items: [generateMockCartItem()],
  total: 99.99,
  currency: 'USD',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
});
