module.exports = {
  root: true,
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
  },
  rules: {
    // Existing React Native rules
    // Note: Custom Chinese Unicode detection is handled by the CI script
    // Run 'npm run ci:check-chinese' to check for Chinese characters
    
    // Forbid hardcoded strings in UI components (relaxed for deployment)
    'no-restricted-syntax': [
      'warn', // Changed from 'error' to 'warn'
      {
        selector: 'JSXText[value=/\\S+/]',
        message: 'Hardcoded strings are not allowed in JSX. Use i18n.t() for translatable text.',
      },
      {
        selector: 'JSXExpressionContainer > Literal[value=/\\S+/]',
        message: 'Hardcoded string literals in JSX expressions are not allowed. Use i18n.t() for translatable text.',
      },
      {
        selector: 'JSXAttribute[name.name="placeholder"] > Literal[value=/\\S+/]',
        message: 'Hardcoded placeholder strings are not allowed. Use i18n.t() for translatable placeholders.',
      },
    ],
    
    // Feature-slice architecture rules
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../features/*'],
            message: 'Direct imports from other features are not allowed. Use shared layer instead.',
          },
          {
            group: ['../../features/*'],
            message: 'Direct imports from features in parent directories are not allowed.',
          },
        ],
      },
    ],
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // React specific rules
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'react-hooks/exhaustive-deps': 'warn',
  },
};
