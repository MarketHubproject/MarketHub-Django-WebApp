# 🎨 Icon Style Guide

## Overview

This document outlines the icon standards and guidelines for the MarketHub project. Following these guidelines ensures consistency, maintainability, and performance across the entire application.

## 📋 Icon Library Standard

### **Bootstrap Icons Only**

**MarketHub uses Bootstrap Icons exclusively** for all icon requirements. This decision was made to ensure:

- **Design Consistency**: All icons follow the same design language
- **Performance**: Single icon library reduces bundle size
- **Maintainability**: Centralized icon system reduces complexity
- **Accessibility**: Bootstrap Icons provide built-in accessibility features

🚫 **Do NOT use:**
- Font Awesome icons
- Custom SVG icons (unless absolutely necessary)
- Icon fonts from other libraries
- Inline SVG implementations

✅ **Always use:**
- Bootstrap Icons from the official library
- Consistent implementation patterns
- Semantic icon choices

## 🔧 Implementation Guidelines

### **Standard Icon Usage**

**Always use this format for Bootstrap Icons:**

```html
<i class="bi bi-icon-name"></i>
```

### **Examples of Correct Usage**

```html
<!-- Shopping cart icon -->
<i class="bi bi-cart"></i>

<!-- User profile icon -->
<i class="bi bi-person"></i>

<!-- Search icon -->
<i class="bi bi-search"></i>

<!-- Heart/favorite icon -->
<i class="bi bi-heart"></i>

<!-- Home icon -->
<i class="bi bi-house"></i>

<!-- Settings/gear icon -->
<i class="bi bi-gear"></i>

<!-- Arrow right -->
<i class="bi bi-arrow-right"></i>

<!-- Check mark -->
<i class="bi bi-check-lg"></i>
```

### **Icon with Text Labels**

When using icons with text, ensure proper spacing and semantic structure:

```html
<!-- Button with icon -->
<button class="btn btn-primary">
  <i class="bi bi-cart me-2"></i>
  Add to Cart
</button>

<!-- Navigation link with icon -->
<a href="/profile" class="nav-link">
  <i class="bi bi-person me-1"></i>
  Profile
</a>
```

### **Icon Sizing**

Bootstrap Icons can be sized using standard utilities:

```html
<!-- Default size -->
<i class="bi bi-star"></i>

<!-- Large icons using font-size utilities -->
<i class="bi bi-star fs-1"></i>  <!-- Very large -->
<i class="bi bi-star fs-3"></i>  <!-- Large -->
<i class="bi bi-star fs-5"></i>  <!-- Small -->

<!-- Custom sizing with CSS -->
<i class="bi bi-star" style="font-size: 2rem;"></i>
```

## ⚠️ Critical Rule: Never Write Manual Content CSS

### **❌ NEVER DO THIS:**

```css
/* WRONG - Never manually write content CSS for icons */
.custom-icon::before {
    content: "\f007";
}

.my-icon::after {
    content: "\e001";
}

/* WRONG - Don't create custom icon fonts */
@font-face {
    font-family: 'CustomIcons';
    src: url('custom-icons.woff2');
}
```

### **✅ INSTEAD DO THIS:**

```html
<!-- Use Bootstrap Icons directly -->
<i class="bi bi-person"></i>

<!-- If you need styling, use CSS classes -->
<i class="bi bi-person text-primary fs-4"></i>
```

### **Why This Rule Exists:**

1. **Maintainability**: Manual content CSS is hard to maintain and update
2. **Accessibility**: Bootstrap Icons include proper accessibility attributes
3. **Performance**: Browser optimization works better with standard implementations
4. **Consistency**: Ensures all icons follow the same patterns
5. **Future-proofing**: Easier to update or change icon libraries

## 🎯 Icon Usage Standards

### **Semantic Icon Selection**

Choose icons that clearly represent their function:

```html
<!-- E-commerce specific icons -->
<i class="bi bi-cart"></i>          <!-- Shopping cart -->
<i class="bi bi-bag"></i>           <!-- Shopping bag -->
<i class="bi bi-credit-card"></i>   <!-- Payment -->
<i class="bi bi-truck"></i>         <!-- Shipping -->
<i class="bi bi-heart"></i>         <!-- Favorites/wishlist -->
<i class="bi bi-star"></i>          <!-- Ratings -->

<!-- Navigation icons -->
<i class="bi bi-house"></i>         <!-- Home -->
<i class="bi bi-person"></i>        <!-- Profile/account -->
<i class="bi bi-gear"></i>          <!-- Settings -->
<i class="bi bi-search"></i>        <!-- Search -->
<i class="bi bi-list"></i>          <!-- Menu -->

<!-- Action icons -->
<i class="bi bi-plus"></i>          <!-- Add/create -->
<i class="bi bi-pencil"></i>        <!-- Edit -->
<i class="bi bi-trash"></i>         <!-- Delete -->
<i class="bi bi-eye"></i>           <!-- View -->
<i class="bi bi-download"></i>      <!-- Download -->
```

### **Color and Styling**

Use Bootstrap's utility classes for consistent styling:

```html
<!-- Text color utilities -->
<i class="bi bi-heart text-danger"></i>      <!-- Red heart -->
<i class="bi bi-check text-success"></i>     <!-- Green check -->
<i class="bi bi-exclamation text-warning"></i> <!-- Yellow warning -->

<!-- Custom styling with CSS classes -->
<i class="bi bi-star text-gold"></i>         <!-- Using custom gold color -->
```

### **Accessibility Considerations**

Ensure icons are accessible to all users:

```html
<!-- Add aria-hidden for decorative icons -->
<i class="bi bi-star" aria-hidden="true"></i>

<!-- Add aria-label for functional icons -->
<button>
  <i class="bi bi-trash" aria-label="Delete item"></i>
</button>

<!-- Use sr-only text for screen readers -->
<button>
  <i class="bi bi-cart" aria-hidden="true"></i>
  <span class="sr-only">Add to cart</span>
</button>
```

## 📚 Common Icon Patterns

### **Button Icons**

```html
<!-- Primary action buttons -->
<button class="btn btn-primary">
  <i class="bi bi-cart me-2"></i>
  Add to Cart
</button>

<!-- Icon-only buttons -->
<button class="btn btn-outline-secondary" aria-label="Add to favorites">
  <i class="bi bi-heart"></i>
</button>

<!-- Button groups with icons -->
<div class="btn-group">
  <button class="btn btn-outline-primary">
    <i class="bi bi-eye"></i>
  </button>
  <button class="btn btn-outline-primary">
    <i class="bi bi-pencil"></i>
  </button>
  <button class="btn btn-outline-danger">
    <i class="bi bi-trash"></i>
  </button>
</div>
```

### **Navigation Icons**

```html
<!-- Navbar icons -->
<nav class="navbar">
  <a class="nav-link" href="/">
    <i class="bi bi-house me-1"></i>
    Home
  </a>
  <a class="nav-link" href="/cart">
    <i class="bi bi-cart me-1"></i>
    Cart
    <span class="badge bg-danger">3</span>
  </a>
</nav>

<!-- Sidebar navigation -->
<ul class="nav flex-column">
  <li class="nav-item">
    <a class="nav-link" href="/dashboard">
      <i class="bi bi-speedometer2 me-2"></i>
      Dashboard
    </a>
  </li>
</ul>
```

### **Status and Feedback Icons**

```html
<!-- Success states -->
<div class="alert alert-success">
  <i class="bi bi-check-circle me-2"></i>
  Order completed successfully!
</div>

<!-- Error states -->
<div class="alert alert-danger">
  <i class="bi bi-exclamation-triangle me-2"></i>
  Payment failed. Please try again.
</div>

<!-- Loading states -->
<button class="btn btn-primary" disabled>
  <i class="bi bi-arrow-clockwise spin me-2"></i>
  Processing...
</button>
```

## 🔍 Finding the Right Icon

### **Bootstrap Icons Library**

Visit the official Bootstrap Icons library: https://icons.getbootstrap.com/

### **Search Strategy**

1. **Search by function**: "cart", "user", "settings"
2. **Search by category**: "commerce", "navigation", "communication"
3. **Browse similar icons**: Look at variations and alternatives

### **Icon Naming Convention**

Bootstrap Icons follow predictable naming patterns:

```
bi-{category}-{specific}
bi-{action}-{object}
bi-{object}-{modifier}

Examples:
bi-cart          (shopping cart)
bi-cart-plus     (add to cart)
bi-cart-check    (cart with checkmark)
bi-person        (user icon)
bi-person-plus   (add user)
bi-house         (home)
bi-house-door    (house with door)
```

## 🚨 Migration from Font Awesome

If you encounter Font Awesome icons during development:

### **Common Font Awesome to Bootstrap Icons Mappings**

```html
<!-- Font Awesome → Bootstrap Icons -->
<i class="fa fa-user"></i>          → <i class="bi bi-person"></i>
<i class="fa fa-home"></i>          → <i class="bi bi-house"></i>
<i class="fa fa-shopping-cart"></i> → <i class="bi bi-cart"></i>
<i class="fa fa-heart"></i>         → <i class="bi bi-heart"></i>
<i class="fa fa-search"></i>        → <i class="bi bi-search"></i>
<i class="fa fa-cog"></i>           → <i class="bi bi-gear"></i>
<i class="fa fa-envelope"></i>      → <i class="bi bi-envelope"></i>
<i class="fa fa-phone"></i>         → <i class="bi bi-telephone"></i>
<i class="fa fa-edit"></i>          → <i class="bi bi-pencil"></i>
<i class="fa fa-trash"></i>         → <i class="bi bi-trash"></i>
<i class="fa fa-download"></i>      → <i class="bi bi-download"></i>
<i class="fa fa-upload"></i>        → <i class="bi bi-upload"></i>
<i class="fa fa-star"></i>          → <i class="bi bi-star"></i>
<i class="fa fa-check"></i>         → <i class="bi bi-check"></i>
<i class="fa fa-times"></i>         → <i class="bi bi-x"></i>
<i class="fa fa-arrow-right"></i>   → <i class="bi bi-arrow-right"></i>
<i class="fa fa-arrow-left"></i>    → <i class="bi bi-arrow-left"></i>
<i class="fa fa-plus"></i>          → <i class="bi bi-plus"></i>
<i class="fa fa-minus"></i>         → <i class="bi bi-dash"></i>
```

### **Replacement Process**

1. **Identify** Font Awesome icons in templates
2. **Find equivalent** Bootstrap Icons
3. **Replace** the class names
4. **Test** visual appearance and functionality
5. **Remove** Font Awesome references

## 💡 Best Practices

### **Do's:**
- ✅ Use semantic, meaningful icons
- ✅ Maintain consistent sizing throughout the application
- ✅ Include proper accessibility attributes
- ✅ Test icons with screen readers
- ✅ Use Bootstrap's utility classes for styling
- ✅ Document custom icon usage in code comments

### **Don'ts:**
- ❌ Mix different icon libraries in the same project
- ❌ Use icons without proper accessibility considerations
- ❌ Create custom icon fonts when Bootstrap Icons suffice
- ❌ Use decorative icons without aria-hidden
- ❌ Forget to test icon visibility in different themes
- ❌ Use overly complex icons for simple actions

## 🔧 Development Tools

### **Icon Preview Tool**

Create a simple HTML page to preview icons:

```html
<!DOCTYPE html>
<html>
<head>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" rel="stylesheet">
</head>
<body>
    <h2>Icon Preview</h2>
    <div style="font-size: 2rem;">
        <i class="bi bi-cart"></i>
        <i class="bi bi-person"></i>
        <i class="bi bi-heart"></i>
        <i class="bi bi-search"></i>
    </div>
</body>
</html>
```

### **Icon Checklist for Code Reviews**

- [ ] Uses Bootstrap Icons (`bi bi-*`)
- [ ] No Font Awesome classes (`fa fa-*`)
- [ ] No manual `content:` CSS rules
- [ ] Proper accessibility attributes
- [ ] Semantic icon choice
- [ ] Consistent with design system

## 📞 Support and Questions

If you're unsure about icon choice or implementation:

1. **Check this style guide** first
2. **Browse Bootstrap Icons library** for alternatives
3. **Ask the design team** for guidance
4. **Review existing implementations** in the codebase
5. **Create an issue** for clarification if needed

---

**Remember: Consistency is key to a professional user experience. Always follow these guidelines to maintain our high standards.**
