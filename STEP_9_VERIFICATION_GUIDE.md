# Step 9 Verification & Usage Guide

## 🎯 Quick Verification

Run these commands to verify that Step 9 is working correctly:

### 1. Check Stylelint Installation
```bash
npm list stylelint
npm list stylelint-config-standard
```

### 2. Test Icon Linting (should pass)
```bash
npm run lint-icons
```

### 3. Test CSS Linting
```bash
npm run lint-css
```

## 🧪 Testing the Rules

### Create a test CSS file to verify Font Awesome detection:
```bash
# Create a test file (for demonstration)
echo ".fa-user { color: red; }" > test-fa.css

# Run linting - should show warning about fa- classes
npx stylelint test-fa.css

# Clean up
del test-fa.css
```

## 📋 Usage Examples for Developers

### ✅ Correct Bootstrap Icons Usage

```html
<!-- HTML Templates -->
<i class="bi bi-cart"></i>
<i class="bi bi-person"></i>
<i class="bi bi-heart"></i>

<!-- With Bootstrap utilities -->
<i class="bi bi-star text-warning fs-4"></i>

<!-- In buttons -->
<button class="btn btn-primary">
  <i class="bi bi-cart me-2"></i>
  Add to Cart
</button>
```

### ❌ What Will Trigger Warnings

```css
/* This will trigger Font Awesome warning */
.fa-user {
    color: red;
}

/* This will trigger manual content warning */
.custom-icon::before {
    content: "\f007";
}
```

## 🔍 Code Review Checklist

When reviewing PRs, check for:

- [ ] Uses Bootstrap Icons (`bi bi-*` classes)
- [ ] No Font Awesome classes (`fa fa-*`)
- [ ] No manual `content:` CSS for icons
- [ ] Proper accessibility attributes
- [ ] Semantic icon choices
- [ ] Follows style guide patterns

## 🎪 Team Setup Instructions

### 1. Update CODEOWNERS Files
Replace the example team names in `CODEOWNERS` and `.github/CODEOWNERS` with your actual GitHub teams:

```
# Replace these examples:
@frontend-team    → @your-org/frontend
@ui-ux-team      → @your-org/design  
@backend-team    → @your-org/backend
@maintainers     → @project-lead @senior-dev
```

### 2. Set Up CI/CD Integration
Add this to your GitHub Actions workflow:

```yaml
- name: Lint CSS for Icon Usage
  run: npm run lint-icons
```

### 3. Install Dependencies on New Machines
```bash
npm install
```

## 📚 Documentation References

- **Icon Style Guide:** `docs/style-guide/icons.md`
- **Linting Configuration:** `.stylelintrc.json`
- **Code Ownership:** `CODEOWNERS` and `.github/CODEOWNERS`
- **Package Scripts:** `package.json`

## 🚀 NPM Scripts Available

```bash
# Build CSS
npm run build          # Production build
npm run build-dev      # Development build
npm run watch          # Watch for changes

# Linting
npm run lint-css       # Lint all CSS/SCSS
npm run lint-css:fix   # Auto-fix issues
npm run lint-icons     # Check icon usage rules

# Cleanup
npm run clean          # Remove built CSS files
```

## 🏆 Success Verification

Step 9 is successfully implemented when:

✅ **README.md** shows icon guidelines  
✅ **Style guide** exists at `docs/style-guide/icons.md`  
✅ **Stylelint** warns about `fa-` classes  
✅ **Code owners** assigned for template files  
✅ **NPM scripts** work without errors  
✅ **Dependencies** installed successfully  

## 💡 Pro Tips for Development

### Quick Icon Reference
```html
<!-- Common e-commerce icons -->
<i class="bi bi-cart"></i>          <!-- Shopping cart -->
<i class="bi bi-bag"></i>           <!-- Shopping bag -->
<i class="bi bi-heart"></i>         <!-- Wishlist -->
<i class="bi bi-search"></i>        <!-- Search -->
<i class="bi bi-person"></i>        <!-- User profile -->
<i class="bi bi-gear"></i>          <!-- Settings -->
<i class="bi bi-house"></i>         <!-- Home -->
```

### VS Code Integration
Add this to your VS Code settings for auto-linting:

```json
{
  "css.validate": false,
  "scss.validate": false,
  "stylelint.validate": ["css", "scss"]
}
```

## 🔧 Troubleshooting

### If stylelint is not found:
```bash
npm install stylelint stylelint-config-standard --save-dev
```

### If rules are not working:
1. Check `.stylelintrc.json` exists
2. Verify NPM scripts in `package.json`
3. Run `npm install` to ensure dependencies

### If CODEOWNERS not working:
1. Ensure file is in repository root
2. Update team names to actual GitHub users/teams
3. Check GitHub repository settings for required reviews

---

## 🎉 Step 9 Complete!

Your MarketHub project now has:
- **Clear icon documentation**
- **Automated linting for icon compliance**  
- **Code review requirements for templates**
- **Migration guide from Font Awesome**
- **Ready-to-use development tools**

The icon migration infrastructure is now in place to prevent regressions and maintain consistency! 🚀
