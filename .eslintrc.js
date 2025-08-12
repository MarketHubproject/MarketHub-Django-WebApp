module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Existing React Native rules
    // Note: Custom Chinese Unicode detection is handled by the CI script
    // Run 'npm run ci:check-chinese' to check for Chinese characters
    
    // Forbid hardcoded strings in UI components
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXText[value=/\S+/]',
        message: 'Hardcoded strings are not allowed in JSX. Use i18n.t() for translatable text.',
      },
      {
        selector: 'JSXExpressionContainer > Literal[value=/\S+/]',
        message: 'Hardcoded string literals in JSX expressions are not allowed. Use i18n.t() for translatable text.',
      },
      {
        selector: 'JSXAttribute[name.name="placeholder"] > Literal[value=/\S+/]',
        message: 'Hardcoded placeholder strings are not allowed. Use i18n.t() for translatable placeholders.',
      },
    ],
  },
};
