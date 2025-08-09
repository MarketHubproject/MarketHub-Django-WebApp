from django.db import models
from django.contrib.auth.models import User
# Import models from homepage app to avoid conflicts
from homepage.models import Product, Favorite, Review, ProductImage


class ProductStatus(models.TextChoices):
    AVAILABLE = 'available', 'Available'
    RESERVED = 'reserved', 'Reserved'
    SOLD = 'sold', 'Sold'
    INACTIVE = 'inactive', 'Inactive'

# Note: All main models (Product, Favorite, Review, and ProductImage) are imported from homepage app to avoid conflicts
# ProductStatus is defined here as it's specific to the products app functionality
