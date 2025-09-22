from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from .models import (
    Category, Product, ProductImage, CustomerProfile, Address,
    Order, OrderItem, Cart, CartItem
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'alt_text', 'is_primary', 'sort_order')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'is_active', 'created_at')
    list_filter = ('is_active', 'parent', 'created_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('is_active',)
    ordering = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'price', 'stock_quantity', 'status', 
        'featured', 'is_in_stock', 'created_at'
    )
    list_filter = (
        'status', 'featured', 'category', 'track_inventory', 
        'allow_backorders', 'created_at'
    )
    search_fields = ('name', 'description', 'sku')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('price', 'stock_quantity', 'status', 'featured')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'short_description', 'category')
        }),
        ('Pricing', {
            'fields': ('price', 'compare_at_price', 'cost_price')
        }),
        ('Inventory', {
            'fields': ('sku', 'stock_quantity', 'track_inventory', 'allow_backorders')
        }),
        ('Product Details', {
            'fields': ('weight', 'dimensions'),
            'classes': ('collapse',)
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
        ('Status & Timing', {
            'fields': ('status', 'featured', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [ProductImageInline]
    
    def is_in_stock(self, obj):
        return obj.is_in_stock
    is_in_stock.boolean = True
    is_in_stock.short_description = 'In Stock'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('total_price',)
    fields = ('product', 'product_name', 'quantity', 'unit_price', 'total_price')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number', 'user', 'status', 'payment_status', 
        'total_amount', 'created_at'
    )
    list_filter = (
        'status', 'payment_status', 'created_at', 'updated_at'
    )
    search_fields = ('order_number', 'user__username', 'user__email', 'email')
    readonly_fields = (
        'order_number', 'created_at', 'updated_at', 'total_amount'
    )
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'user', 'status', 'payment_status')
        }),
        ('Financial Details', {
            'fields': (
                'subtotal', 'tax_amount', 'shipping_cost', 
                'discount_amount', 'total_amount'
            )
        }),
        ('Customer Information', {
            'fields': ('email', 'phone')
        }),
        ('Addresses', {
            'fields': ('shipping_address', 'billing_address'),
            'classes': ('collapse',)
        }),
        ('Payment', {
            'fields': ('payment_method', 'payment_id'),
            'classes': ('collapse',)
        }),
        ('Additional Info', {
            'fields': ('notes', 'created_at', 'updated_at', 'shipped_at', 'delivered_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [OrderItemInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'phone', 'receive_newsletters', 'receive_sms', 'created_at'
    )
    list_filter = (
        'receive_newsletters', 'receive_sms', 'created_at'
    )
    search_fields = (
        'user__username', 'user__email', 'user__first_name', 
        'user__last_name', 'phone'
    )
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = (
        'full_name', 'user', 'address_type', 'city', 
        'state_province', 'country', 'is_default'
    )
    list_filter = (
        'address_type', 'country', 'state_province', 'is_default', 'created_at'
    )
    search_fields = (
        'first_name', 'last_name', 'user__username', 'city', 
        'postal_code', 'company'
    )
    list_editable = ('is_default',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('total_price', 'created_at', 'updated_at')


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_items', 'total_price', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'total_items', 'total_price')
    
    inlines = [CartItemInline]
    
    def total_items(self, obj):
        return obj.total_items
    total_items.short_description = 'Items'
    
    def total_price(self, obj):
        return f"${obj.total_price:.2f}"
    total_price.short_description = 'Total'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


# Additional admin customizations
admin.site.site_header = "MarketHub Administration"
admin.site.site_title = "MarketHub Admin"
admin.site.index_title = "Welcome to MarketHub Administration"
