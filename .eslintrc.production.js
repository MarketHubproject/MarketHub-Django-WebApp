module.exports = {
  root: true,
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  globals: {
    performance: 'readonly',
    __DEV__: 'readonly',
  },
  ignorePatterns: [
    'config/*.js',
    'e2e/*.js', 
    'scripts/*.js',
    'node_modules/',
    'android/',
    'ios/',
    '*.config.js',
  ],
  rules: {
    // Relaxed rules for production deployment
    'no-restricted-syntax': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn', 
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-inline-styles': 'warn',
    'no-trailing-spaces': 'off',
    'comma-dangle': 'off',
    'curly': 'off',
    
    // Keep critical rules as errors
    'no-undef': 'error',
    'no-unused-expressions': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
  },
};
