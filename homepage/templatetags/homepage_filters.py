from django import template
from decimal import Decimal

register = template.Library()

@register.filter
def lookup(dictionary, key):
    """Get item from dictionary by key"""
    return dictionary.get(key, '')

@register.filter
def subtract(value, arg):
    """Subtract arg from value"""
    try:
        return Decimal(str(value)) - Decimal(str(arg))
    except (ValueError, TypeError, Decimal.InvalidOperation):
        return 0

@register.filter
def multiply(value, arg):
    """Multiply value by arg"""
    try:
        return Decimal(str(value)) * Decimal(str(arg))
    except (ValueError, TypeError, Decimal.InvalidOperation):
        return 0

@register.filter
def currency(value):
    """Format value as currency"""
    try:
        return f"${Decimal(str(value)):.2f}"
    except (ValueError, TypeError, Decimal.InvalidOperation):
        return "$0.00"