from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
import csv

from .models import (
    University,
    StudentProfile,
    VerificationLog,
    VerificationAppeal,
    StudentSettings
)


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'domain', 'country', 'is_active', 'verification_required',
        'student_count', 'created_at'
    )
    list_filter = ('country', 'is_active', 'verification_required', 'created_at')
    search_fields = ('name', 'domain')
    ordering = ('name',)
    readonly_fields = ('created_at', 'student_count')
    
    def student_count(self, obj):
        """Display the number of students from this university"""
        return obj.studentprofile_set.count()
    student_count.short_description = 'Students'


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user_info', 'university_email', 'university', 'id_verified',
        'verification_progress_bar', 'created_at', 'actions_column'
    )
    list_filter = (
        'id_verified', 'university', 'email_verified', 'created_at',
        'verified_at', 'university__country'
    )
    search_fields = (
        'user__username', 'user__email', 'university_email',
        'user__first_name', 'user__last_name', 'student_id_number'
    )
    readonly_fields = (
        'user', 'created_at', 'updated_at', 'last_verification_check',
        'id_hash', 'upload_ip', 'upload_user_agent', 'id_image_preview'
    )
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'university_email', 'university')
        }),
        ('Academic Information', {
            'fields': (
                'student_id_number', 'expected_graduation_year',
                'degree_program'
            )
        }),
        ('ID Verification', {
            'fields': (
                'id_image', 'id_image_preview', 'id_verified',
                'verified_at', 'verified_by', 'verification_notes',
                'rejection_reason', 'confidence_score'
            )
        }),
        ('Extracted Data (OCR)', {
            'fields': (
                'extracted_name', 'extracted_student_id',
                'extracted_university', 'extracted_expiry_date',
                'ocr_raw_data'
            ),
            'classes': ('collapse',)
        }),
        ('Security & Privacy', {
            'fields': (
                'id_hash', 'upload_ip', 'upload_user_agent'
            ),
            'classes': ('collapse',)
        }),
        ('Lifecycle Management', {
            'fields': (
                'id_expires_at', 'verification_expires_at',
                'email_verified', 'terms_accepted', 'privacy_consent'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_verification_check'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['approve_verification', 'reject_verification', 'reset_verification']
    
    def user_info(self, obj):
        """Display user's full name and username"""
        full_name = obj.user.get_full_name()
        if full_name:
            return f"{full_name} ({obj.user.username})"
        return obj.user.username
    user_info.short_description = 'Student'
    user_info.admin_order_field = 'user__username'
    
    def verification_progress_bar(self, obj):
        """Display verification progress as a colored progress bar"""
        progress = obj.verification_progress
        color = {
            0: '#dc3545',    # Red for pending/rejected
            25: '#ffc107',   # Yellow for uploaded
            50: '#17a2b8',   # Blue for processing
            75: '#6f42c1',   # Purple for appealing
            100: '#28a745'   # Green for verified
        }.get(progress, '#6c757d')
        
        return format_html(
            '<div style="width: 100px; height: 20px; background-color: #e9ecef; border-radius: 10px; overflow: hidden;">' +
            '<div style="width: {}%; height: 100%; background-color: {}; border-radius: 10px;"></div>' +
            '</div>' +
            '<small style="color: {}; font-weight: bold;">{} ({}%)</small>',
            progress, color, color, obj.get_id_verified_display(), progress
        )
    verification_progress_bar.short_description = 'Progress'
    verification_progress_bar.allow_tags = True
    
    def id_image_preview(self, obj):
        """Display a preview of the uploaded ID image"""
        if obj.id_image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px; border: 1px solid #ddd;"/>',
                obj.id_image.url
            )
        return "No image uploaded"
    id_image_preview.short_description = 'ID Image Preview'
    
    def actions_column(self, obj):
        """Display action buttons for quick verification"""
        if obj.id_verified == 'uploaded' or obj.id_verified == 'processing':
            approve_url = reverse('admin:students_studentprofile_approve', args=[obj.pk])
            reject_url = reverse('admin:students_studentprofile_reject', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background: #28a745; color: white; padding: 4px 8px; text-decoration: none; border-radius: 3px; margin-right: 4px;">Approve</a>' +
                '<a class="button" href="{}" style="background: #dc3545; color: white; padding: 4px 8px; text-decoration: none; border-radius: 3px;">Reject</a>',
                approve_url, reject_url
            )
        elif obj.id_verified == 'verified':
            return format_html('<span style="color: #28a745;">✓ Verified</span>')
        elif obj.id_verified == 'rejected':
            return format_html('<span style="color: #dc3545;">✗ Rejected</span>')
        return "No actions"
    actions_column.short_description = 'Quick Actions'
    actions_column.allow_tags = True
    
    def approve_verification(self, request, queryset):
        """Bulk approve verification"""
        updated = 0
        for student in queryset:
            if student.id_verified in ['uploaded', 'processing']:
                student.mark_as_verified(request.user, 'Bulk approved via admin')
                updated += 1
        
        self.message_user(
            request,
            f'Successfully approved {updated} student verifications.'
        )
    approve_verification.short_description = "Approve selected verifications"
    
    def reject_verification(self, request, queryset):
        """Bulk reject verification"""
        updated = 0
        for student in queryset:
            if student.id_verified in ['uploaded', 'processing']:
                student.mark_as_rejected(request.user, 'Bulk rejected via admin')
                updated += 1
        
        self.message_user(
            request,
            f'Successfully rejected {updated} student verifications.'
        )
    reject_verification.short_description = "Reject selected verifications"
    
    def reset_verification(self, request, queryset):
        """Reset verification status to allow re-upload"""
        queryset.update(
            id_verified='pending',
            rejection_reason='',
            verification_notes='Reset via admin',
            verified_at=None,
            verified_by=None
        )
        self.message_user(
            request,
            f'Successfully reset {queryset.count()} student verifications.'
        )
    reset_verification.short_description = "Reset selected verifications"
    
    def get_queryset(self, request):
        """Optimize queries"""
        return super().get_queryset(request).select_related(
            'user', 'university', 'verified_by'
        ).prefetch_related('verification_logs')


@admin.register(VerificationLog)
class VerificationLogAdmin(admin.ModelAdmin):
    list_display = (
        'student_profile', 'action', 'result', 'performed_by',
        'created_at', 'ip_address'
    )
    list_filter = ('action', 'result', 'created_at')
    search_fields = (
        'student_profile__user__username',
        'student_profile__university_email',
        'ip_address'
    )
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    
    def has_add_permission(self, request):
        """Prevent manual creation of logs"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing of logs"""
        return False


@admin.register(VerificationAppeal)
class VerificationAppealAdmin(admin.ModelAdmin):
    list_display = (
        'student_profile', 'status', 'created_at',
        'reviewed_by', 'reviewed_at'
    )
    list_filter = ('status', 'created_at', 'reviewed_at')
    search_fields = (
        'student_profile__user__username',
        'student_profile__university_email',
        'reason'
    )
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Appeal Information', {
            'fields': ('student_profile', 'reason', 'additional_documents')
        }),
        ('Review', {
            'fields': ('status', 'reviewed_by', 'review_notes', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['approve_appeal', 'deny_appeal']
    
    def approve_appeal(self, request, queryset):
        """Approve selected appeals"""
        for appeal in queryset:
            appeal.status = 'approved'
            appeal.reviewed_by = request.user
            appeal.reviewed_at = timezone.now()
            appeal.save()
            
            # Also approve the student verification
            appeal.student_profile.mark_as_verified(
                request.user,
                f'Approved via appeal: {appeal.reason}'
            )
        
        self.message_user(
            request,
            f'Successfully approved {queryset.count()} appeals and verified students.'
        )
    approve_appeal.short_description = "Approve selected appeals"
    
    def deny_appeal(self, request, queryset):
        """Deny selected appeals"""
        queryset.update(
            status='denied',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(
            request,
            f'Successfully denied {queryset.count()} appeals.'
        )
    deny_appeal.short_description = "Deny selected appeals"


@admin.register(StudentSettings)
class StudentSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'student_profile', 'email_notifications', 'verification_updates',
        'public_profile', 'auto_apply_discounts'
    )
    list_filter = (
        'email_notifications', 'verification_updates', 'marketing_emails',
        'public_profile', 'auto_apply_discounts'
    )
    search_fields = (
        'student_profile__user__username',
        'student_profile__university_email'
    )
    readonly_fields = ('created_at', 'updated_at')


# Custom admin site configuration
class StudentVerificationAdminSite(admin.AdminSite):
    site_title = 'Student Verification Admin'
    site_header = 'MarketHub Student Verification'
    index_title = 'Student Management Dashboard'
    
    def get_app_list(self, request, app_label=None):
        """Customize the admin index page"""
        app_list = super().get_app_list(request, app_label)
        
        # Add custom dashboard stats
        if app_label is None:
            from django.db.models import Count, Q
            stats = {
                'total_students': StudentProfile.objects.count(),
                'pending_verification': StudentProfile.objects.filter(
                    id_verified__in=['uploaded', 'processing']
                ).count(),
                'verified_students': StudentProfile.objects.filter(
                    id_verified='verified'
                ).count(),
                'rejected_students': StudentProfile.objects.filter(
                    id_verified='rejected'
                ).count(),
                'pending_appeals': VerificationAppeal.objects.filter(
                    status='pending'
                ).count()
            }
            
            # You could add this to context or create a custom dashboard view
            
        return app_list


# Register with custom admin site (optional)
# student_admin_site = StudentVerificationAdminSite(name='student_admin')
