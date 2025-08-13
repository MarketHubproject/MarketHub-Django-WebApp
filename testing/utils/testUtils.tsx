import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock providers for testing
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialState?: any;
}

const AllProviders = ({ 
  children, 
  queryClient,
  initialState = {} 
}: AllProvidersProps) => {
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={testQueryClient}>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialState?: any;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, initialState, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders 
        queryClient={queryClient} 
        initialState={initialState}
      >
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
};

// Test utilities for async operations
export const waitForLoadingToFinish = () => 
  new Promise((resolve) => setTimeout(resolve, 0));

export const flushPromises = () => 
  new Promise(setImmediate);

// Mock data factories
export const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence errors in tests
    },
  });
};

// Navigation test helpers
export const createMockNavigationProps = (overrides = {}) => ({
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    ...overrides,
  },
  route: {
    key: 'test-key',
    name: 'TestScreen',
    params: {},
    ...overrides,
  },
});

// Form testing helpers
export const fillForm = async (getByTestId: any, formData: Record<string, string>) => {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = getByTestId(fieldName);
    if (field) {
      // Simulate user input
      field.props.onChangeText?.(value);
    }
  }
};

// API response mocks
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  headers: new Map(),
});

// Network testing utilities
export const mockNetworkError = () => {
  throw new Error('Network Error');
};

export const mockApiError = (status: number, message: string) => {
  const error = new Error(message) as any;
  error.response = {
    status,
    data: { message },
  };
  throw error;
};

// Store testing utilities
export const createMockStore = (initialState = {}) => {
  const store = {
    ...initialState,
    getState: () => store,
    setState: (updates: any) => Object.assign(store, updates),
    subscribe: jest.fn(),
  };
  return store;
};

// Animation testing helpers
export const mockReanimatedValue = (initialValue = 0) => ({
  value: initialValue,
  setValue: jest.fn(),
  interpolate: jest.fn(() => ({ value: initialValue })),
});

// File/Image testing helpers
export const createMockImageProps = (overrides = {}) => ({
  source: { uri: 'https://example.com/image.jpg' },
  style: {},
  onLoad: jest.fn(),
  onError: jest.fn(),
  testID: 'mock-image',
  ...overrides,
});

// Date testing helpers
export const mockDate = (isoString: string) => {
  const mockDate = new Date(isoString);
  const originalDate = Date;
  
  // Mock Date constructor
  global.Date = jest.fn(() => mockDate) as any;
  global.Date.now = jest.fn(() => mockDate.getTime());
  global.Date.UTC = originalDate.UTC;
  global.Date.parse = originalDate.parse;
  global.Date.prototype = originalDate.prototype;
  
  return () => {
    global.Date = originalDate;
  };
};

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => Promise<void>) => {
  const startTime = performance.now();
  await renderFn();
  const endTime = performance.now();
  return endTime - startTime;
};

// Accessibility testing helpers
export const testAccessibility = (component: ReactElement) => {
  const { getByLabelText, getByRole, queryAllByA11yHint } = customRender(component);
  
  return {
    hasAccessibilityLabel: (text: string) => {
      try {
        getByLabelText(text);
        return true;
      } catch {
        return false;
      }
    },
    hasAccessibilityRole: (role: string) => {
      try {
        getByRole(role);
        return true;
      } catch {
        return false;
      }
    },
    hasAccessibilityHints: () => queryAllByA11yHint(/.*/).length > 0,
  };
};

// Export everything including the custom render
export * from '@testing-library/react-native';
export { customRender as render };
export { AllProviders };
