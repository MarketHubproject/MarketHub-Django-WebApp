from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Product, Cart, CartItem, Order, OrderItem, Review, Favorite


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    seller = UserSerializer(read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'image',
                  'category', 'category_display', 'seller', 'created_at']
        read_only_fields = ['id', 'created_at']


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for CartItem model"""
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity',
                  'total_price', 'added_at']
        read_only_fields = ['id', 'added_at']

    def get_total_price(self, obj):
        return obj.get_total_price()


class CartSerializer(serializers.ModelSerializer):
    """Serializer for Cart model"""
    items = CartItemSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_price',
                  'total_items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_price(self, obj):
        return obj.get_total_price()

    def get_total_items(self, obj):
        return obj.get_total_items()


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating products"""

    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'image', 'category']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value


class LoginSerializer(serializers.Serializer):
    """Serializer for API login"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(style={'input_type': 'password'})


class TokenResponseSerializer(serializers.Serializer):
    """Serializer for token response"""
    token = serializers.CharField()
    user = UserSerializer()
    message = serializers.CharField()


class MessageResponseSerializer(serializers.Serializer):
    """Serializer for simple message responses"""
    message = serializers.CharField()


class ErrorResponseSerializer(serializers.Serializer):
    """Serializer for error responses"""
    error = serializers.CharField()


class CategorySerializer(serializers.Serializer):
    """Serializer for product categories"""
    value = serializers.CharField()
    label = serializers.CharField()


class CategoriesResponseSerializer(serializers.Serializer):
    """Serializer for categories response"""
    categories = CategorySerializer(many=True)


class CartItemUpdateSerializer(serializers.Serializer):
    """Serializer for updating cart item quantity"""
    quantity = serializers.IntegerField(min_value=1)


class CartItemResponseSerializer(serializers.Serializer):
    """Serializer for cart item operation response"""
    message = serializers.CharField()
    item = CartItemSerializer(required=False)


# Order Serializers
class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem model"""
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'price', 'item_total']
        read_only_fields = ['id']

    def get_item_total(self, obj):
        return obj.quantity * obj.price


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for Order model"""
    user = UserSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'items',
            'email', 'first_name', 'last_name',
            'address_line_1', 'address_line_2', 'city', 'postal_code', 'province', 'phone',
            'subtotal', 'shipping_cost', 'tax_amount', 'total_amount',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating orders"""
    
    class Meta:
        model = Order
        fields = [
            'email', 'first_name', 'last_name',
            'address_line_1', 'address_line_2', 'city', 'postal_code', 'province', 'phone'
        ]

    def validate_email(self, value):
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise serializers.ValidationError('Enter a valid email address.')
        return value


# Review Serializers
class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for Review model"""
    user = UserSerializer(read_only=True)
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'user', 'product', 'product_id',
            'rating', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            product_id = data.get('product_id')
            if product_id:
                try:
                    product = Product.objects.get(id=product_id)
                    if product.seller == request.user:
                        raise serializers.ValidationError('You cannot review your own product.')
                    
                    # Check if user already reviewed this product (for create operations)
                    if not self.instance and Review.objects.filter(user=request.user, product=product).exists():
                        raise serializers.ValidationError('You have already reviewed this product.')
                        
                except Product.DoesNotExist:
                    raise serializers.ValidationError('Product not found.')
        return data


class ReviewCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating reviews"""
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Review
        fields = ['product_id', 'rating', 'comment']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


# Favorite Serializers
class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for Favorite model"""
    user = UserSerializer(read_only=True)
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'user', 'product', 'product_id', 'added_at']
        read_only_fields = ['id', 'added_at']

    def validate_product_id(self, value):
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError('Product not found.')
        return value


class FavoriteToggleSerializer(serializers.Serializer):
    """Serializer for toggle favorite operation"""
    product_id = serializers.IntegerField()

    def validate_product_id(self, value):
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError('Product not found.')
        return value


class FavoriteToggleResponseSerializer(serializers.Serializer):
    """Serializer for favorite toggle response"""
    success = serializers.BooleanField()
    is_favorited = serializers.BooleanField()
    favorites_count = serializers.IntegerField()
    message = serializers.CharField()
