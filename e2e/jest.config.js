module.exports = {
  preset: 'react-native',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  collectCoverage: false,
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|detox)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
};
