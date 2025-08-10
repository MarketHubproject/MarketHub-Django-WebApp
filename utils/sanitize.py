"""
HTML Sanitization utilities for MarketHub

This module provides secure HTML sanitization for user-generated content
including reviews, messages, and product descriptions using bleach.
"""

import bleach
import re
from typing import Optional, List, Dict, Any
from django.utils.html import escape
from django.core.exceptions import ValidationError


# Secure allow-lists for different content types
ALLOWED_TAGS_BASIC = {
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li'
}

ALLOWED_TAGS_RICH = {
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
    'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
}

ALLOWED_ATTRIBUTES = {
    '*': ['class'],
    'a': ['href', 'title'],
    'table': ['class'],
    'th': ['colspan', 'rowspan'],
    'td': ['colspan', 'rowspan'],
}

ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']


def sanitize_html(
    content: str,
    allowed_tags: Optional[set] = None,
    allowed_attributes: Optional[Dict[str, List[str]]] = None,
    strip_comments: bool = True
) -> str:
    """
    Sanitize HTML content using bleach with configurable allow-lists.
    
    Args:
        content: HTML content to sanitize
        allowed_tags: Set of allowed HTML tags
        allowed_attributes: Dict of allowed attributes per tag
        strip_comments: Whether to remove HTML comments
        
    Returns:
        Sanitized HTML string
    """
    if not content:
        return ""
    
    if allowed_tags is None:
        allowed_tags = ALLOWED_TAGS_BASIC
        
    if allowed_attributes is None:
        allowed_attributes = ALLOWED_ATTRIBUTES
        
    # First pass: clean with bleach
    cleaned = bleach.clean(
        content,
        tags=allowed_tags,
        attributes=allowed_attributes,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
        strip_comments=strip_comments
    )
    
    # Second pass: additional security checks
    cleaned = _remove_javascript_handlers(cleaned)
    cleaned = _remove_data_attributes(cleaned)
    
    return cleaned


def sanitize_user_review(review_content: str) -> str:
    """
    Sanitize user review content with basic formatting allowed.
    
    Args:
        review_content: User review HTML content
        
    Returns:
        Sanitized review content
    """
    return sanitize_html(
        review_content,
        allowed_tags=ALLOWED_TAGS_BASIC,
        allowed_attributes={'*': ['class']},
    )


def sanitize_product_description(description: str) -> str:
    """
    Sanitize product description with rich formatting allowed.
    
    Args:
        description: Product description HTML content
        
    Returns:
        Sanitized product description
    """
    return sanitize_html(
        description,
        allowed_tags=ALLOWED_TAGS_RICH,
        allowed_attributes=ALLOWED_ATTRIBUTES,
    )


def sanitize_user_message(message_content: str) -> str:
    """
    Sanitize user message content with minimal formatting.
    
    Args:
        message_content: User message HTML content
        
    Returns:
        Sanitized message content
    """
    return sanitize_html(
        message_content,
        allowed_tags={'p', 'br', 'strong', 'em'},
        allowed_attributes={},
    )


def sanitize_search_query(query: str) -> str:
    """
    Sanitize search query to prevent XSS and injection attacks.
    
    Args:
        query: Search query string
        
    Returns:
        Sanitized search query
    """
    if not query:
        return ""
        
    # Remove all HTML tags
    query = bleach.clean(query, tags=[], strip=True)
    
    # Remove potentially dangerous characters
    query = re.sub(r'[<>"\']', '', query)
    
    # Limit length
    query = query[:200]
    
    return query.strip()


def _remove_javascript_handlers(content: str) -> str:
    """Remove JavaScript event handlers from HTML content."""
    # Pattern to match JavaScript event handlers
    js_handler_pattern = re.compile(
        r'\s*on\w+\s*=\s*["\'][^"\']*["\']',
        re.IGNORECASE
    )
    return js_handler_pattern.sub('', content)


def _remove_data_attributes(content: str) -> str:
    """Remove data-* attributes that could be used for XSS."""
    data_attr_pattern = re.compile(
        r'\s*data-[^=]*\s*=\s*["\'][^"\']*["\']',
        re.IGNORECASE
    )
    return data_attr_pattern.sub('', content)


def validate_url(url: str) -> bool:
    """
    Validate URL for safety.
    
    Args:
        url: URL to validate
        
    Returns:
        True if URL is safe, False otherwise
    """
    if not url:
        return False
        
    # Check for allowed protocols
    url_lower = url.lower()
    allowed_schemes = ['http://', 'https://', 'mailto:']
    
    if not any(url_lower.startswith(scheme) for scheme in allowed_schemes):
        return False
        
    # Check for JavaScript URLs
    if 'javascript:' in url_lower:
        return False
        
    # Check for data URLs
    if 'data:' in url_lower:
        return False
        
    return True


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal attacks.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    if not filename:
        return "untitled"
        
    # Remove directory traversal attempts
    filename = filename.replace('..', '')
    filename = filename.replace('/', '')
    filename = filename.replace('\\', '')
    
    # Remove potentially dangerous characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    # Limit length
    filename = filename[:100]
    
    return filename.strip()


class ContentSanitizer:
    """
    Content sanitizer class for more complex sanitization needs.
    """
    
    def __init__(self, allowed_tags: Optional[set] = None):
        self.allowed_tags = allowed_tags or ALLOWED_TAGS_BASIC
        
    def sanitize(self, content: str) -> str:
        """Sanitize content using instance configuration."""
        return sanitize_html(content, allowed_tags=self.allowed_tags)
        
    def sanitize_batch(self, content_list: List[str]) -> List[str]:
        """Sanitize a batch of content strings."""
        return [self.sanitize(content) for content in content_list]


# Django form field sanitization helpers
def sanitize_form_data(data: Dict[str, Any], field_sanitizers: Dict[str, callable]) -> Dict[str, Any]:
    """
    Sanitize form data based on field-specific sanitizers.
    
    Args:
        data: Form data dictionary
        field_sanitizers: Dict mapping field names to sanitizer functions
        
    Returns:
        Sanitized form data
    """
    sanitized_data = {}
    
    for field_name, value in data.items():
        if field_name in field_sanitizers and value:
            sanitized_data[field_name] = field_sanitizers[field_name](str(value))
        else:
            # Default: escape HTML entities for safety
            sanitized_data[field_name] = escape(str(value)) if value else value
            
    return sanitized_data


# Content Security Policy helpers
def get_csp_nonce() -> str:
    """Generate a random nonce for CSP."""
    import secrets
    return secrets.token_urlsafe(32)


def validate_image_content(file_content: bytes) -> bool:
    """
    Validate that uploaded file content is actually an image.
    
    Args:
        file_content: File content bytes
        
    Returns:
        True if content appears to be a valid image
    """
    # Check for image magic bytes
    image_signatures = [
        b'\x89PNG\r\n\x1a\n',  # PNG
        b'\xff\xd8\xff',       # JPEG
        b'GIF87a',             # GIF87a
        b'GIF89a',             # GIF89a
        b'RIFF',               # WEBP (partial signature)
    ]
    
    return any(file_content.startswith(sig) for sig in image_signatures)


# Configuration for different content types
CONTENT_SANITIZERS = {
    'review': sanitize_user_review,
    'message': sanitize_user_message,
    'product_description': sanitize_product_description,
    'search_query': sanitize_search_query,
}


def get_sanitizer(content_type: str) -> callable:
    """Get appropriate sanitizer for content type."""
    return CONTENT_SANITIZERS.get(content_type, sanitize_html)
