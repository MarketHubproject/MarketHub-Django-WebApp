# MarketHub Theme

A modern, clean, and professional theme for the MarketHub Django WebApp with premium design principles.

## Overview

The MarketHub theme has been implemented with a proper SCSS architecture replacing the previous inline styles. This provides better maintainability, scalability, and follows modern CSS best practices.

## File Structure

```
homepage/static/MarketHub/
├── scss/
│   ├── _storelite_variables.scss    # Theme variables and mixins
│   └── store-lite.scss              # Main SCSS file
├── css/
│   ├── store-lite.css              # Compiled CSS (generated)
│   └── store-lite.css.map          # Source map (generated)
├── style.css                       # Legacy file (now points to compiled CSS)
└── store-lite.js                   # Theme JavaScript
```

## Key Features

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Secondary Font**: Playfair Display (Google Fonts)
- Proper font-weight and size scales
- Enhanced readability and modern feel

### Color Scheme
- **Primary**: #007BFF (MarketHub Blue)
- **Text Primary**: #2C3E50 (Professional Dark)
- **Background**: Light gradients (#F8F9FA to #E9ECEF)
- **Clean, minimalist aesthetic**

### Components
- **Cards**: Modern hover effects with subtle shadows
- **Buttons**: Clean design with hover animations
- **Navigation**: Minimalist header with backdrop blur
- **Product Cards**: Professional product showcase
- **Footer**: Light theme with organized sections

### Responsive Design
- Mobile-first approach
- Breakpoints: 576px, 768px, 992px, 1200px, 1400px
- Optimized for all screen sizes

## Build Process

### Prerequisites
- Node.js installed
- Dependencies: `npm install`

### Build Commands

#### Production Build
```bash
npm run build
# or
build-styles.bat
```

#### Development Build
```bash
npm run build-dev
# or
build-styles-dev.bat
```

#### Watch Mode (Development)
```bash
npm run watch
```

### Build Scripts
- `build-styles.bat`: Production build with compressed CSS
- `build-styles-dev.bat`: Development build with expanded CSS and source maps

## SCSS Architecture

### Variables (`_storelite_variables.scss`)
- **Colors**: Complete color palette with semantic naming
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale (0.25rem to 6rem)
- **Shadows**: Professional shadow system
- **Border Radius**: Consistent radius scale
- **Transitions**: Smooth animation timings
- **Bootstrap Overrides**: Clean overrides for Bootstrap components

### Mixins
- `store-lite-backdrop-blur()`: Backdrop filter utility
- `store-lite-gradient-text()`: Gradient text effect
- `store-lite-hover-transform()`: Consistent hover effects
- `store-lite-card()`: Standard card styling
- `store-lite-btn-primary()`: Primary button styling

### Main Styles (`store-lite.scss`)
- **Base Styles**: CSS reset and typography
- **Header Styles**: Clean navigation with backdrop blur
- **Card Styles**: Professional card components
- **Button Styles**: Consistent button design
- **Product Card Styles**: E-commerce product showcase
- **Footer Styles**: Clean footer design
- **Utility Classes**: Helper classes
- **Responsive Design**: Mobile-friendly breakpoints

## Theme Migration

### Changes Made
1. **Replaced inline styles** in `base.html` with compiled SCSS
2. **Removed old dark theme classes** that were not part of MarketHub design
3. **Updated Google Fonts integration** to use Inter and Playfair Display
4. **Implemented proper CSS architecture** with variables and mixins
5. **Enhanced typography** with proper font stacks and sizing
6. **Improved component consistency** across the application

### Backup
- Original styles backed up to `style-backup.css`
- Original inline styles preserved in Git history

## Customization

### Updating Colors
Edit variables in `_storelite_variables.scss`:
```scss
$store-lite-primary: #007BFF;        // Main brand color
$store-lite-text-primary: #2C3E50;   // Primary text color
$store-lite-bg-primary: #F8F9FA;     // Background color
```

### Typography Changes
```scss
$store-lite-font-primary: 'Inter', sans-serif;
$store-lite-font-secondary: 'Playfair Display', serif;
```

### Component Styling
Use provided mixins for consistent styling:
```scss
.my-card {
  @include store-lite-card;
}

.my-button {
  @include store-lite-btn-primary;
}
```

## Browser Support
- Modern browsers (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- Graceful fallbacks for older browsers
- CSS Grid and Flexbox support required

## Performance
- **Compressed CSS**: Production builds are minified
- **Source Maps**: Available for development debugging
- **Google Fonts**: Preloaded for optimal performance
- **Modern CSS**: Uses efficient selectors and properties

## Maintenance

### Adding New Components
1. Add styles to `store-lite.scss` under appropriate section
2. Use existing variables from `_storelite_variables.scss`
3. Follow BEM methodology for class naming
4. Run build process to compile changes

### Updating Variables
1. Edit `_storelite_variables.scss`
2. Run build process
3. Test across all components

### Development Workflow
1. Use `npm run watch` for real-time compilation
2. Edit SCSS files (never edit compiled CSS directly)
3. Run production build before deployment

## Future Enhancements
- Dark mode variant
- Additional color themes
- More component mixins
- CSS custom properties for runtime theming
- Advanced animations and transitions

## Support
For theme-related issues:
1. Check compiled CSS is up to date
2. Verify SCSS syntax
3. Run build process after changes
4. Check browser console for CSS errors
