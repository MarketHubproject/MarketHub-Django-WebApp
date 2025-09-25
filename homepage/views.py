from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from .models import (
    Product, Category, Cart, CartItem, Order, OrderItem, 
    CustomerProfile, Address
)
import json
from decimal import Decimal


def home(request):
    """
    Home page with featured products - professional template version with fallback
    """
    try:
        # Get featured products safely
        featured_products = []
        try:
            featured_products = Product.objects.filter(
                status='active', featured=True
            ).select_related('category')[:8]
            
            # If no featured products, get any active products
            if not featured_products:
                featured_products = Product.objects.filter(
                    status='active'
                ).select_related('category')[:8]
        except Exception as e:
            # Log the error but continue
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching featured products: {str(e)}")
            featured_products = []
        
        # Get categories safely
        categories = []
        try:
            from django.db.models import Count
            categories = Category.objects.filter(
                is_active=True, parent=None
            ).annotate(product_count=Count('products'))[:6]
        except Exception as e:
            # Log the error but continue
            import logging
            logger = logging.getLogger(__name__) 
            logger.error(f"Error fetching categories: {str(e)}")
            try:
                # Fallback without annotation
                categories = Category.objects.filter(is_active=True, parent=None)[:6]
            except Exception:
                categories = []
        
        # Try to render template
        context = {
            'featured_products': featured_products,
            'categories': categories,
            'page_title': 'Welcome to MarketHub',
        }
        
        # Try rendering the professional template
        try:
            return render(request, 'homepage/home.html', context)
        except Exception as template_error:
            # If template fails, fall back to the existing home view fallback
            pass
        
    except Exception as template_error:
        # Template failed, return beautiful HTML fallback
        try:
            # Get product and category counts for display
            from .models import Product, Category
            product_count = Product.objects.filter(status='active').count()
            category_count = Category.objects.filter(is_active=True).count()
        except Exception:
            product_count = 0
            category_count = 0
        
        # Return beautiful fallback HTML
        return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MarketHub - Premium E-commerce Store</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .hero-section {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 0;
        }}
        .feature-card {{
            border: none;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }}
        .feature-card:hover {{
            transform: translateY(-5px);
        }}
        .stats-section {{
            background: #f8f9fa;
            padding: 60px 0;
        }}
        .cta-section {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 80px 0;
        }}
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
                <a class="nav-link" href="/debug/">Debug</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section text-center">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <h1 class="display-3 fw-bold mb-4">
                        <i class="fas fa-rocket me-3"></i>
                        Welcome to MarketHub
                    </h1>
                    <p class="lead mb-5">Your premium e-commerce destination with {product_count} amazing products across {category_count} categories</p>
                    <div class="d-grid gap-2 d-md-block">
                        <a href="/products/" class="btn btn-light btn-lg px-5">
                            <i class="fas fa-shopping-bag me-2"></i>Shop Now
                        </a>
                        <a href="/admin/" class="btn btn-outline-light btn-lg px-5">
                            <i class="fas fa-cog me-2"></i>Manage Store
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section">
        <div class="container">
            <div class="row text-center">
                <div class="col-md-4 mb-4">
                    <div class="feature-card card h-100 p-4">
                        <div class="card-body">
                            <i class="fas fa-box-open fa-3x text-primary mb-3"></i>
                            <h3 class="card-title">{product_count}</h3>
                            <p class="card-text text-muted">Premium Products</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="feature-card card h-100 p-4">
                        <div class="card-body">
                            <i class="fas fa-tags fa-3x text-success mb-3"></i>
                            <h3 class="card-title">{category_count}</h3>
                            <p class="card-text text-muted">Categories</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="feature-card card h-100 p-4">
                        <div class="card-body">
                            <i class="fas fa-shipping-fast fa-3x text-info mb-3"></i>
                            <h3 class="card-title">Fast</h3>
                            <p class="card-text text-muted">Free Shipping</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="py-5">
        <div class="container">
            <h2 class="text-center mb-5">Why Choose MarketHub?</h2>
            <div class="row">
                <div class="col-md-4 text-center mb-4">
                    <i class="fas fa-shield-alt fa-3x text-primary mb-3"></i>
                    <h4>Secure Shopping</h4>
                    <p class="text-muted">Your data and payments are protected with industry-standard security.</p>
                </div>
                <div class="col-md-4 text-center mb-4">
                    <i class="fas fa-headset fa-3x text-primary mb-3"></i>
                    <h4>24/7 Support</h4>
                    <p class="text-muted">Our customer support team is here to help you anytime, anywhere.</p>
                </div>
                <div class="col-md-4 text-center mb-4">
                    <i class="fas fa-undo fa-3x text-primary mb-3"></i>
                    <h4>Easy Returns</h4>
                    <p class="text-muted">Not satisfied? Return any item within 30 days for a full refund.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section text-center">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <h2 class="display-5 fw-bold mb-4">Ready to Start Shopping?</h2>
                    <p class="lead mb-4">Join thousands of happy customers who trust MarketHub for their shopping needs.</p>
                    <a href="/products/" class="btn btn-light btn-lg px-5">
                        <i class="fas fa-arrow-right me-2"></i>Browse Products
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-dark text-light py-4">
        <div class="container text-center">
            <p class="mb-0">&copy; 2024 MarketHub. Built with Django & Bootstrap.</p>
            <p class="small text-muted mt-2">
                <a href="/debug/" class="text-muted">Debug Info</a> | 
                <a href="/admin/" class="text-muted">Admin Panel</a> | 
                <a href="/setup/" class="text-muted">Setup</a>
            </p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
        """)


def product_list(request):
    """
    Product listing with filtering and search - bulletproof version
    """
    # ALWAYS go to fallback first for debugging production issues
    # Remove this try block once we identify the issue
    
    # Get basic product data for fallback
    try:
        products = Product.objects.filter(status='active')[:20]  # Limit to 20 for fallback  
        search_query = request.GET.get('search', '')
    except Exception as db_error:
        products = []
        search_query = ''
        
        # Return error page if database is completely broken
        return HttpResponse(f"""
<!DOCTYPE html>
<html>
<head>
    <title>Database Error - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <h2>Database Error</h2>
        <p>Error: {str(db_error)}</p>
        <a href="/" class="btn btn-primary">Go Home</a>
        <a href="/setup/" class="btn btn-success">Run Setup</a>
    </div>
</body>
</html>
        """)
        
    # Generate product cards HTML
    product_cards = ""
    for product in products:
        try:
            price = f"${product.price}"
            compare_price = f"<span class='text-muted text-decoration-line-through'>${product.compare_at_price}</span> " if hasattr(product, 'compare_at_price') and product.compare_at_price and product.compare_at_price > product.price else ""
            product_cards += f"""
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="fas fa-box fa-3x text-muted"></i>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">{product.name}</h6>
                        <p class="card-text text-muted small flex-grow-1">{product.short_description or product.description[:100] + '...' if len(str(product.description)) > 100 else product.description}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    {compare_price}{price}
                                </div>
                                <a href="/product/{product.slug}/" class="btn btn-primary btn-sm">
                                    <i class="fas fa-eye"></i> View
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            """
        except:
            continue
    
    return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link active" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="fas fa-shopping-bag me-2"></i>Our Products</h2>
                    <span class="badge bg-primary fs-6">{len(products)} Products</span>
                </div>
                
                <!-- Search Bar -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <form method="get">
                            <div class="input-group">
                                <input type="text" class="form-control" name="search" value="{search_query}" placeholder="Search products...">
                                <button class="btn btn-primary" type="submit">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Products Grid -->
                <div class="row">
                    {product_cards if product_cards else '<div class="col-12 text-center py-5"><p class="text-muted">No products found. <a href="/admin/">Add products via Admin Panel</a></p></div>'}
                </div>
                
                <!-- Back to Home -->
                <div class="text-center mt-5">
                    <a href="/" class="btn btn-outline-primary">
                        <i class="fas fa-home me-2"></i>Back to Home
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
    """)


def product_detail(request, slug):
    """
    Product detail page - professional template with fallback
    """
    try:
        product = get_object_or_404(
            Product.objects.select_related('category').prefetch_related('images'),
            slug=slug, status='active'
        )
        
        # Get related products from the same category
        related_products = []
        try:
            if product.category:
                related_products = Product.objects.filter(
                    category=product.category, status='active'
                ).exclude(id=product.id).prefetch_related('images')[:4]
        except Exception:
            related_products = []
        
        # Try professional template first
        context = {
            'product': product,
            'related_products': related_products,
            'page_title': product.name,
        }
        
        try:
            return render(request, 'homepage/product_detail.html', context)
        except Exception as template_error:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Template error in product_detail: {str(template_error)}")
            # Fall through to existing fallback
        
    except Exception as e:
        # Template failed or product not found, return beautiful HTML fallback
        try:
            product = Product.objects.get(slug=slug, status='active')
        except:
            # Product not found
            return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Product Not Found - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
            </div>
        </div>
    </nav>
    
    <div class="container mt-5 text-center">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <i class="fas fa-search fa-5x text-muted mb-4"></i>
                <h2>Product Not Found</h2>
                <p class="text-muted">The product you're looking for doesn't exist or has been removed.</p>
                <a href="/products/" class="btn btn-primary">Browse All Products</a>
                <a href="/" class="btn btn-outline-primary ms-2">Go Home</a>
            </div>
        </div>
    </div>
</body>
</html>
            """)
        
        # Generate related products HTML
        try:
            related_products = Product.objects.filter(
                category=product.category, status='active'
            ).exclude(id=product.id)[:4] if hasattr(product, 'category') and product.category else []
        except:
            related_products = []
            
        related_html = ""
        for rel_product in related_products:
            try:
                related_html += f"""
                <div class="col-md-3 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title">{rel_product.name}</h6>
                            <p class="text-primary">${rel_product.price}</p>
                            <a href="/product/{rel_product.slug}/" class="btn btn-sm btn-outline-primary">View</a>
                        </div>
                    </div>
                </div>
                """
            except:
                continue
                
        # Product found, show details
        category_name = product.category.name if hasattr(product, 'category') and product.category else 'Uncategorized'
        compare_price_html = f"<span class='text-muted text-decoration-line-through fs-5'>${product.compare_at_price}</span><br>" if hasattr(product, 'compare_at_price') and product.compare_at_price and product.compare_at_price > product.price else ""
        
        return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{product.name} - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <!-- Breadcrumb -->
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/">Home</a></li>
                <li class="breadcrumb-item"><a href="/products/">Products</a></li>
                <li class="breadcrumb-item">{category_name}</li>
                <li class="breadcrumb-item active">{product.name}</li>
            </ol>
        </nav>
        
        <div class="row">
            <!-- Product Image -->
            <div class="col-md-6 mb-4">
                <div class="bg-light d-flex align-items-center justify-content-center" style="height: 400px; border-radius: 8px;">
                    <i class="fas fa-image fa-5x text-muted"></i>
                </div>
            </div>
            
            <!-- Product Info -->
            <div class="col-md-6 mb-4">
                <div class="h-100">
                    <h1 class="h2 mb-3">{product.name}</h1>
                    <p class="text-muted mb-3">{category_name}</p>
                    
                    <div class="mb-4">
                        {compare_price_html}
                        <span class="h3 text-primary">${product.price}</span>
                    </div>
                    
                    <div class="mb-4">
                        <p class="text-muted">{product.short_description or (str(product.description)[:200] + '...' if len(str(product.description)) > 200 else str(product.description))}</p>
                    </div>
                    
                    <div class="mb-4">
                        <div class="row">
                            <div class="col-sm-6 mb-2">
                                <strong>SKU:</strong> {getattr(product, 'sku', 'N/A')}
                            </div>
                            <div class="col-sm-6 mb-2">
                                <strong>Stock:</strong> {getattr(product, 'stock_quantity', 'N/A')} units
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-block">
                        <button class="btn btn-primary btn-lg" onclick="alert('Add to cart functionality coming soon!')">
                            <i class="fas fa-cart-plus me-2"></i>Add to Cart
                        </button>
                        <button class="btn btn-outline-secondary btn-lg">
                            <i class="fas fa-heart me-2"></i>Wishlist
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Product Description -->
        <div class="row mt-5">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Product Description</h4>
                    </div>
                    <div class="card-body">
                        <p>{product.description}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Related Products -->
        {f'<div class="row mt-5"><div class="col-12"><h4 class="mb-4">Related Products</h4><div class="row">{related_html}</div></div></div>' if related_html else ''}
        
        <!-- Back Button -->
        <div class="text-center mt-5">
            <a href="/products/" class="btn btn-outline-primary">
                <i class="fas fa-arrow-left me-2"></i>Back to Products
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
        """)

def category_detail(request, slug):
    """
    Category page showing products in that category - bulletproof version
    """
    try:
        category = get_object_or_404(Category, slug=slug, is_active=True)
        products = Product.objects.filter(
            category=category, status='active'
        ).select_related('category')
        
        # Pagination
        paginator = Paginator(products, 12)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)
        
        # Try template first
        context = {
            'category': category,
            'page_obj': page_obj,
        }
        return render(request, 'homepage/category_detail.html', context)
        
    except Exception as e:
        # Template failed or category not found, return HTML fallback
        try:
            category = Category.objects.get(slug=slug, is_active=True)
            products = Product.objects.filter(category=category, status='active')[:20]
        except:
            # Category not found - redirect to products page
            return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Category Not Found - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script>setTimeout(() => window.location.href='/products/', 3000);</script>
</head>
<body>
    <div class="container mt-5 text-center">
        <i class="fas fa-exclamation-triangle fa-5x text-warning mb-4"></i>
        <h2>Category Not Found</h2>
        <p>Redirecting to all products...</p>
        <a href="/products/" class="btn btn-primary">Go to Products</a>
    </div>
</body>
</html>
            """)
            
        # Generate product cards
        product_cards = ""
        for product in products:
            try:
                product_cards += f"""
                <div class="col-md-4 col-lg-3 mb-4">
                    <div class="card h-100 shadow-sm">
                        <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                            <i class="fas fa-box fa-2x text-muted"></i>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h6 class="card-title">{product.name}</h6>
                            <p class="card-text text-muted small flex-grow-1">{(product.short_description or str(product.description))[:100]}...</p>
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="text-primary fw-bold">${product.price}</span>
                                    <a href="/product/{product.slug}/" class="btn btn-primary btn-sm">View</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                """
            except:
                continue
                
        return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{category.name} - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <!-- Breadcrumb -->
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/">Home</a></li>
                <li class="breadcrumb-item"><a href="/products/">Products</a></li>
                <li class="breadcrumb-item active">{category.name}</li>
            </ol>
        </nav>
        
        <!-- Category Header -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="h2"><i class="fas fa-tags me-2"></i>{category.name}</h1>
                        <p class="text-muted">{category.description or 'Discover great products in this category'}</p>
                    </div>
                    <span class="badge bg-primary fs-6">{len(products)} Products</span>
                </div>
            </div>
        </div>
        
        <!-- Products Grid -->
        <div class="row">
            {product_cards if product_cards else '<div class="col-12 text-center py-5"><p class="text-muted">No products in this category yet.</p></div>'}
        </div>
        
        <!-- Back Navigation -->
        <div class="text-center mt-5">
            <a href="/products/" class="btn btn-outline-primary me-2">
                <i class="fas fa-arrow-left me-1"></i>All Products
            </a>
            <a href="/" class="btn btn-primary">
                <i class="fas fa-home me-1"></i>Home
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
        """)



@login_required
def cart_detail(request):
    """
    Shopping cart page
    """
    cart, created = Cart.objects.get_or_create(user=request.user)
    cart_items = cart.items.select_related('product').all()
    
    context = {
        'cart': cart,
        'cart_items': cart_items,
    }
    return render(request, 'homepage/cart_detail.html', context)


@require_POST
@login_required
def add_to_cart(request):
    """
    Add product to cart (AJAX endpoint)
    """
    try:
        product_id = request.POST.get('product_id')
        quantity = int(request.POST.get('quantity', 1))
        
        if quantity < 1:
            return JsonResponse({'success': False, 'error': 'Invalid quantity'})
        
        product = get_object_or_404(Product, id=product_id, status='active')
        
        # Check stock
        if product.track_inventory and product.stock_quantity < quantity:
            return JsonResponse({
                'success': False, 
                'error': 'Not enough stock available'
            })
        
        cart, created = Cart.objects.get_or_create(user=request.user)
        cart_item, item_created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not item_created:
            # Update existing item quantity
            cart_item.quantity += quantity
            cart_item.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Added {product.name} to cart',
            'cart_total_items': cart.total_items,
            'cart_total_price': str(cart.total_price)
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@require_POST
@login_required
def update_cart_item(request):
    """
    Update cart item quantity (AJAX endpoint)
    """
    try:
        item_id = request.POST.get('item_id')
        quantity = int(request.POST.get('quantity'))
        
        cart_item = get_object_or_404(
            CartItem, 
            id=item_id, 
            cart__user=request.user
        )
        
        if quantity <= 0:
            cart_item.delete()
            action = 'removed'
        else:
            # Check stock
            if cart_item.product.track_inventory and cart_item.product.stock_quantity < quantity:
                return JsonResponse({
                    'success': False,
                    'error': 'Not enough stock available'
                })
            
            cart_item.quantity = quantity
            cart_item.save()
            action = 'updated'
        
        cart = cart_item.cart
        return JsonResponse({
            'success': True,
            'action': action,
            'item_total': str(cart_item.total_price) if quantity > 0 else '0.00',
            'cart_total_items': cart.total_items,
            'cart_total_price': str(cart.total_price)
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@require_POST
@login_required
def remove_from_cart(request):
    """
    Remove item from cart (AJAX endpoint)
    """
    try:
        item_id = request.POST.get('item_id')
        cart_item = get_object_or_404(
            CartItem,
            id=item_id,
            cart__user=request.user
        )
        
        cart = cart_item.cart
        cart_item.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Item removed from cart',
            'cart_total_items': cart.total_items,
            'cart_total_price': str(cart.total_price)
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
def checkout(request):
    """
    Checkout page
    """
    cart = get_object_or_404(Cart, user=request.user)
    cart_items = cart.items.select_related('product').all()
    
    if not cart_items:
        messages.warning(request, 'Your cart is empty.')
        return redirect('homepage:cart_detail')
    
    # Get user's addresses
    addresses = request.user.addresses.all()
    
    context = {
        'cart': cart,
        'cart_items': cart_items,
        'addresses': addresses,
    }
    return render(request, 'homepage/checkout.html', context)


def register(request):
    """
    User registration
    """
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}!')
            return redirect('login')
    else:
        form = UserCreationForm()
    
    return render(request, 'registration/register.html', {'form': form})


def health_check(request):
    """
    Health check endpoint for deployment
    """
    return HttpResponse("OK")


def debug_info(request):
    """
    Debug information endpoint
    """
    import sys
    import django
    from django.db import connection
    import traceback
    
    debug_data = []
    
    try:
        # Django version
        debug_data.append(f"🐍 Python version: {sys.version}")
        debug_data.append(f"🎯 Django version: {django.get_version()}")
        
        # Database connection test
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                debug_data.append("✅ Database connection: OK")
        except Exception as e:
            debug_data.append(f"❌ Database connection: {str(e)}")
        
        # Check tables
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [row[0] for row in cursor.fetchall()]
                debug_data.append(f"📋 Database tables ({len(tables)}): {', '.join(tables[:10])}{'...' if len(tables) > 10 else ''}")
        except Exception as e:
            debug_data.append(f"❌ Error checking tables: {str(e)}")
        
        # Check models
        try:
            from django.contrib.auth.models import User
            user_count = User.objects.count()
            admin_count = User.objects.filter(is_superuser=True).count()
            debug_data.append(f"👥 Users: {user_count} total, {admin_count} admins")
        except Exception as e:
            debug_data.append(f"❌ Error checking users: {str(e)}")
        
        try:
            from .models import Category, Product
            cat_count = Category.objects.count()
            prod_count = Product.objects.count()
            debug_data.append(f"📦 Content: {cat_count} categories, {prod_count} products")
        except Exception as e:
            debug_data.append(f"❌ Error checking content: {str(e)}")
        
        # Environment info
        import os
        debug_data.append(f"🌍 Environment: {'Production' if os.environ.get('DATABASE_URL') else 'Development'}")
        
    except Exception as e:
        debug_data.append(f"❌ Debug error: {str(e)}")
        debug_data.append(f"Stack trace: {traceback.format_exc()}")
    
    debug_output = "<br>".join(debug_data)
    
    return HttpResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>MarketHub Debug Info</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
        <div class="container mt-4">
            <h2>🔍 MarketHub Debug Information</h2>
            <div class="alert alert-info">
                {debug_output}
            </div>
            <div class="mt-4">
                <a href='/' class="btn btn-primary">Back to Home</a>
                <a href='/setup/' class="btn btn-success">Run Setup</a>
                <a href='/admin/' class="btn btn-secondary">Admin Panel</a>
            </div>
        </div>
    </body>
    </html>
    """)


def products_hybrid(request):
    """
    Hybrid products page - tries database first, falls back to samples if DB fails
    """
    # Try to get real products from database
    products = []
    db_error = None
    db_success = False
    
    try:
        from .models import Product
        products = list(Product.objects.filter(status='active')[:20])
        db_success = True
        product_source = "database"
    except Exception as e:
        db_error = str(e)
        product_source = "samples"
        # Create sample products as fallback
        class SampleProduct:
            def __init__(self, name, price, description, slug):
                self.name = name
                self.price = price
                self.description = description
                self.slug = slug
                self.short_description = description
        
        products = [
            SampleProduct("Premium Laptop", "899.99", "High-performance laptop for professionals", "premium-laptop"),
            SampleProduct("Wireless Headphones", "199.99", "Noise-canceling wireless headphones", "wireless-headphones"),
            SampleProduct("Smart Watch", "299.99", "Feature-rich smartwatch with health tracking", "smart-watch"),
            SampleProduct("Gaming Mouse", "79.99", "High-precision gaming mouse with RGB lighting", "gaming-mouse"),
            SampleProduct("4K Webcam", "149.99", "Ultra HD webcam for video calls and streaming", "4k-webcam"),
            SampleProduct("Mechanical Keyboard", "129.99", "Cherry MX switches mechanical keyboard", "mechanical-keyboard"),
        ]
    
    search_query = request.GET.get('search', '')
    
    # Generate product cards HTML
    product_cards = ""
    for product in products:
        try:
            price = f"${product.price}"
            description = getattr(product, 'short_description', '') or str(getattr(product, 'description', ''))[:100]
            if len(description) > 100:
                description = description[:100] + "..."
                
            # Handle database products vs sample products
            if db_success and hasattr(product, 'slug'):
                product_link = f"/product/{product.slug}/"
            else:
                product_link = "#"  # No link for sample products
            
            product_cards += f"""
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="fas fa-box fa-3x text-muted"></i>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">{product.name}</h6>
                        <p class="card-text text-muted small flex-grow-1">{description}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-primary fw-bold">{price}</span>
                                {'<a href="' + product_link + '" class="btn btn-primary btn-sm"><i class="fas fa-eye"></i> View</a>' if product_link != '#' else '<button class="btn btn-secondary btn-sm" disabled>Sample</button>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            """
        except Exception:
            continue
    
    # Status message
    if db_success:
        status_message = f'<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>Showing {len(products)} products from database</div>'
    else:
        status_message = f'<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Database unavailable - showing sample products<br><small>Error: {db_error}</small></div>'
    
    return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link active" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="fas fa-shopping-bag me-2"></i>Our Products</h2>
                    <span class="badge bg-primary fs-6">{len(products)} Products</span>
                </div>
                
                {status_message}
                
                <!-- Search Bar -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <form method="get">
                            <div class="input-group">
                                <input type="text" class="form-control" name="search" value="{search_query}" placeholder="Search products...">
                                <button class="btn btn-primary" type="submit">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Products Grid -->
                <div class="row">
                    {product_cards if product_cards else '<div class="col-12 text-center py-5"><p class="text-muted">No products available.</p></div>'}
                </div>
                
                <!-- Navigation -->
                <div class="text-center mt-5">
                    <a href="/" class="btn btn-outline-primary me-2">
                        <i class="fas fa-home me-2"></i>Back to Home
                    </a>
                    <a href="/admin/" class="btn btn-success me-2">
                        <i class="fas fa-cog me-2"></i>Admin Panel
                    </a>
                    <a href="/simple-debug/" class="btn btn-info">
                        <i class="fas fa-bug me-2"></i>Debug Info
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
    """)


def product_list_professional(request):
    """
    Professional product listing view with filtering, search, and pagination - with error handling
    """
    try:
        # Import here to avoid circular imports
        from django.core.paginator import Paginator
        from django.db.models import Q, Count
        
        # Base queryset with safe field access
        products = Product.objects.filter(status='active').select_related('category')
        
        # Search functionality
        search_query = request.GET.get('search', '')
        if search_query:
            products = products.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(short_description__icontains=search_query)
            )
        
        # Category filtering
        category_id = request.GET.get('category')
        category = None
        if category_id:
            try:
                category = Category.objects.get(id=category_id, is_active=True)
                products = products.filter(category=category)
            except (Category.DoesNotExist, ValueError):
                pass
        
        # Price filtering
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        if min_price:
            try:
                products = products.filter(price__gte=float(min_price))
            except (ValueError, TypeError):
                pass
        if max_price:
            try:
                products = products.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass
        
        # Sorting - safer approach
        sort_by = request.GET.get('sort', '')
        valid_sorts = ['name', '-name', 'price', '-price', '-created_at', 'created_at']
        if sort_by in valid_sorts:
            try:
                products = products.order_by(sort_by)
            except Exception:
                products = products.order_by('-id', 'name')  # Fallback to safe ordering
        else:
            products = products.order_by('-id', 'name')  # Use id instead of created_at as fallback
        
        # Get categories for sidebar - with error handling
        categories = []
        try:
            categories = Category.objects.filter(
                is_active=True, parent=None
            ).annotate(
                product_count=Count('products', filter=Q(products__status='active'))
            ).filter(product_count__gt=0)[:10]
        except Exception:
            # If annotation fails, just get basic categories
            categories = Category.objects.filter(is_active=True, parent=None)[:10]
        
        # Pagination
        try:
            paginator = Paginator(products, 12)  # Show 12 products per page
            page_number = request.GET.get('page', 1)
            page_obj = paginator.get_page(page_number)
        except Exception:
            # If pagination fails, just use the first 12 products
            page_obj = products[:12]
        
        context = {
            'products': page_obj,
            'page_obj': page_obj if hasattr(page_obj, 'has_other_pages') else None,
            'categories': categories,
            'category': category,
            'search_query': search_query,
            'page_title': f'{category.name} Products' if category else 'All Products',
        }
        
        return render(request, 'homepage/product_list.html', context)
        
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in product_list_professional: {str(e)}")
        
        # Fallback to the existing bulletproof version
        return product_list(request)


def products_no_db(request):
    """
    Products page that doesn't touch database at all - for isolating DB issues
    """
    return HttpResponse(f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - MarketHub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-store me-2"></i>MarketHub
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link active" href="/products/">Products</a>
                <a class="nav-link" href="/admin/">Admin</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="row">
            <div class="col-12">
                <div class="alert alert-info">
                    <h4><i class="fas fa-info-circle me-2"></i>Products Page (No Database)</h4>
                    <p>This is a test version of the products page that doesn't access the database.</p>
                    <p>If you see this page, the routing and basic functionality work!</p>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <i class="fas fa-box fa-3x text-primary mb-3"></i>
                                <h5>Sample Product 1</h5>
                                <p class="text-muted">This is a sample product for testing.</p>
                                <span class="h5 text-primary">$29.99</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <i class="fas fa-gift fa-3x text-success mb-3"></i>
                                <h5>Sample Product 2</h5>
                                <p class="text-muted">Another sample product for testing.</p>
                                <span class="h5 text-success">$39.99</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <i class="fas fa-star fa-3x text-warning mb-3"></i>
                                <h5>Sample Product 3</h5>
                                <p class="text-muted">A third sample product for testing.</p>
                                <span class="h5 text-warning">$49.99</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4 text-center">
                    <a href="/" class="btn btn-primary me-2">Back to Home</a>
                    <a href="/admin/" class="btn btn-success me-2">Admin Panel</a>
                    <a href="/products-full/" class="btn btn-warning">Try Full Products Page</a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
    """)


def test_basic(request):
    """
    Absolute minimal test endpoint - just returns basic HTML
    """
    return HttpResponse("""
    <html>
    <head><title>Basic Test - MarketHub</title></head>
    <body>
        <h1>Basic Test Works!</h1>
        <p>If you see this, the basic routing is working.</p>
        <p><a href="/">Back to Home</a></p>
    </body>
    </html>
    """)


def diagnose_500_error(request):
    """
    Diagnostic view to help identify 500 error causes
    """
    import traceback
    import sys
    from django.template.loader import get_template
    from django.db import connection
    
    diagnostics = []
    
    try:
        diagnostics.append("🔍 STARTING DIAGNOSTICS")
        
        # Test 1: Basic Django functionality
        diagnostics.append(f"✅ Django version: {sys.version}")
        
        # Test 2: Database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                diagnostics.append("✅ Database connection: OK")
        except Exception as e:
            diagnostics.append(f"❌ Database connection: {str(e)}")
            
        # Test 3: Models import
        try:
            from .models import Product, Category
            diagnostics.append("✅ Models import: OK")
        except Exception as e:
            diagnostics.append(f"❌ Models import: {str(e)}")
            
        # Test 4: Template loading
        try:
            template = get_template('base.html')
            diagnostics.append("✅ Base template: OK")
        except Exception as e:
            diagnostics.append(f"❌ Base template: {str(e)}")
            
        try:
            template = get_template('homepage/home.html')
            diagnostics.append("✅ Home template: OK")
        except Exception as e:
            diagnostics.append(f"❌ Home template: {str(e)}")
            
        try:
            template = get_template('homepage/product_list.html')
            diagnostics.append("✅ Product list template: OK")
        except Exception as e:
            diagnostics.append(f"❌ Product list template: {str(e)}")
            
        # Test 5: Template filters
        try:
            from .templatetags.homepage_filters import lookup, subtract, currency
            diagnostics.append("✅ Template filters: OK")
        except Exception as e:
            diagnostics.append(f"❌ Template filters: {str(e)}")
            
        # Test 6: Database queries
        try:
            product_count = Product.objects.count()
            category_count = Category.objects.count()
            diagnostics.append(f"✅ Database queries: {product_count} products, {category_count} categories")
        except Exception as e:
            diagnostics.append(f"❌ Database queries: {str(e)}")
            
        # Test 7: Professional view test
        try:
            from django.test import RequestFactory
            factory = RequestFactory()
            test_request = factory.get('/products/')
            response = product_list_professional(test_request)
            diagnostics.append(f"✅ Professional view test: Status {getattr(response, 'status_code', 'Unknown')}")
        except Exception as e:
            diagnostics.append(f"❌ Professional view test: {str(e)}")
            diagnostics.append(f"   Full traceback: {traceback.format_exc()}")
            
    except Exception as main_error:
        diagnostics.append(f"❌ CRITICAL ERROR: {str(main_error)}")
        diagnostics.append(f"   Full traceback: {traceback.format_exc()}")
    
    diagnostics_html = "<br>".join(diagnostics)
    
    return HttpResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>500 Error Diagnostics - MarketHub</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            .diagnostic {{ font-family: monospace; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container mt-4">
            <h2>🔧 500 Error Diagnostics</h2>
            <div class="alert alert-info">
                <div class="diagnostic">
                    {diagnostics_html}
                </div>
            </div>
            <div class="mt-4">
                <a href='/products-hybrid/' class="btn btn-warning">Try Hybrid Products</a>
                <a href='/products-no-db/' class="btn btn-info">Try No-DB Products</a>
                <a href='/test-basic/' class="btn btn-secondary">Basic Test</a>
                <a href='/' class="btn btn-primary">Home</a>
            </div>
        </div>
    </body>
    </html>
    """)


def simple_products(request):
    """
    Ultra-simple product list that bypasses all template logic
    """
    try:
        from .models import Product
        products = Product.objects.filter(status='active')[:10]
        
        html = "<h1>Simple Products List</h1><ul>"
        for product in products:
            html += f"<li>{product.name} - ${product.price}</li>"
        html += "</ul>"
        html += '<p><a href="/">Back to Home</a></p>'
        
        return HttpResponse(html)
    except Exception as e:
        return HttpResponse(f"Error: {str(e)}")


def simple_debug(request):
    """
    Simple debug endpoint that returns plain text - for debugging production issues
    """
    import sys
    import django
    import traceback
    from django.db import connection
    
    debug_lines = []
    
    try:
        debug_lines.append(f"Python: {sys.version}")
        debug_lines.append(f"Django: {django.get_version()}")
        debug_lines.append(f"Request path: {request.path}")
        debug_lines.append(f"Request method: {request.method}")
        
        # Test database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM django_migrations")
                result = cursor.fetchone()
                debug_lines.append(f"Database OK - {result[0]} migrations")
        except Exception as e:
            debug_lines.append(f"Database ERROR: {str(e)}")
        
        # Test models
        try:
            from .models import Product, Category
            product_count = Product.objects.count()
            category_count = Category.objects.count()
            debug_lines.append(f"Models OK - {product_count} products, {category_count} categories")
        except Exception as e:
            debug_lines.append(f"Models ERROR: {str(e)}")
            
        # Test template loading
        try:
            from django.template.loader import get_template
            template = get_template('homepage/product_list.html')
            debug_lines.append("Template loading OK")
        except Exception as e:
            debug_lines.append(f"Template ERROR: {str(e)}")
            
    except Exception as e:
        debug_lines.append(f"CRITICAL ERROR: {str(e)}")
        debug_lines.append(f"Traceback: {traceback.format_exc()}")
    
    response_text = "\n".join(debug_lines)
    return HttpResponse(response_text, content_type="text/plain")


def fix_database(request):
    """
    Direct database schema fix - specifically for the slug column issue
    """
    from django.db import connection
    import traceback
    
    results = []
    
    try:
        results.append("🔧 Starting database schema fix...")
        
        with connection.cursor() as cursor:
            # Check if the slug column exists
            cursor.execute("PRAGMA table_info(homepage_product);")
            columns = [row[1] for row in cursor.fetchall()]
            results.append(f"📋 Current columns: {', '.join(columns)}")
            
            if 'slug' not in columns:
                results.append("⚠️ Slug column missing - adding it now...")
                
                # Add the slug column
                cursor.execute("ALTER TABLE homepage_product ADD COLUMN slug VARCHAR(255) DEFAULT '';")
                results.append("✅ Added slug column")
                
                # Update existing products with slugs
                cursor.execute("SELECT id, name FROM homepage_product;")
                products = cursor.fetchall()
                
                for product_id, product_name in products:
                    # Create a simple slug from the product name
                    import re
                    slug = re.sub(r'[^a-zA-Z0-9]+', '-', product_name.lower()).strip('-')
                    cursor.execute("UPDATE homepage_product SET slug = ? WHERE id = ?;", [slug, product_id])
                
                results.append(f"✅ Updated slugs for {len(products)} products")
            else:
                results.append("✅ Slug column already exists")
            
            # Test the fix
            cursor.execute("SELECT COUNT(*) FROM homepage_product WHERE slug IS NOT NULL;")
            count = cursor.fetchone()[0]
            results.append(f"✅ Database fix complete - {count} products have slugs")
            
    except Exception as e:
        results.append(f"❌ Error: {str(e)}")
        results.append(f"Stack trace: {traceback.format_exc()}")
    
    results_html = "<br>".join(results)
    
    return HttpResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Database Fix - MarketHub</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <meta http-equiv="refresh" content="10;url=/products/">
    </head>
    <body>
        <div class="container mt-4">
            <h2>🔧 Database Schema Fix</h2>
            <div class="alert alert-info">
                {results_html}
            </div>
            <div class="alert alert-success mt-4">
                <p><strong>Automatic redirect:</strong> You'll be redirected to the products page in 10 seconds to test the fix.</p>
            </div>
            <div class="mt-4">
                <a href="/products/" class="btn btn-primary">Test Products Page</a>
                <a href="/" class="btn btn-secondary">Go Home</a>
                <a href="/admin/" class="btn btn-success">Admin Panel</a>
            </div>
        </div>
    </body>
    </html>
    """)


def setup_admin(request):
    """
    Setup admin user via web endpoint (for free tier)
    """
    from django.contrib.auth.models import User
    from django.core.management import call_command
    import traceback
    
    debug_info = []
    
    try:
        debug_info.append("🔧 Starting setup process...")
        
        # First, run database migrations with force
        debug_info.append("📊 Running database migrations...")
        try:
            call_command('migrate', verbosity=0, interactive=False)
            debug_info.append("✅ Database migrations completed successfully")
        except Exception as migrate_error:
            debug_info.append(f"⚠️ Migration issue: {str(migrate_error)}")
            # Try to run migrations with fake-initial flag
            try:
                call_command('migrate', '--fake-initial', verbosity=0, interactive=False)
                debug_info.append("✅ Database migrations completed with fake-initial")
            except Exception as fake_error:
                debug_info.append(f"❌ Migration failed: {str(fake_error)}")
                # Try to create missing columns manually
                try:
                    from django.db import connection
                    with connection.cursor() as cursor:
                        # Add slug column if missing
                        cursor.execute("""
                        ALTER TABLE homepage_product 
                        ADD COLUMN slug VARCHAR(255) DEFAULT '';
                        """)
                        debug_info.append("✅ Added missing slug column")
                except Exception as manual_error:
                    debug_info.append(f"⚠️ Manual column addition failed: {str(manual_error)}")
        
        # Check database connection
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            debug_info.append("✅ Database connection successful")
        
        # Check if admin user exists
        admin_exists = False
        admin_count = 0
        try:
            admin_count = User.objects.filter(is_superuser=True).count()
            admin_exists = admin_count > 0
            debug_info.append(f"👤 Found {admin_count} admin user(s)")
        except Exception as e:
            debug_info.append(f"⚠️ Error checking admin users: {str(e)}")
        
        if admin_exists:
            message = "✅ Admin user already exists!<br>"
        else:
            # Create admin user
            debug_info.append("👤 Creating admin user...")
            User.objects.create_superuser(
                username='admin',
                email='admin@markethub.com',
                password='markethub123',
                first_name='Admin',
                last_name='User'
            )
            message = "✅ Admin user created: admin/markethub123<br>"
            debug_info.append("✅ Admin user created successfully")
        
        # Check models and fix schema if needed
        try:
            from .models import Category, Product
            cat_count = Category.objects.count()
            prod_count = Product.objects.count()
            debug_info.append(f"📦 Found {cat_count} categories and {prod_count} products")
        except Exception as model_error:
            debug_info.append(f"⚠️ Error checking models: {str(model_error)}")
            
            # Try to fix the slug column issue
            if "no such column: homepage_product.slug" in str(model_error):
                debug_info.append("🔧 Detected missing slug column - attempting fix...")
                try:
                    with connection.cursor() as cursor:
                        cursor.execute("ALTER TABLE homepage_product ADD COLUMN slug VARCHAR(255) DEFAULT '';")
                        debug_info.append("✅ Added missing slug column")
                        
                        # Update existing products with slugs
                        cursor.execute("SELECT id, name FROM homepage_product;")
                        products = cursor.fetchall()
                        
                        import re
                        for product_id, product_name in products:
                            slug = re.sub(r'[^a-zA-Z0-9]+', '-', product_name.lower()).strip('-')
                            cursor.execute("UPDATE homepage_product SET slug = ? WHERE id = ?;", [slug, product_id])
                        
                        debug_info.append(f"✅ Updated slugs for {len(products)} existing products")
                        
                        # Test the fix
                        from .models import Product
                        test_count = Product.objects.count()
                        debug_info.append(f"✅ Schema fix successful - can now access {test_count} products")
                        
                except Exception as fix_error:
                    debug_info.append(f"❌ Schema fix failed: {str(fix_error)}")
        
        debug_output = "<br>".join(debug_info)
        
        return HttpResponse(f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Setup Complete</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h2>🎉 Setup Complete!</h2>
                {message}
                <div class="alert alert-info mt-4">
                    <h5>Debug Information:</h5>
                    {debug_output}
                </div>
                <div class="mt-4">
                    <a href='/admin/' class="btn btn-primary">Go to Admin Panel</a>
                    <a href='/' class="btn btn-secondary">Go to Store</a>
                    <a href='/debug/' class="btn btn-info">View Debug Info</a>
                </div>
            </div>
        </body>
        </html>
        """)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        return HttpResponse(f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Setup Error</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h2>❌ Setup Error</h2>
                <div class="alert alert-danger">
                    <h5>Error:</h5>
                    <p>{str(e)}</p>
                    <details>
                        <summary>Full Error Details</summary>
                        <pre>{error_trace}</pre>
                    </details>
                </div>
                <div class="alert alert-info">
                    <h5>Debug Information:</h5>
                    {'<br>'.join(debug_info)}
                </div>
            </div>
        </body>
        </html>
        """)


# AJAX endpoint to get cart count for navbar
@login_required
def get_cart_count(request):
    """
    Get cart item count (AJAX endpoint)
    """
    try:
        cart = Cart.objects.get(user=request.user)
        return JsonResponse({
            'success': True,
            'count': cart.total_items,
            'total': str(cart.total_price)
        })
    except Cart.DoesNotExist:
        return JsonResponse({
            'success': True,
            'count': 0,
            'total': '0.00'
        })
