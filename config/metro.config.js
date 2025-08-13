const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@/components': path.resolve(__dirname, '../src/components'),
      '@/screens': path.resolve(__dirname, '../src/screens'),
      '@/features': path.resolve(__dirname, '../src/features'),
      '@/shared': path.resolve(__dirname, '../src/shared'),
      '@/services': path.resolve(__dirname, '../src/services'),
      '@/utils': path.resolve(__dirname, '../src/utils'),
      '@/contexts': path.resolve(__dirname, '../src/contexts'),
      '@/navigation': path.resolve(__dirname, '../src/navigation'),
      '@/theme': path.resolve(__dirname, '../src/theme'),
      '@/types': path.resolve(__dirname, '../src/types'),
      '@/config': path.resolve(__dirname, '../src/config'),
    },
  },
  transformer: {
    // Enable dynamic imports
    asyncRequireModulePath: require.resolve('metro-runtime/src/modules/asyncRequire'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Optimize bundle size
      },
    }),
  },
  serializer: {
    // Optimize bundle by splitting
    createModuleIdFactory: () => (path) => {
      // Create stable module IDs for better caching
      const hash = require('crypto')
        .createHash('sha1')
        .update(path)
        .digest('hex')
        .substr(0, 8);
      return hash;
    },
    getModulesRunBeforeMainModule: () => [
      // Add polyfills or setup modules here
      require.resolve('react-native/Libraries/Core/InitializeCore'),
    ],
  },
  // Enable RAM bundles for better performance
  unstable_allowRequireContext: true,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
