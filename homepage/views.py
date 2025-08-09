from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.contrib import messages
from django.db.models import Q, Avg, Count
from django.views.decorators.http import require_POST

from .models import Product, Cart, CartItem, HeroSlide, Category, Promotion, Order, OrderItem, Favorite, Review, ProductImage
from .forms import ProductForm, CheckoutForm
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
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('login')
    else:
        form = UserCreationForm()
    return render(request, 'homepage/signup.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            auth_login(request, form.get_user())
            return redirect('home')
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
            form.save()
            return redirect('product_list')
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
            
            # Redirect to order confirmation
            messages.success(request, f'Order {order.order_number} has been placed successfully!')
            return redirect('order_confirmation', order_id=order.id)
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
