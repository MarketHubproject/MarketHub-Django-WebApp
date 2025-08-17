from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import Product, Cart, CartItem, Order, OrderItem, Review, Favorite
from .serializers import (
    ProductSerializer, CartSerializer, CartItemSerializer,
    UserSerializer, ProductCreateUpdateSerializer, LoginSerializer,
    TokenResponseSerializer, MessageResponseSerializer, ErrorResponseSerializer,
    CategoriesResponseSerializer, CartItemUpdateSerializer, CartItemResponseSerializer,
    OrderSerializer, OrderCreateSerializer, OrderItemSerializer,
    ReviewSerializer, ReviewCreateUpdateSerializer,
    FavoriteSerializer, FavoriteToggleSerializer, FavoriteToggleResponseSerializer
)


class ProductListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all products with pagination, filtering, searching, and ordering
    POST: Create a new product (authenticated users only)
    """
    queryset = Product.objects.all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.all()

        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)

        # Price filtering
        min_price = self.request.query_params.get('min_price', None)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        
        max_price = self.request.query_params.get('max_price', None)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Search by name and description
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering:
            # Allow ordering by price, name, created_at
            valid_orderings = ['price', '-price', 'name', '-name', 'created_at', '-created_at']
            if ordering in valid_orderings:
                queryset = queryset.order_by(ordering)
            else:
                queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        # Set the seller to the current user when creating a product
        serializer.save(seller=self.request.user)

    def create(self, request, *args, **kwargs):
        # Use the create/update serializer for input validation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return the created product using the full ProductSerializer
        product = serializer.instance
        output_serializer = ProductSerializer(product)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the product.
        return obj.seller == request.user


class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific product
    PUT/PATCH: Update a product (owner only)
    DELETE: Delete a product (owner only)
    """
    queryset = Product.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        # Return the updated product using the full ProductSerializer
        output_serializer = ProductSerializer(instance)
        return Response(output_serializer.data)


class CartAPIView(generics.RetrieveAPIView):
    """
    GET: Retrieve user's cart
    """
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart


@extend_schema(
    methods=['POST'],
    responses={
        201: CartItemResponseSerializer,
        404: ErrorResponseSerializer,
    },
    description="Add a product to user's cart"
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_to_cart_api(request, product_id):
    """
    POST: Add a product to user's cart
    """
    try:
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

        return Response({
            'message': f'{product.name} added to cart successfully!',
            'item': CartItemSerializer(cart_item).data
        }, status=status.HTTP_201_CREATED)

    except Product.DoesNotExist:
        return Response({
            'error': 'Product not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def update_cart_item_api(request, item_id):
    """
    PUT: Update cart item quantity
    DELETE: Remove cart item
    """
    try:
        cart_item = get_object_or_404(
            CartItem,
            id=item_id,
            cart__user=request.user
        )

        if request.method == 'PUT':
            quantity = request.data.get('quantity', 1)
            if quantity <= 0:
                cart_item.delete()
                return Response({
                    'message': 'Item removed from cart'
                }, status=status.HTTP_200_OK)

            cart_item.quantity = quantity
            cart_item.save()

            return Response({
                'message': 'Cart item updated successfully',
                'item': CartItemSerializer(cart_item).data
            }, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            product_name = cart_item.product.name
            cart_item.delete()
            return Response({
                'message': f'{product_name} removed from cart'
            }, status=status.HTTP_200_OK)

    except CartItem.DoesNotExist:
        return Response({
            'error': 'Cart item not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile_api(request):
    """
    GET: Retrieve user profile information
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
def product_categories_api(request):
    """
    GET: List all available product categories
    """
    categories = [
        {'value': value, 'label': label}
        for value, label in Product.CATEGORY_CHOICES
    ]
    return Response({'categories': categories})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_login(request):
    """
    POST: Authenticate user and return token
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if username and password:
        user = authenticate(username=username, password=password)
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
    else:
        return Response({
            'error': 'Username and password required'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_logout(request):
    """
    POST: Logout user and delete token
    """
    try:
        token = Token.objects.get(user=request.user)
        token.delete()
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    except Token.DoesNotExist:
        return Response({
            'message': 'No active session found'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def api_overview(request):
    """
    GET: API endpoints overview
    """
    api_urls = {
        'Authentication Endpoints': {
            'API Login': 'POST /api/login/ (username, password)',
            'API Logout': 'POST /api/logout/ (requires token)',
            'DRF Browse Auth': '/api/auth/ (session based)'
        },
        'Product Endpoints': {
            'List/Create Products': 'GET/POST /api/products/',
            'Product Detail': 'GET/PUT/DELETE /api/products/<id>/',
            'Product Categories': 'GET /api/categories/',
        },
        'Cart Endpoints': {
            'View Cart': 'GET /api/cart/ (requires auth)',
            'Add to Cart': 'POST /api/cart/add/<product_id>/ (requires auth)',
            'Update Cart Item': 'PUT/DELETE /api/cart/item/<item_id>/ (requires auth)',
        },
        'User Endpoints': {
            'User Profile': 'GET /api/profile/ (requires auth)',
        },
        'Authentication Info': {
            'Token Usage': 'Include "Authorization: Token <your-token>" in headers',
            'Session Auth': 'Use DRF browsable API for session authentication',
            'Permissions': 'Most endpoints allow read access, write requires authentication'
        }
    }

    return Response(api_urls)


# ===== ORDER API VIEWS =====

class OrderListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List user's orders
    POST: Create order from cart
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        # Get user's cart
        try:
            cart = Cart.objects.get(user=self.request.user)
            if not cart.items.exists():
                raise ValueError('Cart is empty')
        except Cart.DoesNotExist:
            raise ValueError('Cart is empty')

        # Create the order
        order = serializer.save(
            user=self.request.user,
            subtotal=cart.get_total_price(),
            shipping_cost=0,  # Free shipping
            tax_amount=0,     # No tax
            total_amount=cart.get_total_price()
        )

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

    def create(self, request, *args, **kwargs):
        try:
            # Use the create serializer for input validation
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Return the created order using the full OrderSerializer
            order = serializer.instance
            output_serializer = OrderSerializer(order)
            headers = self.get_success_headers(output_serializer.data)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class OrderDetailAPIView(generics.RetrieveAPIView):
    """
    GET: Retrieve a specific order
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


# ===== REVIEW API VIEWS =====

class ReviewListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List reviews (optionally filtered by product)
    POST: Create a review
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Review.objects.all().order_by('-created_at')
        
        # Filter by product if specified
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        # Filter by user if specified (for user's own reviews)
        user_id = self.request.query_params.get('user', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReviewCreateUpdateSerializer
        return ReviewSerializer

    def perform_create(self, serializer):
        product_id = serializer.validated_data['product_id']
        product = get_object_or_404(Product, id=product_id)
        
        # Additional validation
        if product.seller == self.request.user:
            raise ValueError('You cannot review your own product')
            
        if Review.objects.filter(user=self.request.user, product=product).exists():
            raise ValueError('You have already reviewed this product')
            
        serializer.save(user=self.request.user, product=product)

    def create(self, request, *args, **kwargs):
        try:
            # Use the create/update serializer for input validation
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Return the created review using the full ReviewSerializer
            review = serializer.instance
            output_serializer = ReviewSerializer(review)
            headers = self.get_success_headers(output_serializer.data)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class ReviewDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific review
    PUT/PATCH: Update review (owner only)
    DELETE: Delete review (owner only)
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Review.objects.all()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ReviewCreateUpdateSerializer
        return ReviewSerializer

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user:
            return Response(
                {'error': 'You can only update your own reviews'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user:
            return Response(
                {'error': 'You can only delete your own reviews'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


# ===== FAVORITE API VIEWS =====

class FavoriteListAPIView(generics.ListCreateAPIView):
    """
    GET: List user's favorite products
    POST: Add product to favorites
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).order_by('-added_at')
    
    def perform_create(self, serializer):
        product_id = serializer.validated_data['product_id']
        product = get_object_or_404(Product, id=product_id)
        # Check if already favorited
        if Favorite.objects.filter(user=self.request.user, product=product).exists():
            raise ValueError('Product is already in your favorites')
        serializer.save(user=self.request.user, product=product)
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class FavoriteDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    GET: Retrieve a specific favorite
    DELETE: Remove product from favorites
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)


@extend_schema(
    methods=['POST'],
    request=FavoriteToggleSerializer,
    responses={
        200: FavoriteToggleResponseSerializer,
        404: ErrorResponseSerializer,
    },
    description="Toggle favorite status for a product"
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_favorite_api(request):
    """
    POST: Toggle favorite status for a product
    """
    serializer = FavoriteToggleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    product_id = serializer.validated_data['product_id']
    product = get_object_or_404(Product, id=product_id)
    
    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        product=product
    )
    
    if not created:
        favorite.delete()
        is_favorited = False
        message = f'{product.name} removed from favorites'
    else:
        is_favorited = True
        message = f'{product.name} added to favorites'
    
    # Get updated favorites count
    favorites_count = product.homepage_favorited_by.count()
    
    return Response({
        'success': True,
        'is_favorited': is_favorited,
        'favorites_count': favorites_count,
        'message': message
    }, status=status.HTTP_200_OK)
