from django.contrib import admin
from .models import StudentProfile, PointsTransaction, DiscountTier, RedeemedDiscount
from django.utils.html import format_html


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user_profile_display',
        'id_number',
        'university',
        'verified',
        'current_points',
        'total_points',
        'created_at']
    list_filter = ['verified', 'university', 'created_at']
    search_fields = ['user_profile__user__username', 'user_profile__user__email', 'id_number', 'university']
    readonly_fields = ['created_at', 'updated_at', 'total_points']
    ordering = ['-created_at']

    def user_profile_display(self, obj):
        return f"{obj.user_profile.user.get_full_name() or obj.user_profile.user.username}"
    user_profile_display.short_description = 'User'

    fieldsets = (
        ('Student Information', {
            'fields': ('user_profile', 'id_number', 'university', 'verified')
        }),
        ('Points Information', {
            'fields': ('current_points', 'total_points')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(PointsTransaction)
class PointsTransactionAdmin(admin.ModelAdmin):
    list_display = ['student_display', 'points_delta', 'reason', 'order_reference', 'timestamp']
    list_filter = ['timestamp', 'points_delta']
    search_fields = ['student__user_profile__user__username', 'reason', 'order_reference', 'activity_reference']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']

    def student_display(self, obj):
        return f"{obj.student.user_profile.user.username}"
    student_display.short_description = 'Student'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'student__user_profile__user'
        )


@admin.register(DiscountTier)
class DiscountTierAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_points', 'percent_off', 'active', 'valid_from', 'valid_until', 'redemption_count']
    list_filter = ['active', 'valid_from', 'valid_until', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'redemption_count']
    ordering = ['min_points']

    def redemption_count(self, obj):
        return obj.redemptions.count()
    redemption_count.short_description = 'Times Redeemed'

    fieldsets = (
        ('Discount Information', {
            'fields': ('name', 'min_points', 'percent_off', 'description', 'active')
        }),
        ('Usage Limits', {
            'fields': ('max_uses_per_student',)
        }),
        ('Validity Period', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Statistics', {
            'fields': ('redemption_count',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(RedeemedDiscount)
class RedeemedDiscountAdmin(admin.ModelAdmin):
    list_display = ['student_display', 'discount_tier', 'discount_code', 'status_display', 'redeemed_at', 'expires_at']
    list_filter = ['is_active', 'redeemed_at', 'expires_at', 'used_at']
    search_fields = ['student__user_profile__user__username', 'discount_code', 'order_reference']
    readonly_fields = ['redeemed_at', 'discount_code']
    ordering = ['-redeemed_at']

    def student_display(self, obj):
        return f"{obj.student.user_profile.user.username}"
    student_display.short_description = 'Student'

    def status_display(self, obj):
        if obj.used_at:
            return format_html('<span style="color: green;">✓ Used</span>')
        elif obj.is_valid():
            return format_html('<span style="color: blue;">◯ Active</span>')
        else:
            return format_html('<span style="color: red;">✗ Expired</span>')
    status_display.short_description = 'Status'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'student__user_profile__user',
            'discount_tier'
        )

    fieldsets = (
        ('Redemption Details', {
            'fields': ('student', 'discount_tier', 'discount_code', 'is_active')
        }),
        ('Usage Information', {
            'fields': ('order_reference', 'used_at')
        }),
        ('Validity Period', {
            'fields': ('redeemed_at', 'expires_at')
        })
    )
