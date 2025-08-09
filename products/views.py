from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.db.models import Q, Avg, Count
from django.core.paginator import Paginator
from django.contrib import messages
from django.views.decorators.http import require_POST
from .models import Product, Favorite, Review, ProductImage, ProductStatus
from .forms import ProductForm


def product_list(request):
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

def product_detail(request, pk):
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
def create_product(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            product.seller = request.user
            product.save()
            return redirect('product_list')
    else:
        form = ProductForm()
        return render(request, 'homepage/create_product.html', {'form': form})


@login_required
@require_POST
def toggle_favorite(request, product_id):
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
        'favorites_count': product.favorited_by.count()
    })


@login_required
def favorites_list(request):
    favorites = Favorite.objects.filter(user=request.user).select_related('product')
    return render(request, 'products/favorites_list.html', {'favorites': favorites})


@login_required
def add_review(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    
    # Check if user is trying to review their own product
    if product.seller == request.user:
        messages.error(request, "You cannot review your own product.")
        return redirect('product_detail', pk=product_id)
    
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
    
    return redirect('product_detail', pk=product_id)


@login_required
def update_review(request, product_id):
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
    
    return redirect('product_detail', pk=product_id)


@login_required
def seller_dashboard(request):
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
