from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Count, Avg, Sum
from django.db import models
from django.core.paginator import Paginator
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.utils import timezone
import logging

# Configure logger
logger = logging.getLogger(__name__)


def process_card_payment(form, payment, user):
    """
    Process card payment - placeholder function for payment processing
    In production, this would integrate with a real payment processor
    """
    try:
        # Mock payment processing
        # In real implementation, integrate with Stripe, PayPal, etc.
        logger.info(f"Processing payment {payment.id} for user {user.username}")
        
        # Simulate payment success/failure
        import random
        success = random.choice([True, True, True, False])  # 75% success rate for demo
        
        if success:
            logger.info(f"Payment {payment.id} processed successfully")
        else:
            logger.warning(f"Payment {payment.id} failed")
            
        return success
    except Exception as e:
        logger.error(f"Error processing payment {payment.id}: {e}")
        return False

from .models import Product, Cart, CartItem, HeroSlide, Category, Promotion, Order, OrderItem, Favorite, Review, ProductImage, Payment, PaymentMethod, ProductDraft
from .forms import ProductForm, CheckoutForm, PaymentForm, SavedPaymentMethodForm, ProductDraftForm, ProductSearchForm
import requests
import json


def home(request):
    # Get search and filter parameters
    search_query = request.GET.get('search', '').strip()
    category_filter = request.GET.get('category', '').strip()
    min_price = request.GET.get('min_price', '').strip()
    max_price = request.GET.get('max_price', '').strip()
    sort_by = request.GET.get('sort', '-created_at')

    # Start with products in Cape Town area only
    products = Product.objects.all()  # All products are now Cape Town-based

    # Apply search filter
    if search_query:
        products = products.filter(
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    # Apply category filter
    if category_filter:
        products = products.filter(category=category_filter)

    # Apply price range filters
    if min_price:
        try:
            min_price_value = float(min_price)
            products = products.filter(price__gte=min_price_value)
        except ValueError:
            pass

    if max_price:
        try:
            max_price_value = float(max_price)
            products = products.filter(price__lte=max_price_value)
        except ValueError:
            pass

    # Apply sorting
    valid_sort_options = ['name', '-name', 'price', '-price', 'created_at', '-created_at']
    if sort_by in valid_sort_options:
        products = products.order_by(sort_by)
    else:
        products = products.order_by('-created_at')  # Default sorting

    # Pagination
    paginator = Paginator(products, 12)  # Show 12 products per page
    page_number = request.GET.get('page')
    products_page = paginator.get_page(page_number)

    # Get category choices for the filter dropdown
    category_choices = Product.CATEGORY_CHOICES

    # Get active hero slides
    hero_slides = HeroSlide.get_active_slides()

    # Get featured categories
    featured_categories = Category.get_featured_categories()

    # Get active promotions
    promotions = Promotion.get_active_promotions()

    context = {
        'products': products_page,
        'category_choices': category_choices,
        'total_products': products.count(),
        'hero_slides': hero_slides,
        'featured_categories': featured_categories,
        'promotions': promotions,
    }

    return render(request, 'homepage/index.html', context)


def signup(request):
    if request.method == 'POST':
        from .forms import ExtendedUserCreationForm
        form = ExtendedUserCreationForm(request.POST, request.FILES)
        
        # Add request context for logging
        form._request_ip = request.META.get('REMOTE_ADDR')
        form._request_user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        if form.is_valid():
            user = form.save()
            messages.success(
                request, 
                f'Account created successfully for {user.username}! '
                'Your ID/Passport has been uploaded for verification. '
                'You will receive an email notification once your account is approved.'
            )
            return redirect('login')
        else:
            messages.error(
                request,
                'Please correct the errors below and ensure all required fields are filled.'
            )
    else:
        from .forms import ExtendedUserCreationForm
        form = ExtendedUserCreationForm()
    
    return render(request, 'homepage/signup.html', {'form': form})


def login_view(request):
    # Ensure session exists
    if not request.session.session_key:
        request.session.save()
    
    # Force fresh CSRF token
    from django.middleware.csrf import get_token
    csrf_token = get_token(request)
    print(f"[LOGIN DEBUG] Generated CSRF token: {csrf_token}")
        
    if request.method == 'POST':
        # Debug CSRF token
        print(f"[LOGIN DEBUG] POST data: {request.POST}")
        print(f"[LOGIN DEBUG] CSRF token from POST: {request.POST.get('csrfmiddlewaretoken')}")
        print(f"[LOGIN DEBUG] CSRF token from COOKIES: {request.COOKIES.get('csrftoken')}")
        print(f"[LOGIN DEBUG] Session key: {request.session.session_key}")
        print(f"[LOGIN DEBUG] All cookies: {request.COOKIES}")
        
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            auth_login(request, form.get_user())
            next_url = request.GET.get('next', 'home')
            return redirect(next_url)
        else:
            print(f"[LOGIN DEBUG] Form errors: {form.errors}")
    else:
        form = AuthenticationForm()
    return render(request, 'homepage/login.html', {'form': form})


def logout_view(request):
    """Custom logout view that handles both GET and POST requests"""
    if request.user.is_authenticated:
        auth_logout(request)
        messages.success(request, 'You have been logged out successfully.')
    return redirect('home')


def product_list(request):
    query = request.GET.get('q')
    category = request.GET.get('category')
    location_filter = request.GET.get('location', '').strip()
    products = Product.objects.all().order_by('-created_at')  # All products are Cape Town-based

    if query:
        products = products.filter(name__icontains=query)
    if category:
        products = products.filter(category=category)
    if location_filter:
        products = products.filter(location=location_filter)

    paginator = Paginator(products, 6)  # Show 6 products per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    categories = Product.CATEGORY_CHOICES

    return render(request, 'homepage/product_list.html', {
        'products': page_obj.object_list,
        'page_obj': page_obj,
        'categories': categories
    })


@login_required
def create_product(request):
    print("Create product view triggered")  # Debug line
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            product.seller = request.user
            product.save()
            messages.success(request, f'Product "{product.name}" has been created successfully!')
            return redirect('product_list')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = ProductForm()
    return render(request, 'homepage/create_product.html', {'form': form})


@login_required
def edit_product(request, pk):
    product = get_object_or_404(Product, pk=pk)
    form = ProductForm(request.POST or None, instance=product)
    if form.is_valid():
        form.save()
        return redirect('product_detail', pk=product.pk)
    return render(request, 'homepage/edit_product.html', {'form': form})


def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    return render(request, 'homepage/product_detail.html', {'product': product})


@login_required
def delete_product(request, pk):
    product = get_object_or_404(Product, pk=pk)
    if request.method == 'POST':
        product.delete()
        return redirect('product_list')
    return render(request, 'homepage/delete_product.html', {'product': product})


# Cart functionality
@login_required
def add_to_cart(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    cart, created = Cart.objects.get_or_create(user=request.user)

    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={'quantity': 1}
    )

    if not created:
        cart_item.quantity += 1
        cart_item.save()

    # Handle AJAX requests
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': f'{product.name} added to cart!',
            'cart_count': cart.items.count(),
            'cart_total': cart.get_total_price()
        })
    
    messages.success(request, f'{product.name} added to cart!')
    return redirect('product_list')


@login_required
def view_cart(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    return render(request, 'homepage/cart.html', {'cart': cart})


@login_required
def remove_from_cart(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
    product_name = cart_item.product.name
    cart_item.delete()
    messages.success(request, f'{product_name} removed from cart!')
    return redirect('view_cart')


@login_required
def update_cart_item(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)

    if request.method == 'POST':
        quantity = int(request.POST.get('quantity', 1))
        if quantity > 0:
            cart_item.quantity = quantity
            cart_item.save()
            messages.success(request, 'Cart updated!')
        else:
            cart_item.delete()
            messages.success(request, 'Item removed from cart!')

    return redirect('view_cart')


def category_view(request, slug):
    """View products in a specific category"""
    category = get_object_or_404(Category, slug=slug)

    # Get search and filter parameters
    search_query = request.GET.get('search', '').strip()
    min_price = request.GET.get('min_price', '').strip()
    max_price = request.GET.get('max_price', '').strip()
    sort_by = request.GET.get('sort', '-created_at')

    # Start with products in this category
    # For now, we'll filter by the category name since we haven't migrated the Product model yet
    products = Product.objects.filter(category=category.slug)

    # Apply search filter
    if search_query:
        products = products.filter(
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    # Apply price range filters
    if min_price:
        try:
            min_price_value = float(min_price)
            products = products.filter(price__gte=min_price_value)
        except ValueError:
            pass

    if max_price:
        try:
            max_price_value = float(max_price)
            products = products.filter(price__lte=max_price_value)
        except ValueError:
            pass

    # Apply sorting
    valid_sort_options = ['name', '-name', 'price', '-price', 'created_at', '-created_at']
    if sort_by in valid_sort_options:
        products = products.order_by(sort_by)
    else:
        products = products.order_by('-created_at')

    # Pagination
    paginator = Paginator(products, 12)
    page_number = request.GET.get('page')
    products_page = paginator.get_page(page_number)

    context = {
        'category': category,
        'products': products_page,
        'total_products': products.count(),
    }

    return render(request, 'homepage/category_detail.html', context)


def newsletter_signup(request):
    """Handle newsletter signup form submissions"""
    if request.method == 'POST':
        email = request.POST.get('email')

        if not email:
            messages.error(request, 'Please enter a valid email address.')
            return redirect(request.META.get('HTTP_REFERER', 'home'))

        # Basic email validation
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            messages.error(request, 'Please enter a valid email address.')
            return redirect(request.META.get('HTTP_REFERER', 'home'))

        # Here you can integrate with Mailchimp API
        # For now, we'll just show a success message
        try:
            # TODO: Add actual Mailchimp integration
            # mailchimp_result = subscribe_to_mailchimp(email)

            # For demo purposes, we'll simulate success
            messages.success(
                request,
                f'🎉 Thanks for subscribing! We\'ve added {email} to our newsletter. '
                'You\'ll receive exclusive deals and updates soon!'
            )

        except Exception as e:
            messages.error(
                request,
                'Sorry, there was an issue with your subscription. Please try again later.'
            )

        return redirect(request.META.get('HTTP_REFERER', 'home'))

    # If not POST, redirect to home
    return redirect('home')


def subscribe_to_mailchimp(email, first_name='', last_name=''):
    """
    Subscribe an email to Mailchimp list

    To use this function, you'll need to:
    1. Get your Mailchimp API key from your account
    2. Get your List ID (Audience ID) from Mailchimp
    3. Add these to your Django settings or environment variables

    Example usage after configuration:
    MAILCHIMP_API_KEY = 'your-api-key-here'
    MAILCHIMP_DATA_CENTER = 'us1'  # Extract from your API key
    MAILCHIMP_EMAIL_LIST_ID = 'your-list-id-here'
    """

    # Uncomment and configure these when you have Mailchimp credentials
    # from django.conf import settings
    #
    # api_key = getattr(settings, 'MAILCHIMP_API_KEY', '')
    # data_center = getattr(settings, 'MAILCHIMP_DATA_CENTER', 'us1')
    # list_id = getattr(settings, 'MAILCHIMP_EMAIL_LIST_ID', '')
    #
    # if not all([api_key, data_center, list_id]):
    #     raise ValueError('Mailchimp configuration missing')
    #
    # url = f'https://{data_center}.api.mailchimp.com/3.0/lists/{list_id}/members'
    #
    # data = {
    #     'email_address': email,
    #     'status': 'subscribed',
    #     'merge_fields': {
    #         'FNAME': first_name,
    #         'LNAME': last_name,
    #     }
    # }
    #
    # headers = {
    #     'Authorization': f'Bearer {api_key}',
    #     'Content-Type': 'application/json',
    # }
    #
    # response = requests.post(url, headers=headers, data=json.dumps(data))
    #
    # if response.status_code == 200:
    #     return {'success': True, 'message': 'Successfully subscribed'}
    # else:
    #     error_data = response.json()
    #     return {'success': False, 'message': error_data.get('detail', 'Subscription failed')}

    # For now, return a mock success response
    return {'success': True, 'message': 'Successfully subscribed (demo mode)'}


# Checkout functionality
@login_required
def checkout(request):
    """Display checkout form and process order"""
    # Get or create cart for user
    try:
        cart = Cart.objects.get(user=request.user)
        if not cart.items.exists():
            messages.error(request, 'Your cart is empty. Please add items before checkout.')
            return redirect('view_cart')
    except Cart.DoesNotExist:
        messages.error(request, 'Your cart is empty. Please add items before checkout.')
        return redirect('view_cart')

    if request.method == 'POST':
        form = CheckoutForm(request.POST, user=request.user)
        if form.is_valid():
            # Create the order
            order = form.save(commit=False)
            order.user = request.user
            order.subtotal = cart.get_total_price()
            order.shipping_cost = 0  # Free shipping for now
            order.tax_amount = 0    # No tax for now
            order.total_amount = cart.get_total_price()
            order.save()

            # Create order items from cart items
            for cart_item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    price=cart_item.product.price
                )

            # Clear the cart
            cart.items.all().delete()

            # Redirect to payment page instead of order confirmation
            messages.success(request, f'Order {order.order_number} created! Please complete payment.')
            return redirect('checkout_payment', order_id=order.id)
    else:
        form = CheckoutForm(user=request.user)

    context = {
        'form': form,
        'cart': cart,
    }
    return render(request, 'homepage/checkout.html', context)


@login_required
def order_confirmation(request, order_id):
    """Display order confirmation page"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'homepage/order_confirmation.html', {'order': order})


@login_required
def order_history(request):
    """Display user's order history"""
    orders = Order.objects.filter(user=request.user).order_by('-created_at')

    # Pagination
    paginator = Paginator(orders, 10)  # Show 10 orders per page
    page_number = request.GET.get('page')
    orders_page = paginator.get_page(page_number)

    return render(request, 'homepage/order_history.html', {'orders': orders_page})


@login_required
def order_detail(request, order_id):
    """Display detailed view of a specific order"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'homepage/order_detail.html', {'order': order})


# Products functionality from products app
def products_product_list(request):
    """Enhanced product listing with filtering and sorting"""
    query = request.GET.get('q')
    category = request.GET.get('category')
    location = request.GET.get('location')
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    sort_by = request.GET.get('sort_by', 'newest')

    # Filter only available products by default
    products = Product.objects.filter(status='available')

    # Apply search filters
    if query:
        products = products.filter(Q(name__icontains=query) | Q(description__icontains=query))
    if category and category != 'all':
        products = products.filter(category=category)
    if location and location != 'all':
        products = products.filter(location=location)

    # Price range filtering
    if min_price:
        try:
            products = products.filter(price__gte=float(min_price))
        except ValueError:
            pass
    if max_price:
        try:
            products = products.filter(price__lte=float(max_price))
        except ValueError:
            pass

    # Sorting
    if sort_by == 'price_low':
        products = products.order_by('price')
    elif sort_by == 'price_high':
        products = products.order_by('-price')
    elif sort_by == 'rating':
        products = products.annotate(avg_rating=Avg('reviews__rating')).order_by('-avg_rating')
    else:  # newest
        products = products.order_by('-created_at')

    # Pagination
    paginator = Paginator(products, 12)
    page_number = request.GET.get('page')
    products = paginator.get_page(page_number)

    categories = Product.CATEGORY_CHOICES
    location_choices = Product.LOCATION_CHOICES

    # Get user's favorites if authenticated
    user_favorites = []
    if request.user.is_authenticated:
        user_favorites = Favorite.objects.filter(user=request.user).values_list('product_id', flat=True)

    return render(request, 'products/product_list.html', {
        'products': products,
        'categories': categories,
        'location_choices': location_choices,
        'user_favorites': user_favorites,
        'current_query': query,
        'current_category': category,
        'current_location': location,
        'current_min_price': min_price,
        'current_max_price': max_price,
        'current_sort': sort_by,
    })


def products_product_detail(request, pk):
    """Enhanced product detail with reviews and favorites"""
    product = get_object_or_404(Product, pk=pk)
    is_favorited = False
    user_review = None

    if request.user.is_authenticated:
        is_favorited = Favorite.objects.filter(user=request.user, product=product).exists()
        user_review = Review.objects.filter(user=request.user, product=product).first()

    # Get reviews for this product
    reviews = Review.objects.filter(product=product).select_related('user').order_by('-created_at')

    return render(request, 'products/product_detail.html', {
        'product': product,
        'is_favorited': is_favorited,
        'reviews': reviews,
        'user_review': user_review,
    })


@login_required
def products_create_product(request):
    """Create new product with seller assignment"""
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            product.seller = request.user
            product.save()
            return redirect('products_product_list')
    else:
        form = ProductForm()
    return render(request, 'homepage/create_product.html', {'form': form})


@login_required
@require_POST
def toggle_favorite(request, product_id):
    """Toggle favorite status for a product"""
    product = get_object_or_404(Product, id=product_id)
    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        product=product
    )

    if not created:
        favorite.delete()
        is_favorite = False
    else:
        is_favorite = True

    return JsonResponse({
        'success': True,
        'is_favorited': is_favorite,
        'is_favorite': is_favorite,  # Keep for backward compatibility
        'favorites_count': product.homepage_favorited_by.count()
    })


@login_required
def favorites_list(request):
    """Display user's favorite products"""
    favorites = Favorite.objects.filter(user=request.user).select_related('product')
    return render(request, 'products/favorites_list.html', {'favorites': favorites})


@login_required
def add_review(request, product_id):
    """Add a review for a product"""
    product = get_object_or_404(Product, id=product_id)

    # Check if user is trying to review their own product
    if product.seller == request.user:
        messages.error(request, "You cannot review your own product.")
        return redirect('products_product_detail', pk=product_id)

    # Check if user already reviewed this product
    existing_review = Review.objects.filter(user=request.user, product=product).first()
    if existing_review:
        messages.info(request, "You have already reviewed this product. You can update your review.")
        return redirect('update_review', product_id=product_id)

    if request.method == 'POST':
        rating = request.POST.get('rating')
        comment = request.POST.get('comment')

        if rating:
            Review.objects.create(
                product=product,
                user=request.user,
                rating=int(rating),
                comment=comment
            )
            messages.success(request, "Review added successfully!")
        else:
            messages.error(request, "Please provide a rating.")

    return redirect('products_product_detail', pk=product_id)


@login_required
def update_review(request, product_id):
    """Update an existing review"""
    product = get_object_or_404(Product, id=product_id)
    review = get_object_or_404(Review, user=request.user, product=product)

    if request.method == 'POST':
        rating = request.POST.get('rating')
        comment = request.POST.get('comment')

        if rating:
            review.rating = int(rating)
            review.comment = comment
            review.save()
            messages.success(request, "Review updated successfully!")
        else:
            messages.error(request, "Please provide a rating.")

    return redirect('products_product_detail', pk=product_id)


@login_required
def seller_dashboard(request):
    """Dashboard for sellers to manage their products"""
    user_products = Product.objects.filter(seller=request.user).annotate(
        avg_rating=Avg('reviews__rating'),
        review_count=Count('reviews')
    ).order_by('-created_at')

    # Statistics
    total_products = user_products.count()
    available_products = user_products.filter(status='available').count()
    sold_products = user_products.filter(status='sold').count()
    total_reviews = Review.objects.filter(seller=request.user).count()
    avg_seller_rating = Review.objects.filter(seller=request.user).aggregate(
        avg_rating=Avg('rating')
    )['avg_rating'] or 0

    context = {
        'products': user_products,
        'total_products': total_products,
        'available_products': available_products,
        'sold_products': sold_products,
        'total_reviews': total_reviews,
        'avg_seller_rating': round(avg_seller_rating, 1) if avg_seller_rating else 0,
    }

    return render(request, 'products/seller_dashboard.html', context)


@login_required
def update_product_status(request, product_id):
    """Update product status (available, sold, etc.)"""
    product = get_object_or_404(Product, id=product_id, seller=request.user)

    if request.method == 'POST':
        status = request.POST.get('status')
        if status in [choice[0] for choice in Product.STATUS_CHOICES]:
            product.status = status
            product.save()
            messages.success(request, f"Product status updated to {dict(Product.STATUS_CHOICES)[status]}.")
        else:
            messages.error(request, "Invalid status.")

    return redirect('seller_dashboard')


# Advanced Search & Analytics Functions
@login_required
def advanced_search(request):
    """Advanced search with multiple filters and saved searches"""
    from django.db.models import Min, Max
    from .models import SavedSearch
    
    # Get price range for filters
    price_range = Product.objects.aggregate(
        min_price=Min('price'),
        max_price=Max('price')
    )
    
    # Get all available filters
    categories = Product.CATEGORY_CHOICES
    locations = Product.LOCATION_CHOICES
    conditions = Product.CONDITION_CHOICES
    
    # Get user's saved searches
    saved_searches = SavedSearch.objects.filter(user=request.user, is_active=True) if request.user.is_authenticated else []
    
    # Process search
    products = Product.objects.filter(status='available')
    
    # Apply filters from request
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '')
    location = request.GET.get('location', '')
    condition = request.GET.get('condition', '')
    min_price = request.GET.get('min_price', '')
    max_price = request.GET.get('max_price', '')
    sort_by = request.GET.get('sort', 'newest')
    
    if query:
        products = products.filter(
            Q(name__icontains=query) | 
            Q(description__icontains=query) |
            Q(seller__username__icontains=query)
        )
    
    if category and category != 'all':
        products = products.filter(category=category)
    
    if location and location != 'all':
        products = products.filter(location=location)
        
    if condition and condition != 'all':
        products = products.filter(condition=condition)
    
    if min_price:
        try:
            products = products.filter(price__gte=float(min_price))
        except ValueError:
            pass
    
    if max_price:
        try:
            products = products.filter(price__lte=float(max_price))
        except ValueError:
            pass
    
    # Advanced sorting options
    if sort_by == 'price_low':
        products = products.order_by('price')
    elif sort_by == 'price_high':
        products = products.order_by('-price')
    elif sort_by == 'rating':
        products = products.annotate(avg_rating=Avg('reviews__rating')).order_by('-avg_rating')
    elif sort_by == 'views':
        products = products.order_by('-views_count')
    elif sort_by == 'alphabetical':
        products = products.order_by('name')
    else:  # newest
        products = products.order_by('-created_at')
    
    # Track search history
    if request.user.is_authenticated and query:
        from .models import SearchHistory
        SearchHistory.objects.create(
            user=request.user,
            query=query,
            results_count=products.count(),
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
    
    # Pagination
    paginator = Paginator(products, 15)
    page_number = request.GET.get('page')
    products_page = paginator.get_page(page_number)
    
    # Get user favorites
    user_favorites = []
    if request.user.is_authenticated:
        user_favorites = Favorite.objects.filter(user=request.user).values_list('product_id', flat=True)
    
    context = {
        'products': products_page,
        'categories': categories,
        'locations': locations,
        'conditions': conditions,
        'price_range': price_range,
        'saved_searches': saved_searches,
        'user_favorites': user_favorites,
        'current_query': query,
        'current_category': category,
        'current_location': location,
        'current_condition': condition,
        'current_min_price': min_price,
        'current_max_price': max_price,
        'current_sort': sort_by,
        'total_results': products.count() if not page_number or page_number == '1' else None,
    }
    
    return render(request, 'homepage/advanced_search.html', context)


@login_required
def save_search(request):
    """Save current search parameters for future alerts"""
    if request.method == 'POST':
        from .models import SavedSearch
        
        name = request.POST.get('name', '').strip()
        query = request.POST.get('query', '').strip()
        category = request.POST.get('category', '')
        min_price = request.POST.get('min_price', '')
        max_price = request.POST.get('max_price', '')
        location = request.POST.get('location', '')
        email_alerts = request.POST.get('email_alerts') == 'on'
        
        if not name:
            messages.error(request, 'Please provide a name for your saved search.')
            return redirect('advanced_search')
        
        try:
            saved_search = SavedSearch.objects.create(
                user=request.user,
                name=name,
                query=query,
                category=category or '',
                min_price=float(min_price) if min_price else None,
                max_price=float(max_price) if max_price else None,
                location=location or '',
                email_alerts=email_alerts
            )
            messages.success(request, f'Search "{name}" saved successfully!')
        except Exception as e:
            messages.error(request, 'Failed to save search. Please try again.')
    
    return redirect('advanced_search')


@login_required
def delete_saved_search(request, search_id):
    """Delete a saved search"""
    from .models import SavedSearch
    
    saved_search = get_object_or_404(SavedSearch, id=search_id, user=request.user)
    search_name = saved_search.name
    saved_search.delete()
    
    messages.success(request, f'Saved search "{search_name}" deleted successfully.')
    return redirect('advanced_search')


# Product Analytics & Insights
@login_required
def product_analytics(request, product_id):
    """Analytics dashboard for individual products"""
    from django.db.models import Count
    from datetime import datetime, timedelta
    from .models import ProductView, Notification
    
    product = get_object_or_404(Product, id=product_id, seller=request.user)
    
    # Get date range (last 30 days by default)
    days = int(request.GET.get('days', 30))
    start_date = datetime.now() - timedelta(days=days)
    
    # Views analytics
    views_data = ProductView.objects.filter(
        product=product,
        viewed_at__gte=start_date
    )
    
    total_views = views_data.count()
    unique_views = views_data.values('ip_address').distinct().count()
    
    # Daily views breakdown
    daily_views = {}
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).date()
        count = views_data.filter(viewed_at__date=date).count()
        daily_views[date.strftime('%Y-%m-%d')] = count
    
    # Geographic data (based on IP - simplified)
    location_views = views_data.values('ip_address').annotate(
        count=Count('ip_address')
    ).order_by('-count')[:10]
    
    # User engagement
    favorites_count = product.homepage_favorited_by.count()
    reviews_count = product.reviews.count()
    avg_rating = product.get_average_rating()
    
    # Competition analysis
    similar_products = Product.objects.filter(
        category=product.category,
        status='available'
    ).exclude(id=product.id).annotate(
        avg_rating=Avg('reviews__rating')
    ).order_by('-views_count')[:5]
    
    context = {
        'product': product,
        'total_views': total_views,
        'unique_views': unique_views,
        'daily_views': daily_views,
        'location_views': location_views,
        'favorites_count': favorites_count,
        'reviews_count': reviews_count,
        'avg_rating': avg_rating,
        'similar_products': similar_products,
        'days_range': days,
    }
    
    return render(request, 'homepage/product_analytics.html', context)


@login_required
def seller_analytics_dashboard(request):
    """Comprehensive analytics dashboard for sellers"""
    from django.db.models import Sum, Count
    from datetime import datetime, timedelta
    from .models import ProductView, Notification
    
    # Get seller's products
    user_products = Product.objects.filter(seller=request.user)
    
    # Overall statistics
    total_products = user_products.count()
    available_products = user_products.filter(status='available').count()
    sold_products = user_products.filter(status='sold').count()
    total_views = user_products.aggregate(total=Sum('views_count'))['total'] or 0
    
    # Revenue analytics (from orders)
    from decimal import Decimal
    total_revenue = Decimal('0')
    orders = OrderItem.objects.filter(
        product__seller=request.user,
        order__status='delivered'
    )
    total_revenue = orders.aggregate(
        total=Sum('price')
    )['total'] or Decimal('0')
    
    # Monthly performance
    monthly_data = {}
    for i in range(12):
        month_start = datetime.now().replace(day=1) - timedelta(days=30*i)
        month_orders = orders.filter(
            order__created_at__year=month_start.year,
            order__created_at__month=month_start.month
        )
        monthly_revenue = month_orders.aggregate(
            total=Sum('price')
        )['total'] or Decimal('0')
        
        monthly_data[month_start.strftime('%Y-%m')] = {
            'revenue': float(monthly_revenue),
            'orders': month_orders.count()
        }
    
    # Top performing products
    top_products = user_products.annotate(
        total_orders=Count('orderitem'),
        total_revenue=Sum('orderitem__price')
    ).order_by('-total_revenue')[:5]
    
    # Recent notifications
    notifications = Notification.objects.filter(
        user=request.user
    ).order_by('-created_at')[:10]
    
    context = {
        'total_products': total_products,
        'available_products': available_products,
        'sold_products': sold_products,
        'total_views': total_views,
        'total_revenue': total_revenue,
        'monthly_data': monthly_data,
        'top_products': top_products,
        'notifications': notifications,
    }
    
    return render(request, 'homepage/seller_analytics.html', context)


# Messaging System
@login_required
def send_message(request, product_id):
    """Send message to product seller"""
    from .models import Notification
    
    product = get_object_or_404(Product, id=product_id)
    
    if request.user == product.seller:
        messages.error(request, "You cannot message yourself about your own product.")
        return redirect('product_detail', pk=product_id)
    
    if request.method == 'POST':
        message_content = request.POST.get('message', '').strip()
        
        if not message_content:
            messages.error(request, "Please enter a message.")
            return redirect('product_detail', pk=product_id)
        
        # Create notification for seller
        Notification.objects.create(
            user=product.seller,
            notification_type='message',
            title=f'New message about {product.name}',
            message=f'From {request.user.username}: {message_content}',
            product=product
        )
        
        messages.success(request, "Your message has been sent to the seller!")
        return redirect('product_detail', pk=product_id)
    
    return render(request, 'homepage/send_message.html', {'product': product})


@login_required
def notifications_list(request):
    """Display user's notifications"""
    from .models import Notification
    
    notifications = Notification.objects.filter(
        user=request.user
    ).order_by('-created_at')
    
    # Mark as read if requested
    if request.GET.get('mark_read'):
        notification_id = request.GET.get('mark_read')
        try:
            notification = notifications.get(id=notification_id)
            notification.is_read = True
            notification.save()
            messages.success(request, 'Notification marked as read.')
        except Notification.DoesNotExist:
            pass
        return redirect('notifications_list')
    
    # Pagination
    paginator = Paginator(notifications, 20)
    page_number = request.GET.get('page')
    notifications_page = paginator.get_page(page_number)
    
    # Count unread
    unread_count = notifications.filter(is_read=False).count()
    
    context = {
        'notifications': notifications_page,
        'unread_count': unread_count,
    }
    
    return render(request, 'homepage/notifications.html', context)


@login_required
def mark_all_notifications_read(request):
    """Mark all notifications as read"""
    from .models import Notification
    
    if request.method == 'POST':
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        messages.success(request, f'Marked {count} notifications as read.')
    
    return redirect('notifications_list')


# Wishlist and Recommendations
@login_required
def get_recommendations(request):
    """Get personalized product recommendations"""
    from django.db.models import Count
    from .models import SearchHistory
    
    # Get user's favorite categories
    user_favorites = Favorite.objects.filter(user=request.user)
    favorite_categories = user_favorites.values('product__category').annotate(
        count=Count('product__category')
    ).order_by('-count')[:3]
    
    # Get user's search history
    search_terms = SearchHistory.objects.filter(
        user=request.user
    ).order_by('-created_at')[:10]
    
    # Recommend products based on favorites and searches
    recommended_products = Product.objects.filter(
        status='available'
    ).exclude(
        id__in=user_favorites.values_list('product_id', flat=True)
    )
    
    # Filter by favorite categories
    if favorite_categories:
        category_list = [cat['product__category'] for cat in favorite_categories]
        recommended_products = recommended_products.filter(
            category__in=category_list
        )
    
    # Add products with high ratings
    recommended_products = recommended_products.annotate(
        avg_rating=Avg('reviews__rating'),
        review_count=Count('reviews')
    ).filter(
        avg_rating__gte=4.0,
        review_count__gte=2
    ).order_by('-avg_rating', '-views_count')[:12]
    
    context = {
        'recommended_products': recommended_products,
        'favorite_categories': [cat['product__category'] for cat in favorite_categories],
    }
    
    return render(request, 'homepage/recommendations.html', context)


# Payment Processing Views
@login_required
def checkout_payment(request, order_id):
    """Process payment for an order"""
    from decimal import Decimal
    from django.utils import timezone
    
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    # Check if order is already paid
    if order.payment_status == 'paid':
        messages.info(request, 'This order has already been paid.')
        return redirect('order_confirmation', order_id=order.id)
    
    if request.method == 'POST':
        form = PaymentForm(request.POST, user=request.user)
        if form.is_valid():
            payment_method = form.cleaned_data['payment_method']
            
            # Create payment record
            payment = Payment.objects.create(
                order=order,
                payment_method=payment_method,
                amount=order.total_amount,
                currency='ZAR'
            )
            
            # Process different payment methods
            if payment_method == 'card':
                # Process card payment
                success = process_card_payment(form, payment, request.user)
                if success:
                    payment.status = 'completed'
                    payment.processed_at = timezone.now()
                    payment.save()
                    
                    # Update order payment status
                    order.payment_status = 'paid'
                    order.save()
                    
                    messages.success(request, 'Payment processed successfully!')
                    return redirect('order_confirmation', order_id=order.id)
                else:
                    payment.status = 'failed'
                    payment.save()
                    messages.error(request, 'Payment failed. Please try again.')
            
            elif payment_method in ['eft', 'cash', 'paypal']:
                # For demo purposes, mark as pending
                payment.status = 'pending'
                payment.save()
                
                order.payment_status = 'pending'
                order.save()
                
                messages.info(request, f'{dict(Payment.PAYMENT_METHOD_CHOICES)[payment_method]} payment is being processed.')
                return redirect('order_confirmation', order_id=order.id)
    else:
        form = PaymentForm(user=request.user)
    
    context = {
        'order': order,
        'form': form,
    }
    return render(request, 'homepage/checkout_payment.html', context)


def create_stripe_payment_intent(request, order_id):
    """Create Stripe PaymentIntent for an order"""
    from .stripe_service import StripeService
    from django.http import JsonResponse
    
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    try:
        # Get or create Stripe customer
        customer = StripeService.get_or_create_customer(request.user)
        customer_id = customer.id if customer else None
        
        # Create PaymentIntent
        intent = StripeService.create_payment_intent(order, customer_id)
        
        if intent:
            # Create or update payment record
            payment, created = Payment.objects.get_or_create(
                order=order,
                defaults={
                    'payment_method': 'card',
                    'amount': order.total_amount,
                    'currency': 'ZAR',
                    'status': 'pending'
                }
            )
            
            payment.stripe_payment_intent_id = intent.id
            if customer_id:
                payment.stripe_customer_id = customer_id
            payment.save()
            
            return JsonResponse({
                'success': True,
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Failed to create payment intent'
            })
            
    except Exception as e:
        logger.error(f"Error creating PaymentIntent: {e}")
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while processing your request'
        })


def confirm_stripe_payment(request):
    """Confirm Stripe payment and update order status"""
    from .stripe_service import StripeService
    from django.http import JsonResponse
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            payment_intent_id = data.get('payment_intent_id')
            
            if not payment_intent_id:
                return JsonResponse({'success': False, 'error': 'Missing payment intent ID'})
            
            # Retrieve payment intent from Stripe
            intent = StripeService.retrieve_payment_intent(payment_intent_id)
            
            if not intent:
                return JsonResponse({'success': False, 'error': 'Invalid payment intent'})
            
            # Find associated payment
            try:
                payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
                
                if intent.status == 'succeeded':
                    payment.status = 'completed'
                    payment.processed_at = timezone.now()
                    payment.transaction_id = payment_intent_id
                    payment.gateway_response = dict(intent)
                    
                    # Extract card details if available
                    if intent.charges and intent.charges.data:
                        charge = intent.charges.data[0]
                        if charge.payment_method_details and charge.payment_method_details.card:
                            card = charge.payment_method_details.card
                            payment.card_last_four = card.last4
                            payment.card_brand = card.brand
                    
                    payment.save()
                    
                    # Update order
                    order = payment.order
                    order.payment_status = 'paid'
                    order.status = 'processing'
                    order.save()
                    
                    return JsonResponse({
                        'success': True,
                        'redirect_url': f'/order-confirmation/{order.id}/'
                    })
                else:
                    payment.status = 'failed'
                    payment.gateway_response = dict(intent)
                    payment.save()
                    
                    return JsonResponse({
                        'success': False,
                        'error': 'Payment was not successful'
                    })
                    
            except Payment.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Payment record not found'})
                
        except Exception as e:
            logger.error(f"Error confirming payment: {e}")
            return JsonResponse({'success': False, 'error': 'An error occurred'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    from .stripe_service import StripeWebhookHandler
    from django.http import HttpResponse
    import logging
    
    logger = logging.getLogger(__name__)
    
    if request.method != 'POST':
        return HttpResponse(status=405)
    
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    if not sig_header:
        logger.error('Missing Stripe signature header')
        return HttpResponse(status=400)
    
    # Construct and verify the webhook event
    event = StripeWebhookHandler.construct_event(payload, sig_header)
    
    if not event:
        return HttpResponse(status=400)
    
    # Handle the event
    try:
        handled = StripeWebhookHandler.handle_event(event)
        if handled:
            logger.info(f"Successfully handled webhook event: {event['type']}")
            return HttpResponse(status=200)
        else:
            logger.warning(f"Unhandled webhook event: {event['type']}")
            return HttpResponse(status=200)  # Return 200 even for unhandled events
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return HttpResponse(status=500)


@login_required
def payment_methods(request):
    """Manage saved payment methods"""
    user_payment_methods = PaymentMethod.objects.filter(user=request.user, is_active=True)
    
    context = {
        'payment_methods': user_payment_methods,
    }
    return render(request, 'homepage/payment_methods.html', context)


@login_required
@require_POST
def delete_payment_method(request, method_id):
    """Delete a saved payment method"""
    payment_method = get_object_or_404(
        PaymentMethod, 
        id=method_id, 
        user=request.user
    )
    
    payment_method.is_active = False
    payment_method.save()
    
    messages.success(request, 'Payment method removed successfully.')
    return redirect('payment_methods')


@login_required
@require_POST
def set_default_payment_method(request, method_id):
    """Set a payment method as default"""
    payment_method = get_object_or_404(
        PaymentMethod, 
        id=method_id, 
        user=request.user
    )
    
    # Remove default from other methods
    PaymentMethod.objects.filter(user=request.user, is_default=True).update(is_default=False)
    
    # Set this as default
    payment_method.is_default = True
    payment_method.save()
    
    messages.success(request, 'Default payment method updated.')
    return redirect('payment_methods')


@login_required
def user_profile(request):
    """Display user profile page"""
    # Get user's statistics
    user_orders = Order.objects.filter(user=request.user)
    user_products = Product.objects.filter(seller=request.user)
    user_reviews = Review.objects.filter(user=request.user)
    user_favorites = Favorite.objects.filter(user=request.user)
    
    # Calculate some stats
    total_orders = user_orders.count()
    total_spent = user_orders.filter(payment_status='paid').aggregate(
        total=models.Sum('total_amount')
    )['total'] or 0
    
    total_products_sold = user_products.filter(status='sold').count()
    total_earnings = user_orders.filter(
        items__product__seller=request.user,
        payment_status='paid'
    ).aggregate(
        total=models.Sum('items__price')
    )['total'] or 0
    
    context = {
        'user': request.user,
        'total_orders': total_orders,
        'total_spent': total_spent,
        'total_products_sold': total_products_sold,
        'total_earnings': total_earnings,
        'total_reviews': user_reviews.count(),
        'total_favorites': user_favorites.count(),
        'recent_orders': user_orders.order_by('-created_at')[:5],
        'recent_products': user_products.order_by('-created_at')[:5],
    }
    
    return render(request, 'homepage/user_profile.html', context)


@login_required
def user_products(request):
    """Display user's products (for sellers)"""
    products = Product.objects.filter(seller=request.user).annotate(
        avg_rating=Avg('reviews__rating'),
        review_count=Count('reviews')
    ).order_by('-created_at')
    
    # Filter by status if requested
    status_filter = request.GET.get('status')
    if status_filter and status_filter != 'all':
        products = products.filter(status=status_filter)
    
    # Pagination
    paginator = Paginator(products, 12)
    page_number = request.GET.get('page')
    products_page = paginator.get_page(page_number)
    
    # Get status choices for filter
    status_choices = Product.STATUS_CHOICES
    
    context = {
        'products': products_page,
        'status_choices': status_choices,
        'current_status': status_filter,
    }
    
    return render(request, 'homepage/my_products.html', context)


# Product Draft Views
@login_required
def save_product_draft(request):
    """Save product creation as draft"""
    if request.method == 'POST':
        form = ProductDraftForm(request.POST, request.FILES)
        if form.is_valid():
            draft = form.save(commit=False)
            draft.user = request.user
            draft.save()
            
            # Save additional form data if needed
            form.save_draft_data(request.POST.dict())
            
            messages.success(request, 'Product draft saved successfully!')
            return JsonResponse({
                'success': True,
                'draft_id': draft.id,
                'message': 'Draft saved successfully!'
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            })
    
    return JsonResponse({'success': False, 'message': 'Invalid request method'})


@login_required
def product_drafts_list(request):
    """List user's product drafts"""
    drafts = ProductDraft.objects.filter(user=request.user).order_by('-updated_at')
    
    # Pagination
    paginator = Paginator(drafts, 10)
    page_number = request.GET.get('page')
    drafts_page = paginator.get_page(page_number)
    
    context = {
        'drafts': drafts_page,
    }
    return render(request, 'homepage/product_drafts.html', context)


@login_required
def edit_product_draft(request, draft_id):
    """Edit a product draft"""
    draft = get_object_or_404(ProductDraft, id=draft_id, user=request.user)
    
    if request.method == 'POST':
        form = ProductDraftForm(request.POST, request.FILES, instance=draft)
        if form.is_valid():
            form.save()
            form.save_draft_data(request.POST.dict())
            messages.success(request, 'Draft updated successfully!')
            return redirect('product_drafts_list')
    else:
        form = ProductDraftForm(instance=draft)
        # Load additional draft data
        draft_data = form.load_draft_data()
        for field_name, value in draft_data.items():
            if field_name in form.fields:
                form.fields[field_name].initial = value
    
    context = {
        'form': form,
        'draft': draft,
    }
    return render(request, 'homepage/edit_product_draft.html', context)


@login_required
def convert_draft_to_product(request, draft_id):
    """Convert a draft to a published product"""
    draft = get_object_or_404(ProductDraft, id=draft_id, user=request.user)
    
    if request.method == 'POST':
        # Create product from draft
        product = Product.objects.create(
            name=draft.name or 'Untitled Product',
            description=draft.description or '',
            price=draft.price or 0,
            category=draft.category or 'other',
            condition=draft.condition or 'good',
            location=draft.location or 'cape_town_central',
            seller=request.user,
            image=draft.temp_image,
            status='available'
        )
        
        # Delete the draft
        draft.delete()
        
        messages.success(request, f'Product "{product.name}" created successfully!')
        return redirect('product_detail', pk=product.id)
    
    context = {
        'draft': draft,
    }
    return render(request, 'homepage/convert_draft.html', context)


@login_required
@require_POST
def delete_product_draft(request, draft_id):
    """Delete a product draft"""
    draft = get_object_or_404(ProductDraft, id=draft_id, user=request.user)
    draft_name = draft.name or 'Untitled'
    draft.delete()
    
    messages.success(request, f'Draft "{draft_name}" deleted successfully.')
    return redirect('product_drafts_list')


# Auto-save draft functionality (AJAX)
@login_required
@require_POST
def auto_save_draft(request):
    """Auto-save product draft via AJAX"""
    try:
        draft_id = request.POST.get('draft_id')
        
        if draft_id:
            # Update existing draft
            draft = get_object_or_404(ProductDraft, id=draft_id, user=request.user)
            form = ProductDraftForm(request.POST, request.FILES, instance=draft)
        else:
            # Create new draft
            form = ProductDraftForm(request.POST, request.FILES)
        
        if form.is_valid():
            draft = form.save(commit=False)
            if not hasattr(draft, 'user') or not draft.user:
                draft.user = request.user
            draft.save()
            
            return JsonResponse({
                'success': True,
                'draft_id': draft.id,
                'message': 'Draft auto-saved'
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error saving draft: {str(e)}'
        })


def test_icons(request):
    """Test page for Bootstrap icons"""
    return render(request, 'homepage/test_icons.html')


def daily_deals(request):
    """Daily deals page with special offers"""
    from django.core.paginator import Paginator
    
    # Get products with special deals (you can add logic here to filter by deal criteria)
    # For now, we'll show random products as "deals"
    products_list = Product.objects.all().order_by('?')  # Random order for variety
    
    # Paginate results
    paginator = Paginator(products_list, 12)  # Show 12 products per page
    page_number = request.GET.get('page')
    products = paginator.get_page(page_number)
    
    # Calculate some stats for the page
    deals_count = products_list.count()
    
    context = {
        'products': products,
        'deals_count': deals_count,
        'page_title': 'Daily Deals',
    }
    
    return render(request, 'homepage/daily_deals.html', context)


def promotions(request):
    """Promotions page with category-based offers"""
    from django.core.paginator import Paginator
    
    # Get category filter from URL parameters
    category_filter = request.GET.get('category', 'all')
    
    # Start with all products
    products_list = Product.objects.all()
    
    # Apply category filter if specified
    if category_filter and category_filter != 'all':
        products_list = products_list.filter(category=category_filter)
    
    # Order by newest first
    products_list = products_list.order_by('-created_at')
    
    # Paginate results
    paginator = Paginator(products_list, 12)  # Show 12 products per page
    page_number = request.GET.get('page')
    products = paginator.get_page(page_number)
    
    # Calculate some promotional stats
    active_promotions = Product.objects.count()
    categories_on_sale = Product.objects.values('category').distinct().count()
    total_savings = 50  # Mock percentage for display
    
    context = {
        'products': products,
        'current_category': category_filter,
        'active_promotions': active_promotions,
        'categories_on_sale': categories_on_sale,
        'total_savings': total_savings,
        'page_title': 'Special Promotions',
    }
    
    return render(request, 'homepage/promotions.html', context)


def style_guide(request):
    """Modern style guide showcasing the new design system"""
    return render(request, 'homepage/style_guide.html')


@require_POST
def quick_view_product(request, product_id):
    """API endpoint for quick view product data"""
    try:
        product = get_object_or_404(Product, id=product_id)
        
        # Get product reviews and average rating
        reviews = Review.objects.filter(product=product)
        avg_rating = reviews.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0
        
        # Check if user has favorited this product
        is_favorited = False
        if request.user.is_authenticated:
            is_favorited = Favorite.objects.filter(user=request.user, product=product).exists()
        
        product_data = {
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'price': str(product.price),
            'category': product.get_category_display(),
            'location': product.get_location_display(),
            'condition': product.get_condition_display() if hasattr(product, 'condition') else 'Good',
            'image_url': product.image.url if product.image else None,
            'seller': product.seller.username,
            'created_at': product.created_at.strftime('%B %d, %Y'),
            'avg_rating': round(avg_rating, 1),
            'review_count': reviews.count(),
            'is_favorited': is_favorited,
            'is_available': product.status == 'available' if hasattr(product, 'status') else True,
        }
        
        return JsonResponse({
            'success': True,
            'product': product_data
        })
        
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Product not found'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


def csrf_test(request):
    """Test CSRF functionality"""
    from django.middleware.csrf import get_token
    csrf_token = get_token(request)
    
    context = {
        'csrf_token': csrf_token,
        'session_key': request.session.session_key,
        'cookies': request.COOKIES,
    }
    return render(request, 'homepage/csrf_test.html', context)

