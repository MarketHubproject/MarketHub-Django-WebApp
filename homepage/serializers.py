from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Product, Cart, CartItem


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'image', 
                 'category', 'category_display', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


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
