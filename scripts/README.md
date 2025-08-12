# MarketHub Mobile Scripts

This directory contains utility scripts for maintaining code quality and preventing regressions.

## Chinese Unicode Detection Script

### `check-chinese-unicode.js`

Scans the codebase for Chinese Unicode characters (U+4E00-U+9FFF range) to prevent internationalization regressions.

#### Usage

```bash
# Run directly
node scripts/check-chinese-unicode.js

# Run via npm script
npm run lint:chinese

# Run with ESLint (CI check)
npm run ci:check-chinese
```

#### Features

- **Comprehensive Scanning**: Recursively scans multiple directories
- **File Type Filtering**: Only checks relevant file extensions (.js, .jsx, .ts, .tsx, .json)
- **Exclusion Patterns**: Skips build directories, node_modules, tests, etc.
- **Detailed Reporting**: Shows exact line and column positions
- **Unicode Information**: Displays Unicode codepoints for detected characters
- **CI-Friendly**: Returns appropriate exit codes for automated systems

#### Scanned Directories

- `src/` - Main source code
- `components/` - React components
- `screens/` - Screen components
- `services/` - Service layers
- `utils/` - Utility functions
- `i18n/` - Translation files

#### Exit Codes

- **0**: No Chinese characters found (success)
- **1**: Chinese characters detected or script error (failure)

#### Example Output

**Success (No violations):**
```
✅ SUCCESS: No Chinese characters detected!
📊 Scanned 25 files across 6 directories.
🎉 Codebase is clean and ready for internationalization.
```

**Failure (Violations found):**
```
❌ src/components/ProductCard.tsx:
   Line 15, Column 23: "价格" (U+4EF7)
   Line 18, Column 15: "商品" (U+5546)

❌ CHINESE CHARACTERS DETECTED
📊 Summary:
   • Files scanned: 25
   • Files with violations: 1
   • Total violations: 2
```

#### Integration

This script is integrated into:

1. **CI/CD Pipeline**: `.github/workflows/ci.yml`
2. **npm Scripts**: `package.json`
3. **Development Workflow**: Pre-commit recommendations in `CONTRIBUTING.md`

#### Customization

To modify the scanning behavior, edit the constants at the top of the script:

```javascript
// Directories to scan
const SCAN_DIRECTORIES = ['src', 'components', /* ... */];

// File extensions to check  
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

// Files/directories to exclude
const EXCLUDE_PATTERNS = ['node_modules', '.git', /* ... */];
```

## Internationalization Key Consistency Script

### `check-i18n-keys.js`

Ensures that all translation files have identical key structures to prevent missing translations.

#### Usage

```bash
# Run directly
node scripts/check-i18n-keys.js

# Run via npm script
npm run lint:i18n
```

#### Features

- **Deep Key Extraction**: Recursively extracts all keys from nested JSON objects
- **Structural Comparison**: Compares key sets between translation files
- **Missing Key Detection**: Identifies keys present in one file but missing in another
- **Detailed Reporting**: Shows exact missing keys and file statistics
- **JSON Validation**: Validates JSON syntax before comparison
- **CI-Friendly**: Returns appropriate exit codes for automated systems

#### Supported Files

- `i18n/en.json` - English translations (reference)
- `i18n/zh.json` - Chinese translations

#### Exit Codes

- **0**: All translation files have identical key sets (success)
- **1**: Missing keys detected or script error (failure)

#### Example Output

**Success (Keys match):**
```
🔍 Checking i18n key consistency...
📄 English (en.json): 132 keys
📄 Chinese (zh.json): 132 keys

✅ Key consistency check passed!
🎉 Both translation files have identical key sets.

📋 Sample keys found:
   - auth.continueAsGuest
   - auth.dontHaveAccount
   - auth.email
   - auth.fillAllFields
   - auth.forgotPassword
   ... and 127 more
```

**Failure (Missing keys):**
```
🔍 Checking i18n key consistency...
📄 English (en.json): 132 keys
📄 Chinese (zh.json): 130 keys

❌ Keys missing in Chinese (zh.json):
   - profile.newFeature
   - settings.darkMode

❌ Key consistency check failed!
📝 Please ensure both translation files have identical key structures.
```

#### Key Structure

The script supports deeply nested JSON structures and converts them to dot-notation for comparison:

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "button": "Login"
    }
  }
}
```

Becomes keys: `auth.login.title`, `auth.login.button`

#### Integration

This script should be run:

1. **After adding new translation keys** to ensure consistency
2. **Before committing changes** to prevent regressions
3. **In CI/CD pipeline** to catch missing translations
4. **When onboarding new languages** to verify completeness

---

For more information about internationalization requirements, see [CONTRIBUTING.md](../CONTRIBUTING.md).
