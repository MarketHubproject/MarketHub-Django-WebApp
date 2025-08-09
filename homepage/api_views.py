from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Product, Cart, CartItem
from .serializers import (
    ProductSerializer, CartSerializer, CartItemSerializer, 
    UserSerializer, ProductCreateUpdateSerializer
)


class ProductListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all products with pagination and filtering
    POST: Create a new product (authenticated users only)
    """
    queryset = Product.objects.all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductSerializer
    
    def get_queryset(self):
        queryset = Product.objects.all().order_by('-created_at')
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset


class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific product
    PUT/PATCH: Update a product (authenticated users only)
    DELETE: Delete a product (authenticated users only)
    """
    queryset = Product.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductSerializer


class CartAPIView(generics.RetrieveAPIView):
    """
    GET: Retrieve user's cart
    """
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart


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
