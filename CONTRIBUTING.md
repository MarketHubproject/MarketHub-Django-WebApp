# Contributing to MarketHub Mobile

Thank you for your interest in contributing to MarketHub Mobile! This document outlines our contribution guidelines and development practices.

## 📋 Table of Contents

- [Code Standards](#code-standards)
- [Internationalization (i18n) Requirements](#internationalization-i18n-requirements)
- [Chinese Unicode Prevention](#chinese-unicode-prevention)
- [Development Workflow](#development-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Testing Requirements](#testing-requirements)

## 🎯 Code Standards

### General Guidelines

- Follow the existing code style and patterns in the project
- Use TypeScript for new code where possible
- Write clear, descriptive commit messages
- Keep pull requests focused and atomic

### ESLint and Code Quality

- All code must pass ESLint checks: `npm run lint`
- Fix any linting errors before submitting PR
- Use Prettier for consistent code formatting

## 🌍 Internationalization (i18n) Requirements

### **CRITICAL: No Chinese Unicode Characters Allowed**

**MarketHub Mobile has a strict policy against Chinese Unicode characters in source code.**

#### Why This Policy Exists

1. **Internationalization Best Practices**: All user-facing text should be externalized to translation files
2. **Code Maintainability**: Hardcoded text makes localization difficult
3. **Consistency**: Ensures all text follows the same i18n pattern

#### What Gets Detected

Our CI system automatically scans for Chinese Unicode characters in the range `U+4E00-U+9FFF`, which includes:
- Simplified Chinese characters (简体中文)
- Traditional Chinese characters (繁體中文)
- Common Han ideographs

#### Prohibited ❌

```javascript
// DON'T DO THIS - Chinese characters in source code
const welcomeMessage = "欢迎使用MarketHub";
const title = "产品列表";
```

#### Required ✅

```javascript
// DO THIS - Use i18n translation keys
import i18n from '../services/i18n';

const welcomeMessage = i18n.t('common.welcome');
const title = i18n.t('products.listTitle');
```

### Translation File Structure

All translations are stored in `i18n/en.json` with a hierarchical structure:

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "auth": {
    "welcomeBack": "Welcome Back!",
    "signIn": "Sign In"
  },
  "products": {
    "listTitle": "Products",
    "addToCart": "Add to Cart"
  }
}
```

### Using the i18n Service

```javascript
import i18n from '../services/i18n';

// Simple translation
const text = i18n.t('common.loading');

// Translation with parameters
const greeting = i18n.t('auth.welcomeUser', { name: 'John' });
// Expects: "Welcome back, {{name}}!" in translation file
```

## 🚫 Chinese Unicode Prevention

### Automated Checks

We have multiple layers of protection against Chinese Unicode regression:

#### 1. CI/CD Pipeline
- **Automatic Scanning**: Every push and PR triggers Chinese Unicode detection
- **Build Failure**: CI fails if any Chinese characters are detected
- **GitHub Actions**: `.github/workflows/ci.yml` runs the check

#### 2. Development Scripts

```bash
# Check for Chinese characters locally
npm run lint:chinese

# Run both Chinese check and ESLint
npm run ci:check-chinese
```

#### 3. Pre-commit Recommendations

Add this to your git hooks for early detection:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run lint:chinese
if [ $? -ne 0 ]; then
  echo "❌ Commit rejected: Chinese Unicode characters detected"
  exit 1
fi
```

### What Happens When Chinese Characters Are Found

The CI system will:

1. **Fail the build** with exit code 1
2. **Report exact locations** of Chinese characters:
   ```
   ❌ src/components/ProductCard.tsx:
      Line 15, Column 23: "价格" (U+4EF7)
      Line 18, Column 15: "商品" (U+5546)
   ```
3. **Provide remediation steps** in the output

### How to Fix Chinese Character Violations

1. **Identify the text** that needs to be translated
2. **Add translation key** to `i18n/en.json`:
   ```json
   {
     "products": {
       "price": "Price",
       "product": "Product"
     }
   }
   ```
3. **Replace in source code**:
   ```javascript
   // Before
   const priceLabel = "价格";
   
   // After
   const priceLabel = i18n.t('products.price');
   ```
4. **Run the check** to verify: `npm run lint:chinese`

## 🔄 Development Workflow

### Setting Up Development Environment

1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd MarketHubMobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run Chinese Unicode check**:
   ```bash
   npm run lint:chinese
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

### Before Making Changes

1. **Check current state** is clean:
   ```bash
   npm run ci:check-chinese
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### During Development

- **Use translation keys** for all user-facing text
- **Test locally** with `npm run lint:chinese` frequently
- **Follow existing i18n patterns** in the codebase

### Before Submitting PR

1. **Run full checks**:
   ```bash
   npm run ci:check-chinese
   npm test
   ```

2. **Verify translations** are properly structured
3. **Test app functionality** with your changes

## 📝 Pull Request Guidelines

### PR Requirements

- [ ] **No Chinese Unicode characters** (verified by CI)
- [ ] **All tests pass**: `npm test`
- [ ] **ESLint clean**: `npm run lint`
- [ ] **Translations updated** if adding new user-facing text
- [ ] **Clear description** of changes

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Chinese Unicode check passes (`npm run lint:chinese`)
- [ ] All tests pass (`npm test`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Added/updated translations if needed
- [ ] Self-reviewed code changes
```

### Review Process

1. **Automated checks** must pass (CI pipeline)
2. **Code review** by maintainers
3. **Testing verification** in development environment
4. **Translation review** for new text additions

## 🧪 Testing Requirements

### Required Tests

- **Unit tests** for new functions/components
- **Integration tests** for new features
- **i18n tests** for translation coverage

### Running Tests

```bash
# Run all tests
npm test

# Run Chinese Unicode detection test
npm run lint:chinese

# Run ESLint
npm run lint
```

### Writing i18n-Compliant Tests

```javascript
// Good - Testing with translation keys
import i18n from '../services/i18n';

test('should display correct welcome message', () => {
  const component = render(<WelcomeScreen />);
  expect(component.getByText(i18n.t('auth.welcomeBack'))).toBeInTheDocument();
});

// Bad - Testing with hardcoded Chinese text
test('should display welcome message', () => {
  const component = render(<WelcomeScreen />);
  expect(component.getByText('欢迎回来')).toBeInTheDocument(); // ❌ Will fail CI
});
```

## 📚 Additional Resources

### Documentation

- [React Native Internationalization Guide](https://reactnative.dev/docs/accessibility#internationalization-i18n)
- [i18n Best Practices](https://phrase.com/blog/posts/react-i18n-best-practices/)

### Project-Specific Files

- `i18n/en.json` - English translations
- `src/services/i18n.ts` - Translation service
- `scripts/check-chinese-unicode.js` - Chinese detection script
- `.github/workflows/ci.yml` - CI pipeline configuration

### Getting Help

- **Questions about i18n**: Check existing translation patterns in `src/`
- **CI failures**: Review the Chinese Unicode detection output
- **General questions**: Create an issue with the `question` label

---

## 🎉 Thank You!

By following these guidelines, you help maintain MarketHub Mobile's code quality and internationalization standards. Every contribution makes the project better for users worldwide!

**Remember**: When in doubt about Chinese Unicode, run `npm run lint:chinese` - it's better to check early and often! 🔍✨
