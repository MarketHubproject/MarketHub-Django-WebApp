# API Reference 📚

This document provides comprehensive documentation for all API endpoints used by MarketHub Mobile application.

## Base URLs

| Environment | Base URL | Description |
|-------------|----------|-------------|
| Development | `http://10.0.2.2:8000/api` | Local development server |
| Staging | `https://staging-api.markethub.com/api` | Staging environment |
| Production | `https://api.markethub.com/api` | Production environment |

## Authentication

All authenticated endpoints require a token in the Authorization header:

```http
Authorization: Token <your-token-here>
```

## Core API Endpoints

### Authentication

#### POST `/auth/login/`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "abcd1234567890",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/auth/register/`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "token": "abcd1234567890",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/auth/logout/`
Logout current user (invalidate token).

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### Products

#### GET `/products/`
Get paginated list of products.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `category` (optional): Filter by category slug
- `search` (optional): Search query string

**Response:**
```json
{
  "count": 100,
  "next": "http://api.example.com/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "iPhone 13",
      "price": 12999,
      "image": "https://example.com/image.jpg",
      "category": "Electronics",
      "description": "Latest iPhone with amazing features",
      "stock": 15,
      "rating": 4.5,
      "location": {
        "city": "Johannesburg",
        "province": "Gauteng",
        "area": "Sandton"
      },
      "seller": {
        "id": 1,
        "name": "TechHub SA",
        "email": "sales@techhub.co.za"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### GET `/products/{id}/`
Get single product details.

**Response:**
```json
{
  "id": 1,
  "name": "iPhone 13",
  "price": 12999,
  "image": "https://example.com/image.jpg",
  "category": "Electronics",
  "description": "Latest iPhone with amazing features",
  "stock": 15,
  "rating": 4.5,
  "location": {
    "city": "Johannesburg",
    "province": "Gauteng",
    "area": "Sandton"
  },
  "seller": {
    "id": 1,
    "name": "TechHub SA",
    "email": "sales@techhub.co.za"
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### GET `/products/featured/`
Get featured products.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "iPhone 13",
      "price": 12999,
      "image": "https://example.com/image.jpg",
      "category": "Electronics"
    }
  ]
}
```

### Categories

#### GET `/categories/`
Get all product categories.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics"
    }
  ]
}
```

### Cart

#### GET `/cart/`
Get current user's cart.

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "product": {
        "id": 1,
        "name": "iPhone 13",
        "price": 12999,
        "image": "https://example.com/image.jpg"
      },
      "quantity": 2,
      "subtotal": 25998
    }
  ],
  "total": 25998,
  "items_count": 2
}
```

#### POST `/cart/`
Add item to cart.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "product": 1,
  "quantity": 2
}
```

**Response:**
```json
{
  "id": 1,
  "product": 1,
  "quantity": 2,
  "subtotal": 25998
}
```

#### PATCH `/cart/{item_id}/`
Update cart item quantity.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "quantity": 3
}
```

#### DELETE `/cart/{item_id}/`
Remove item from cart.

**Headers:** `Authorization: Token <token>`

### Favorites

#### GET `/favorites/`
Get user's favorite products.

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "iPhone 13",
      "price": 12999,
      "image": "https://example.com/image.jpg",
      "category": "Electronics"
    }
  ]
}
```

#### POST `/favorites/`
Add product to favorites.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "product": 1
}
```

#### DELETE `/favorites/{product_id}/`
Remove product from favorites.

**Headers:** `Authorization: Token <token>`

## Rewards & Loyalty API

### GET `/rewards/balance/`
Get user's current points balance.

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "current_points": 1250,
  "pending_points": 0,
  "lifetime_points": 5000,
  "points_expiring_soon": 100,
  "expiry_date": "2024-12-31T23:59:59Z"
}
```

### GET `/rewards/loyalty-status/`
Get user's loyalty tier and status.

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "current_tier": "Gold",
  "tier_benefits": [
    "10% bonus points on all purchases",
    "Free shipping on orders over R500",
    "Priority customer support"
  ],
  "next_tier": "Platinum",
  "points_to_next_tier": 750,
  "tier_progress": 0.75
}
```

### GET `/rewards/earn-rules/`
Get current point earning rules.

**Response:**
```json
{
  "rules": [
    {
      "id": 1,
      "name": "Purchase Points",
      "description": "Earn 1 point for every R10 spent",
      "points_per_rand": 0.1,
      "is_active": true
    },
    {
      "id": 2,
      "name": "Referral Bonus",
      "description": "Earn 500 points for each successful referral",
      "points_amount": 500,
      "is_active": true
    }
  ]
}
```

### GET `/rewards/redemption-options/`
Get available point redemption options.

**Headers:** `Authorization: Token <token>`

**Query Parameters:**
- `tier` (optional): Filter by user tier

**Response:**
```json
{
  "options": [
    {
      "id": "voucher-10",
      "type": "discount_voucher",
      "name": "R10 Off Voucher",
      "description": "Get R10 off your next purchase",
      "points_required": 100,
      "value": 10,
      "min_tier": "Bronze",
      "is_available": true
    },
    {
      "id": "free-shipping",
      "type": "free_shipping",
      "name": "Free Shipping",
      "description": "Free shipping on next order",
      "points_required": 50,
      "min_tier": "Bronze",
      "is_available": true
    }
  ]
}
```

### POST `/rewards/redeem/`
Redeem points for a reward.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "redemption_option_id": "voucher-10",
  "points_to_redeem": 100
}
```

**Response:**
```json
{
  "voucher": {
    "id": "V123456789",
    "code": "SAVE10",
    "type": "discount_voucher",
    "value": 10,
    "expires_at": "2024-12-31T23:59:59Z"
  },
  "points_deducted": 100,
  "new_balance": 1150
}
```

### GET `/rewards/vouchers/`
Get user's vouchers.

**Headers:** `Authorization: Token <token>`

**Query Parameters:**
- `status` (optional): Filter by status (available, used, expired)

**Response:**
```json
{
  "vouchers": [
    {
      "id": "V123456789",
      "code": "SAVE10",
      "type": "discount_voucher",
      "value": 10,
      "status": "available",
      "expires_at": "2024-12-31T23:59:59Z",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST `/rewards/validate-voucher/`
Validate voucher for order.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "voucher_code": "SAVE10",
  "order_amount": 500,
  "order_items": [
    {
      "product_id": 1,
      "quantity": 1,
      "price": 500
    }
  ]
}
```

**Response:**
```json
{
  "is_valid": true,
  "discount_amount": 10,
  "final_amount": 490,
  "message": "Voucher applied successfully"
}
```

## Recommendations API

### GET `/api/v1/recommendations/`
Get personalized product recommendations.

**Headers:** `Authorization: Token <token>`

**Query Parameters:**
- `user_id` (optional): User ID for recommendations
- `context` (optional): Recommendation context (homepage, product_page, cart)
- `limit` (optional): Number of recommendations (default: 10)

**Response:**
```json
{
  "recommendations": [
    {
      "product_id": 1,
      "score": 0.95,
      "reason": "Based on your purchase history",
      "product": {
        "id": 1,
        "name": "iPhone 13",
        "price": 12999,
        "image": "https://example.com/image.jpg"
      }
    }
  ],
  "algorithm": "collaborative_filtering",
  "context": "homepage"
}
```

### POST `/api/v1/recommendations/events/`
Log recommendation events for analytics.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "product_id": 1,
  "event_type": "impression",
  "context": "homepage",
  "user_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "evt_12345"
}
```

## Orders

### GET `/orders/`
Get user's order history.

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "status": "delivered",
      "total": 25998,
      "items": [
        {
          "product": {
            "id": 1,
            "name": "iPhone 13"
          },
          "quantity": 2,
          "price": 12999
        }
      ],
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST `/orders/`
Create a new order.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "items": [
    {
      "product": 1,
      "quantity": 2
    }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "Johannesburg",
    "postal_code": "2000"
  }
}
```

## Profile

### GET `/profile/`
Get user profile.

**Headers:** `Authorization: Token <token>`

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "profile_picture": "https://example.com/avatar.jpg"
}
```

### PATCH `/profile/`
Update user profile.

**Headers:** `Authorization: Token <token>`

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+9876543210"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request data",
  "errors": {
    "email": ["This field is required."]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error occurred."
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Read operations**: 100 requests per minute
- **Write operations**: 30 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (starts from 1)
- `page_size`: Number of items per page (default: 20, max: 100)

Response includes pagination metadata:

```json
{
  "count": 500,
  "next": "https://api.example.com/products/?page=3",
  "previous": "https://api.example.com/products/?page=1",
  "results": [...]
}
```

## Versioning

The API uses URL versioning. Current version is `v1`:

```
https://api.markethub.com/api/v1/
```

Version headers are also supported:

```http
Accept: application/vnd.markethub.v1+json
```
