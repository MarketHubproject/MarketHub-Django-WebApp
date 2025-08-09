from django import template

register = template.Library()


@register.filter
def rand_format(value):
    """
    Format currency as South African Rands
    Usage: {{ product.price|rand_format }}
    """
    try:
        # Format with 2 decimal places and add R prefix
        formatted_value = f"{float(value):.2f}"
        return f"R{formatted_value}"
    except (ValueError, TypeError):
        return f"R{value}"


@register.filter
def rand_short(value):
    """
    Format currency as South African Rands with shorter format for large numbers
    Usage: {{ product.price|rand_short }}
    """
    try:
        value = float(value)
        if value >= 1000000:
            return f"R{value / 1000000:.1f}M"
        elif value >= 1000:
            return f"R{value / 1000:.1f}k"
        else:
            return f"R{value:.2f}"
    except (ValueError, TypeError):
        return f"R{value}"
