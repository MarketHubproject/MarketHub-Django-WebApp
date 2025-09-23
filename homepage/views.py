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
    Home page with featured products
    """
    try:
        featured_products = Product.objects.filter(
            status='active', featured=True
        ).select_related('category')[:8]
    except Exception as e:
        # Handle case where database tables might not exist yet
        featured_products = []
    
    try:
        categories = Category.objects.filter(
            is_active=True, parent=None
        ).annotate(product_count=Count('products'))[:6]
    except Exception as e:
        # Handle case where database tables might not exist yet
        categories = []
    
    context = {
        'featured_products': featured_products,
        'categories': categories,
    }
    return render(request, 'homepage/home.html', context)


def product_list(request):
    """
    Product listing with filtering and search
    """
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
    category_slug = request.GET.get('category')
    selected_category = None
    if category_slug:
        selected_category = get_object_or_404(Category, slug=category_slug)
        products = products.filter(category=selected_category)
    
    # Price filtering
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    if min_price:
        products = products.filter(price__gte=min_price)
    if max_price:
        products = products.filter(price__lte=max_price)
    
    # Sorting
    sort_by = request.GET.get('sort', 'name')
    if sort_by == 'price_low':
        products = products.order_by('price')
    elif sort_by == 'price_high':
        products = products.order_by('-price')
    elif sort_by == 'newest':
        products = products.order_by('-created_at')
    elif sort_by == 'featured':
        products = products.order_by('-featured', 'name')
    else:
        products = products.order_by('name')
    
    # Pagination
    paginator = Paginator(products, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get all categories for filter sidebar
    try:
        categories = Category.objects.filter(is_active=True, parent=None)
    except Exception:
        categories = []
    
    context = {
        'page_obj': page_obj,
        'categories': categories,
        'selected_category': selected_category,
        'search_query': search_query,
        'current_sort': sort_by,
        'min_price': min_price,
        'max_price': max_price,
    }
    return render(request, 'homepage/product_list.html', context)


def product_detail(request, slug):
    """
    Product detail page
    """
    product = get_object_or_404(
        Product.objects.select_related('category'),
        slug=slug, status='active'
    )
    
    # Get related products from the same category
    related_products = Product.objects.filter(
        category=product.category, status='active'
    ).exclude(id=product.id)[:4]
    
    context = {
        'product': product,
        'related_products': related_products,
    }
    return render(request, 'homepage/product_detail.html', context)


def category_detail(request, slug):
    """
    Category page showing products in that category
    """
    category = get_object_or_404(Category, slug=slug, is_active=True)
    
    products = Product.objects.filter(
        category=category, status='active'
    ).select_related('category')
    
    # Pagination
    paginator = Paginator(products, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'category': category,
        'page_obj': page_obj,
    }
    return render(request, 'homepage/category_detail.html', context)


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


def setup_admin(request):
    """
    Setup admin user via web endpoint (for free tier)
    """
    from django.contrib.auth.models import User
    from django.core.management import call_command
    
    try:
        # First, run database migrations
        call_command('migrate', verbosity=0)
        
        # Check if admin user exists
        admin_exists = False
        try:
            admin_exists = User.objects.filter(is_superuser=True).exists()
        except Exception:
            # Database might still be setting up
            pass
        
        if admin_exists:
            message = "✅ Admin user already exists!<br>"
        else:
            # Create admin user
            User.objects.create_superuser(
                username='admin',
                email='admin@markethub.com',
                password='markethub123',
                first_name='Admin',
                last_name='User'
            )
            message = "✅ Admin user created: admin/markethub123<br>"
        
        # Skip sample data creation for now and just return success
        return HttpResponse(f"{message}Database migrations completed!<br><br><a href='/admin/'>Go to Admin</a> | <a href='/'>Go to Store</a>")
        
    except Exception as e:
        return HttpResponse(f"Error during setup: {str(e)}")


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
