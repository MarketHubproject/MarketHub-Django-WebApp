from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from profiles.models import UserProfile
import re
from decimal import Decimal


class StudentProfile(models.Model):
    """Student profile linked to UserProfile with student-specific information"""
    user_profile = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )
    id_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="South African ID number or passport number"
    )
    university = models.CharField(
        max_length=200,
        help_text="Name of the university or educational institution"
    )
    verified = models.BooleanField(
        default=False,
        help_text="Whether the student's information has been verified"
    )
    total_points = models.IntegerField(
        default=0,
        help_text="Total points earned by the student over all time"
    )
    current_points = models.IntegerField(
        default=0,
        help_text="Current available points balance"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_rewards_studentprofile'
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'
        indexes = [
            models.Index(fields=['verified']),
            models.Index(fields=['university']),
            models.Index(fields=['current_points']),
        ]

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.university}"

    def clean(self):
        """Validate South African ID number or passport number"""
        super().clean()

        if not self.id_number:
            raise ValidationError({'id_number': 'ID number or passport is required.'})

        # South African ID number validation (13 digits)
        sa_id_pattern = r'^\d{13}$'
        # South African passport pattern (1 letter followed by 8 digits)
        sa_passport_pattern = r'^[A-Z]\d{8}$'
        # International passport pattern (various formats)
        intl_passport_pattern = r'^[A-Z0-9]{6,12}$'

        id_upper = self.id_number.upper().replace(' ', '')

        if not (re.match(sa_id_pattern, id_upper) or
                re.match(sa_passport_pattern, id_upper) or
                re.match(intl_passport_pattern, id_upper)):
            raise ValidationError({
                'id_number': 'Please enter a valid South African ID number (13 digits) or passport number.'
            })

        # Additional SA ID number validation (basic checksum)
        if re.match(sa_id_pattern, id_upper):
            if not self._validate_sa_id_checksum(id_upper):
                raise ValidationError({
                    'id_number': 'Invalid South African ID number checksum.'
                })

    def _validate_sa_id_checksum(self, id_number):
        """Validate South African ID number using Luhn algorithm"""
        try:
            # Convert to list of integers
            digits = [int(d) for d in id_number[:12]]  # Exclude check digit
            check_digit = int(id_number[12])

            # Apply Luhn algorithm
            total = 0
            for i, digit in enumerate(digits):
                if i % 2 == 1:  # Every second digit from right
                    doubled = digit * 2
                    total += doubled if doubled < 10 else doubled - 9
                else:
                    total += digit

            return (10 - (total % 10)) % 10 == check_digit
        except (ValueError, IndexError):
            return False

    def add_points(self, points, reason=""):
        """Add points to student's account"""
        self.current_points += points
        self.total_points += points
        self.save()

        # Create transaction record
        PointsTransaction.objects.create(
            student=self,
            points_delta=points,
            reason=reason or f"Points added: {points}"
        )

    def deduct_points(self, points, reason=""):
        """Deduct points from student's account"""
        if self.current_points < points:
            raise ValidationError(f"Insufficient points. Available: {self.current_points}, Required: {points}")

        self.current_points -= points
        self.save()

        # Create transaction record
        PointsTransaction.objects.create(
            student=self,
            points_delta=-points,
            reason=reason or f"Points deducted: {points}"
        )


class PointsTransaction(models.Model):
    """Record of all points transactions for students"""
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='points_transactions'
    )
    order_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reference to order or activity that generated points"
    )
    activity_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reference to specific activity that generated points"
    )
    points_delta = models.IntegerField(
        help_text="Points change (positive for earned, negative for spent)"
    )
    reason = models.CharField(
        max_length=200,
        help_text="Reason for the points transaction"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the transaction occurred"
    )

    class Meta:
        db_table = 'student_rewards_pointstransaction'
        verbose_name = 'Points Transaction'
        verbose_name_plural = 'Points Transactions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['student', '-timestamp']),
            models.Index(fields=['order_reference']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        action = "earned" if self.points_delta > 0 else "spent"
        return f"{self.student.user_profile.user.username} {action} {abs(self.points_delta)} points"

    def clean(self):
        super().clean()
        if self.points_delta == 0:
            raise ValidationError({'points_delta': 'Points delta cannot be zero.'})


class DiscountTier(models.Model):
    """Different discount tiers based on points"""
    name = models.CharField(
        max_length=100,
        help_text="Name of the discount tier (e.g., 'Bronze', 'Silver', 'Gold')"
    )
    min_points = models.IntegerField(
        help_text="Minimum points required to access this tier"
    )
    percent_off = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Percentage discount offered (e.g., 10.00 for 10%)"
    )
    description = models.TextField(
        help_text="Description of the discount tier benefits"
    )
    active = models.BooleanField(
        default=True,
        help_text="Whether this discount tier is currently active"
    )
    max_uses_per_student = models.IntegerField(
        default=1,
        help_text="Maximum times a student can use this discount tier"
    )
    valid_from = models.DateTimeField(
        default=timezone.now,
        help_text="When this discount tier becomes valid"
    )
    valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this discount tier expires (null for no expiry)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_rewards_discounttier'
        verbose_name = 'Discount Tier'
        verbose_name_plural = 'Discount Tiers'
        ordering = ['min_points']
        indexes = [
            models.Index(fields=['active', 'min_points']),
            models.Index(fields=['valid_from', 'valid_until']),
        ]

    def __str__(self):
        return f"{self.name} - {self.percent_off}% off (min: {self.min_points} pts)"

    def clean(self):
        super().clean()

        if self.min_points < 0:
            raise ValidationError({'min_points': 'Minimum points cannot be negative.'})

        if self.percent_off < 0 or self.percent_off > 100:
            raise ValidationError({'percent_off': 'Percentage must be between 0 and 100.'})

        if self.valid_until and self.valid_until <= self.valid_from:
            raise ValidationError({'valid_until': 'End date must be after start date.'})

    def is_currently_valid(self):
        """Check if the discount tier is currently valid"""
        now = timezone.now()
        return (self.active and
                self.valid_from <= now and
                (self.valid_until is None or self.valid_until >= now))

    @classmethod
    def get_available_tiers_for_student(cls, student_profile):
        """Get all discount tiers available to a student based on their points"""
        now = timezone.now()
        return cls.objects.filter(
            active=True,
            min_points__lte=student_profile.current_points,
            valid_from__lte=now
        ).filter(
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=now)
        ).order_by('min_points')


class RedeemedDiscount(models.Model):
    """Record of discounts redeemed by students"""
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='redeemed_discounts'
    )
    discount_tier = models.ForeignKey(
        DiscountTier,
        on_delete=models.CASCADE,
        related_name='redemptions'
    )
    order_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reference to order where discount was applied (null if not used yet)"
    )
    redeemed_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the discount was redeemed"
    )
    expires_at = models.DateTimeField(
        help_text="When the redeemed discount expires"
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the discount was actually used in an order"
    )
    discount_code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique code for the redeemed discount"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the discount is still active and can be used"
    )

    class Meta:
        db_table = 'student_rewards_redeemeddiscount'
        verbose_name = 'Redeemed Discount'
        verbose_name_plural = 'Redeemed Discounts'
        ordering = ['-redeemed_at']
        indexes = [
            models.Index(fields=['student', '-redeemed_at']),
            models.Index(fields=['discount_code']),
            models.Index(fields=['order_reference']),
            models.Index(fields=['expires_at', 'is_active']),
        ]

    def __str__(self):
        status = "Used" if self.used_at else ("Active" if self.is_active else "Expired")
        return f"{self.student.user_profile.user.username} - {self.discount_tier.name} [{status}]"

    def clean(self):
        super().clean()

        if self.expires_at <= self.redeemed_at:
            raise ValidationError({'expires_at': 'Expiry date must be after redemption date.'})

        if self.used_at and self.used_at < self.redeemed_at:
            raise ValidationError({'used_at': 'Usage date cannot be before redemption date.'})

    def save(self, *args, **kwargs):
        # Generate discount code if not provided
        if not self.discount_code:
            import uuid
            import string
            import random

            # Generate a readable discount code
            prefix = self.discount_tier.name[:3].upper()
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.discount_code = f"{prefix}-{suffix}"

        super().save(*args, **kwargs)

    def is_valid(self):
        """Check if the discount is still valid and can be used"""
        now = timezone.now()
        return (self.is_active and
                not self.used_at and
                self.expires_at > now)

    def mark_as_used(self, order_reference=None):
        """Mark the discount as used"""
        self.used_at = timezone.now()
        self.is_active = False
        if order_reference:
            self.order_reference = order_reference
        self.save()
