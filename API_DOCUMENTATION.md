# MarketHub API Documentation

## Overview
The MarketHub REST API provides programmatic access to products, user authentication, shopping cart functionality, and user management.

**Base URL:** `http://127.0.0.1:8000/api/`

## Authentication

### Token Authentication
Include the token in request headers:
```
Authorization: Token <your-token-here>
```

### Endpoints

#### Login
- **URL:** `POST /api/login/`
- **Description:** Authenticate user and receive token
- **Body:**
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Success Response:**
  ```json
  {
    "token": "a3ff38f8109c5dbc00bf...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "first_name": "",
      "last_name": ""
    },
    "message": "Login successful"
  }
  ```

#### Logout
- **URL:** `POST /api/logout/`
- **Description:** Invalidate user token
- **Authentication:** Required
- **Success Response:**
  ```json
  {
    "message": "Logout successful"
  }
  ```

## Product Endpoints

### List/Create Products
- **URL:** `GET/POST /api/products/`
- **Description:** List all products (with pagination) or create a new product

#### GET Products
- **Query Parameters:**
  - `category` - Filter by category
  - `search` - Search by product name
  - `page` - Page number for pagination
- **Success Response:**
  ```json
  {
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "name": "Canon Camera",
        "description": "High-quality DSLR camera",
        "price": "6500.00",
        "category": "electronics",
        "image": "/media/product_images/camera.jpg",
        "created_at": "2025-01-07T12:30:45.123Z"
      }
    ]
  }
  ```

#### POST Create Product
- **Authentication:** Required
- **Body:**
  ```json
  {
    "name": "New Product",
    "description": "Product description",
    "price": "99.99",
    "category": "electronics"
  }
  ```

### Product Detail
- **URL:** `GET/PUT/DELETE /api/products/<id>/`
- **Description:** Retrieve, update, or delete a specific product

#### GET Product Detail
- **Success Response:**
  ```json
  {
    "id": 1,
    "name": "Canon Camera",
    "description": "High-quality DSLR camera",
    "price": "6500.00",
    "category": "electronics",
    "image": "/media/product_images/camera.jpg",
    "created_at": "2025-01-07T12:30:45.123Z"
  }
  ```

### Product Categories
- **URL:** `GET /api/categories/`
- **Description:** List all available product categories
- **Success Response:**
  ```json
  {
    "categories": [
      {"value": "electronics", "label": "Electronics"},
      {"value": "clothing", "label": "Clothing"},
      {"value": "books", "label": "Books"},
      {"value": "furniture", "label": "Furniture"},
      {"value": "other", "label": "Other"}
    ]
  }
  ```

## Cart Endpoints

### View Cart
- **URL:** `GET /api/cart/`
- **Description:** Retrieve user's shopping cart
- **Authentication:** Required
- **Success Response:**
  ```json
  {
    "id": 1,
    "user": "admin",
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "name": "Canon Camera",
          "price": "6500.00",
          "image": "/media/product_images/camera.jpg"
        },
        "quantity": 2,
        "total_price": "13000.00"
      }
    ],
    "total_price": "23000.0",
    "created_at": "2025-01-07T10:15:30.456Z"
  }
  ```

### Add to Cart
- **URL:** `POST /api/cart/add/<product_id>/`
- **Description:** Add a product to user's cart
- **Authentication:** Required
- **Success Response:**
  ```json
  {
    "message": "Canon Camera added to cart successfully!",
    "item": {
      "id": 1,
      "product": {...},
      "quantity": 1,
      "total_price": "6500.00"
    }
  }
  ```

### Update Cart Item
- **URL:** `PUT/DELETE /api/cart/item/<item_id>/`
- **Description:** Update cart item quantity or remove item
- **Authentication:** Required

#### PUT Update Quantity
- **Body:**
  ```json
  {
    "quantity": 3
  }
  ```

#### DELETE Remove Item
- **Success Response:**
  ```json
  {
    "message": "Canon Camera removed from cart"
  }
  ```

## User Endpoints

### User Profile
- **URL:** `GET /api/profile/`
- **Description:** Get current user's profile information
- **Authentication:** Required
- **Success Response:**
  ```json
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "",
    "last_name": ""
  }
  ```

## Error Responses

### Authentication Errors
- **401 Unauthorized:**
  ```json
  {
    "error": "Invalid credentials"
  }
  ```

### Validation Errors
- **400 Bad Request:**
  ```json
  {
    "error": "Username and password required"
  }
  ```

### Not Found Errors
- **404 Not Found:**
  ```json
  {
    "error": "Product not found"
  }
  ```

## Rate Limiting
Currently, no rate limiting is implemented. In production, consider implementing rate limiting for security.

## Pagination
The API uses page-based pagination with the following parameters:
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 20, max: 100)

## Content Types
- **Request:** `application/json`
- **Response:** `application/json`

## CORS
For frontend applications, ensure CORS is properly configured in Django settings.

## Testing the API

### Using curl (Linux/Mac/WSL)
```bash
# Get all products
curl -X GET http://127.0.0.1:8000/api/products/

# Login and get token
curl -X POST http://127.0.0.1:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use token to access cart
curl -X GET http://127.0.0.1:8000/api/cart/ \
  -H "Authorization: Token your-token-here"
```

### Using Python requests
```python
import requests

# Login
response = requests.post('http://127.0.0.1:8000/api/login/', json={
    'username': 'admin',
    'password': 'admin123'
})
token = response.json()['token']

# Get cart
headers = {'Authorization': f'Token {token}'}
cart = requests.get('http://127.0.0.1:8000/api/cart/', headers=headers)
print(cart.json())
```

## API Browser
Visit `http://127.0.0.1:8000/api/auth/` to use Django REST Framework's browsable API interface for testing endpoints interactively.
