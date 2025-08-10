from django.contrib import admin
from .models import (
    Product, Cart, CartItem, HeroSlide, Category, Promotion, Order, OrderItem,
    Review, Favorite, ProductImage, SearchHistory, Notification, ProductView, SavedSearch
)


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'created_at']
    list_editable = ['is_active', 'order']
    search_fields = ['title', 'subtitle']
    ordering = ['order', 'created_at']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Content', {
            'fields': ('title', 'subtitle', 'image')
        }),
        ('Call to Action', {
            'fields': ('cta_text', 'cta_url'),
            'classes': ('collapse',)
        }),
        ('Display Settings', {
            'fields': ('is_active', 'order')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'is_valid_display', 'valid_from', 'valid_to', 'order']
    list_filter = ['is_active', 'valid_from', 'valid_to', 'created_at']
    list_editable = ['is_active', 'order']
    search_fields = ['title', 'text']
    ordering = ['order', '-created_at']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Content', {
            'fields': ('title', 'text', 'image')
        }),
        ('Link & Validity', {
            'fields': ('link', 'valid_from', 'valid_to')
        }),
        ('Display Settings', {
            'fields': ('is_active', 'order')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def is_valid_display(self, obj):
        """Display whether the promotion is currently valid"""
        return obj.is_valid
    is_valid_display.boolean = True
    is_valid_display.short_description = 'Currently Valid'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'condition', 'status', 'seller', 'is_featured', 'views_count', 'created_at']
    list_filter = ['category', 'condition', 'status', 'is_featured', 'location', 'created_at']
    list_editable = ['status', 'is_featured']
    search_fields = ['name', 'description', 'seller__username']
    ordering = ['-created_at']
    readonly_fields = ['views_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'image')
        }),
        ('Pricing', {
            'fields': ('price', 'original_price')
        }),
        ('Classification', {
            'fields': ('category', 'condition', 'status', 'location')
        }),
        ('Seller & Features', {
            'fields': ('seller', 'is_featured', 'is_sold')
        }),
        ('Statistics', {
            'fields': ('views_count',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['added_at']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_total_items', 'get_total_price', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'quantity', 'get_total_price', 'added_at']
    list_filter = ['added_at']
    search_fields = ['cart__user__username', 'product__name']
    readonly_fields = ['added_at']


# Register your models here.

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_featured', 'order', 'get_product_count')
    list_filter = ('is_featured', 'created_at')
    list_editable = ('is_featured', 'order')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description')
        }),
        ('Display Settings', {
            'fields': ('is_featured', 'order', 'image', 'icon_class')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('product_set')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['get_total_price']

    def get_total_price(self, obj):
        if obj.pk:
            return f"R{obj.get_total_price():.2f}"
        return "-"
    get_total_price.short_description = 'Total Price'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'payment_status', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at', 'updated_at']
    list_editable = ['status']
    search_fields = ['order_number', 'user__username', 'user__email', 'first_name', 'last_name']
    readonly_fields = ['order_number', 'created_at', 'updated_at', 'get_full_name', 'get_full_address']
    ordering = ['-created_at']
    inlines = [OrderItemInline]

    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'user', 'status', 'payment_status')
        }),
        ('Customer Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'get_full_name')
        }),
        ('Shipping Address', {
            'fields': ('address_line_1', 'address_line_2', 'city', 'province', 'postal_code', 'get_full_address')
        }),
        ('Order Totals', {
            'fields': ('subtotal', 'shipping_cost', 'tax_amount', 'total_amount')
        }),
        ('Payment & Fulfillment', {
            'fields': ('payment_method', 'payment_reference', 'tracking_number'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Full Name'

    def get_full_address(self, obj):
        return obj.get_full_address()
    get_full_address.short_description = 'Full Address'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price', 'get_total_price']
    list_filter = ['order__created_at']
    search_fields = ['order__order_number', 'product__name']
    readonly_fields = ['get_total_price']

    def get_total_price(self, obj):
        return f"R{obj.get_total_price():.2f}"
    get_total_price.short_description = 'Total Price'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'is_approved', 'created_at']
    list_filter = ['rating', 'is_approved', 'created_at']
    list_editable = ['is_approved']
    search_fields = ['product__name', 'user__username', 'title', 'comment']
    ordering = ['-created_at']
    readonly_fields = ['helpful_votes', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Review Details', {
            'fields': ('product', 'user', 'rating', 'title')
        }),
        ('Content', {
            'fields': ('comment',)
        }),
        ('Moderation', {
            'fields': ('is_approved', 'helpful_votes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'added_at']
    list_filter = ['added_at']
    search_fields = ['user__username', 'product__name']
    ordering = ['-added_at']
    readonly_fields = ['added_at']


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'alt_text', 'order', 'created_at']
    list_filter = ['created_at']
    list_editable = ['order']
    search_fields = ['product__name', 'alt_text']
    ordering = ['product', 'order']
    readonly_fields = ['created_at']


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    list_display = ['query', 'user', 'results_count', 'ip_address', 'created_at']
    list_filter = ['created_at']
    search_fields = ['query', 'user__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    list_editable = ['is_read']
    search_fields = ['title', 'user__username', 'message']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Notification Details', {
            'fields': ('user', 'notification_type', 'title')
        }),
        ('Content', {
            'fields': ('message', 'product')
        }),
        ('Status', {
            'fields': ('is_read',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductView)
class ProductViewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'ip_address', 'viewed_at']
    list_filter = ['viewed_at']
    search_fields = ['product__name', 'user__username', 'ip_address']
    ordering = ['-viewed_at']
    readonly_fields = ['viewed_at']
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation
    
    def has_change_permission(self, request, obj=None):
        return False  # Prevent editing


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'category', 'is_active', 'email_alerts', 'created_at']
    list_filter = ['category', 'is_active', 'email_alerts', 'created_at']
    list_editable = ['is_active']
    search_fields = ['name', 'user__username', 'query']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Search Details', {
            'fields': ('user', 'name', 'query')
        }),
        ('Filters', {
            'fields': ('category', 'min_price', 'max_price', 'location')
        }),
        ('Settings', {
            'fields': ('is_active', 'email_alerts')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
