module.exports = {
  root: true,
  extends: [
    '@react-native',
    '@react-native/eslint-config',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', './src'],
          ['@/components', './src/components'],
          ['@/screens', './src/screens'],
          ['@/features', './src/features'],
          ['@/shared', './src/shared'],
          ['@/services', './src/services'],
          ['@/utils', './src/utils'],
          ['@/contexts', './src/contexts'],
          ['@/navigation', './src/navigation'],
          ['@/theme', './src/theme'],
          ['@/types', './src/types'],
          ['@/config', './src/config'],
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  rules: {
    // Existing React Native rules
    // Note: Custom Chinese Unicode detection is handled by the CI script
    // Run 'npm run ci:check-chinese' to check for Chinese characters
    
    // Forbid hardcoded strings in UI components
    'no-restricted-syntax': [
      'error',
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
    
    // Ensure proper import ordering
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
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
    
    // React Query specific rules
    '@tanstack/query/exhaustive-deps': 'error',
    '@tanstack/query/stable-query-client': 'error',
  },
};
