# Backend Migration Guide 🔄

This document provides a comprehensive migration guide for backend teams to implement the new endpoints and schemas required for MarketHub Mobile application's advanced features.

## Overview

This migration guide covers the implementation of:
- **Rewards & Loyalty System** endpoints
- **Chat Support Integration** (Stream Chat token generation)
- **Analytics Events** endpoints
- **Push Notifications** integration
- **Social Sharing & Deep Links** support
- **Recommendations API** endpoints

## Database Schema Changes

### 1. Rewards & Loyalty Tables

#### Create `loyalty_tiers` table
```sql
CREATE TABLE loyalty_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    min_points INTEGER NOT NULL DEFAULT 0,
    benefits TEXT[], -- Array of benefit descriptions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO loyalty_tiers (name, min_points, benefits) VALUES
('Bronze', 0, ARRAY['Basic vouchers', 'Standard support']),
('Silver', 1000, ARRAY['Enhanced redemption rates', 'Priority support']),
('Gold', 5000, ARRAY['Exclusive offers', 'Priority support', 'Free shipping']),
('Platinum', 15000, ARRAY['Premium perks', 'Early access', 'Personal shopper']);
```

#### Create `user_points` table
```sql
CREATE TABLE user_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_points INTEGER NOT NULL DEFAULT 0,
    pending_points INTEGER NOT NULL DEFAULT 0,
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    points_expiring_soon INTEGER NOT NULL DEFAULT 0,
    expiry_date DATE,
    tier_id INTEGER REFERENCES loyalty_tiers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

#### Create `points_transactions` table
```sql
CREATE TABLE points_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL, -- Positive for earned, negative for spent
    transaction_type VARCHAR(20) NOT NULL, -- 'earned', 'redeemed', 'expired'
    description TEXT,
    order_id INTEGER REFERENCES orders(id),
    voucher_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Create `earning_rules` table
```sql
CREATE TABLE earning_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    points_per_rand DECIMAL(5,2) DEFAULT 0,
    points_amount INTEGER DEFAULT 0,
    rule_type VARCHAR(20) NOT NULL, -- 'purchase', 'referral', 'review', 'signup'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO earning_rules (name, description, points_per_rand, rule_type) VALUES
('Purchase Points', 'Earn 1 point for every R10 spent', 0.1, 'purchase'),
('Review Bonus', 'Earn 50 points for each product review', 0, 'review'),
('Referral Bonus', 'Earn 500 points for each successful referral', 0, 'referral');

UPDATE earning_rules SET points_amount = 50 WHERE rule_type = 'review';
UPDATE earning_rules SET points_amount = 500 WHERE rule_type = 'referral';
```

#### Create `redemption_options` table
```sql
CREATE TABLE redemption_options (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'discount_voucher', 'free_shipping', 'category_discount'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    value DECIMAL(10,2), -- Discount amount or percentage
    min_tier_id INTEGER REFERENCES loyalty_tiers(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO redemption_options VALUES
('voucher-10', 'discount_voucher', 'R10 Off Voucher', 'Get R10 off your next purchase', 100, 10.00, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('voucher-25', 'discount_voucher', 'R25 Off Voucher', 'Get R25 off your next purchase', 250, 25.00, 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('free-shipping', 'free_shipping', 'Free Shipping', 'Free shipping on your next order', 50, 0, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

#### Create `user_vouchers` table
```sql
CREATE TABLE user_vouchers (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,
    value DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'used', 'expired'
    order_id INTEGER REFERENCES orders(id),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);
```

### 2. Analytics & Events Tables

#### Create `user_events` table
```sql
CREATE TABLE user_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    session_id VARCHAR(100),
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_events_user_id (user_id),
    INDEX idx_user_events_type (event_type),
    INDEX idx_user_events_created (created_at)
);
```

#### Create `recommendation_events` table
```sql
CREATE TABLE recommendation_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    event_type VARCHAR(20) NOT NULL, -- 'impression', 'click', 'purchase'
    context VARCHAR(50), -- 'homepage', 'product_page', 'search', 'cart'
    algorithm VARCHAR(50),
    score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rec_events_user (user_id),
    INDEX idx_rec_events_product (product_id),
    INDEX idx_rec_events_type (event_type)
);
```

### 3. Chat Support Integration

#### Add Stream Chat fields to users table
```sql
ALTER TABLE users ADD COLUMN stream_chat_token VARCHAR(255);
ALTER TABLE users ADD COLUMN stream_chat_user_id VARCHAR(100);
ALTER TABLE users ADD COLUMN last_token_refresh TIMESTAMP;
```

#### Create `support_tickets` table
```sql
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_agent_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
```

### 4. Push Notifications

#### Create `user_devices` table
```sql
CREATE TABLE user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL,
    platform VARCHAR(10) NOT NULL, -- 'ios', 'android'
    device_info JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_token)
);
```

#### Create `push_notifications` table
```sql
CREATE TABLE push_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20), -- 'transactional', 'marketing', 'operational'
    payload JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## New API Endpoints

### 1. Rewards & Loyalty Endpoints

#### Points Balance
```python
# Django REST Framework example
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_points_balance(request):
    """Get user's current points balance"""
    try:
        user_points = UserPoints.objects.get(user=request.user)
        return Response({
            'current_points': user_points.current_points,
            'pending_points': user_points.pending_points,
            'lifetime_points': user_points.lifetime_points,
            'points_expiring_soon': user_points.points_expiring_soon,
            'expiry_date': user_points.expiry_date
        })
    except UserPoints.DoesNotExist:
        return Response({
            'current_points': 0,
            'pending_points': 0,
            'lifetime_points': 0,
            'points_expiring_soon': 0,
            'expiry_date': None
        })
```

#### Loyalty Status
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_loyalty_status(request):
    """Get user's loyalty tier and status"""
    try:
        user_points = UserPoints.objects.select_related('tier').get(user=request.user)
        current_tier = user_points.tier
        next_tier = LoyaltyTier.objects.filter(
            min_points__gt=user_points.current_points
        ).first()
        
        return Response({
            'current_tier': current_tier.name if current_tier else 'Bronze',
            'tier_benefits': current_tier.benefits if current_tier else [],
            'next_tier': next_tier.name if next_tier else None,
            'points_to_next_tier': max(0, next_tier.min_points - user_points.current_points) if next_tier else 0,
            'tier_progress': user_points.current_points / next_tier.min_points if next_tier else 1.0
        })
    except UserPoints.DoesNotExist:
        bronze_tier = LoyaltyTier.objects.filter(name='Bronze').first()
        silver_tier = LoyaltyTier.objects.filter(name='Silver').first()
        
        return Response({
            'current_tier': 'Bronze',
            'tier_benefits': bronze_tier.benefits if bronze_tier else [],
            'next_tier': 'Silver',
            'points_to_next_tier': silver_tier.min_points if silver_tier else 1000,
            'tier_progress': 0.0
        })
```

#### Redeem Points
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redeem_points(request):
    """Redeem points for a reward"""
    redemption_option_id = request.data.get('redemption_option_id')
    points_to_redeem = request.data.get('points_to_redeem')
    
    try:
        with transaction.atomic():
            user_points = UserPoints.objects.select_for_update().get(user=request.user)
            option = RedemptionOption.objects.get(id=redemption_option_id, is_active=True)
            
            if user_points.current_points < points_to_redeem:
                return Response({'error': 'Insufficient points'}, status=400)
            
            if points_to_redeem < option.points_required:
                return Response({'error': 'Points amount too low'}, status=400)
            
            # Create voucher
            voucher = UserVoucher.objects.create(
                id=f"V{uuid.uuid4().hex[:8].upper()}",
                user=request.user,
                code=generate_voucher_code(),
                type=option.type,
                value=option.value,
                expires_at=timezone.now() + timedelta(days=30)
            )
            
            # Deduct points
            user_points.current_points -= points_to_redeem
            user_points.save()
            
            # Record transaction
            PointsTransaction.objects.create(
                user=request.user,
                points=-points_to_redeem,
                transaction_type='redeemed',
                description=f'Redeemed for {option.name}',
                voucher_id=voucher.id
            )
            
            return Response({
                'voucher': {
                    'id': voucher.id,
                    'code': voucher.code,
                    'type': voucher.type,
                    'value': voucher.value,
                    'expires_at': voucher.expires_at
                },
                'points_deducted': points_to_redeem,
                'new_balance': user_points.current_points
            })
            
    except RedemptionOption.DoesNotExist:
        return Response({'error': 'Invalid redemption option'}, status=400)
```

### 2. Stream Chat Integration

#### Generate Chat Token
```python
import jwt
from datetime import datetime, timedelta
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_stream_token(request):
    """Generate Stream Chat token for user"""
    user = request.user
    
    # Create Stream Chat user ID (if not exists)
    if not user.stream_chat_user_id:
        user.stream_chat_user_id = f"user_{user.id}"
        user.save()
    
    # Generate JWT token
    payload = {
        'user_id': user.stream_chat_user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    
    token = jwt.encode(
        payload,
        settings.STREAM_CHAT_SECRET,
        algorithm='HS256'
    )
    
    # Update last refresh time
    user.last_token_refresh = timezone.now()
    user.stream_chat_token = token
    user.save()
    
    return Response({
        'token': token,
        'user_id': user.stream_chat_user_id,
        'user_info': {
            'id': user.stream_chat_user_id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'image': user.profile_picture.url if hasattr(user, 'profile_picture') and user.profile_picture else None
        }
    })
```

### 3. Analytics & Events

#### Log User Events
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_user_event(request):
    """Log user behavior events"""
    event_type = request.data.get('event_type')
    event_data = request.data.get('event_data', {})
    session_id = request.data.get('session_id')
    
    UserEvent.objects.create(
        user=request.user,
        event_type=event_type,
        event_data=event_data,
        session_id=session_id,
        device_info=request.META.get('HTTP_USER_AGENT', ''),
        ip_address=get_client_ip(request)
    )
    
    return Response({'success': True})

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
```

#### Recommendation Events
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_recommendation_event(request):
    """Log recommendation interaction events"""
    product_id = request.data.get('product_id')
    event_type = request.data.get('event_type')  # impression, click, purchase
    context = request.data.get('context', 'unknown')
    
    RecommendationEvent.objects.create(
        user=request.user,
        product_id=product_id,
        event_type=event_type,
        context=context
    )
    
    return Response({'success': True, 'event_id': f"evt_{uuid.uuid4().hex[:8]}"})
```

### 4. Recommendations API

#### Get Recommendations
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """Get personalized product recommendations"""
    user_id = request.GET.get('user_id', request.user.id)
    context = request.GET.get('context', 'homepage')
    limit = int(request.GET.get('limit', 10))
    
    # Simple collaborative filtering example
    # In production, use more sophisticated algorithms
    
    # Get user's purchase history
    user_purchases = Order.objects.filter(
        user=request.user,
        status='delivered'
    ).values_list('items__product_id', flat=True)
    
    if not user_purchases:
        # For new users, recommend popular products
        recommendations = Product.objects.filter(
            is_active=True,
            stock__gt=0
        ).order_by('-rating', '-created_at')[:limit]
    else:
        # Find similar users based on purchase history
        similar_users = User.objects.filter(
            orders__items__product_id__in=user_purchases
        ).exclude(id=request.user.id).distinct()
        
        # Get products bought by similar users
        recommended_products = Product.objects.filter(
            orderitem__order__user__in=similar_users,
            is_active=True,
            stock__gt=0
        ).exclude(
            id__in=user_purchases
        ).order_by('-rating')[:limit]
        
        recommendations = recommended_products
    
    serialized_recommendations = []
    for product in recommendations:
        serialized_recommendations.append({
            'product_id': product.id,
            'score': 0.85,  # Mock score
            'reason': 'Based on your purchase history',
            'product': {
                'id': product.id,
                'name': product.name,
                'price': product.price,
                'image': product.image.url if product.image else None
            }
        })
    
    return Response({
        'recommendations': serialized_recommendations,
        'algorithm': 'collaborative_filtering',
        'context': context
    })
```

## Environment Configuration

### Environment Variables
Add these environment variables to your deployment:

```bash
# Stream Chat Configuration
STREAM_CHAT_API_KEY=your_stream_chat_api_key
STREAM_CHAT_SECRET=your_stream_chat_secret

# Firebase Configuration  
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key

# Push Notifications
FCM_SERVER_KEY=your_fcm_server_key
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id

# Analytics
GOOGLE_ANALYTICS_ID=your_ga_id
MIXPANEL_TOKEN=your_mixpanel_token
```

### Django Settings Updates

```python
# settings.py

# Stream Chat
STREAM_CHAT_API_KEY = os.getenv('STREAM_CHAT_API_KEY')
STREAM_CHAT_SECRET = os.getenv('STREAM_CHAT_SECRET')

# Firebase
FIREBASE_CONFIG = {
    'type': 'service_account',
    'project_id': os.getenv('FIREBASE_PROJECT_ID'),
    'client_email': os.getenv('FIREBASE_CLIENT_EMAIL'),
    'private_key': os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
}

# Celery for background tasks
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    # ... existing apps
    'rewards',
    'analytics',
    'chat_support',
    'notifications',
]
```

## URL Configuration

```python
# urls.py
from django.urls import path, include

urlpatterns = [
    # ... existing URLs
    
    # Rewards & Loyalty
    path('rewards/balance/', views.get_points_balance, name='points_balance'),
    path('rewards/loyalty-status/', views.get_loyalty_status, name='loyalty_status'),
    path('rewards/earn-rules/', views.get_earn_rules, name='earn_rules'),
    path('rewards/redemption-options/', views.get_redemption_options, name='redemption_options'),
    path('rewards/redeem/', views.redeem_points, name='redeem_points'),
    path('rewards/vouchers/', views.get_user_vouchers, name='user_vouchers'),
    path('rewards/validate-voucher/', views.validate_voucher, name='validate_voucher'),
    
    # Chat Support
    path('auth/stream-token/', views.get_stream_token, name='stream_token'),
    
    # Analytics
    path('analytics/events/', views.log_user_event, name='log_event'),
    path('api/v1/recommendations/', views.get_recommendations, name='recommendations'),
    path('api/v1/recommendations/events/', views.log_recommendation_event, name='rec_events'),
    
    # Notifications
    path('notifications/register-device/', views.register_device, name='register_device'),
]
```

## Background Tasks (Celery)

### Points Calculation Task
```python
# tasks.py
from celery import shared_task
from django.db import transaction

@shared_task
def calculate_order_points(order_id):
    """Calculate and award points for completed order"""
    try:
        order = Order.objects.get(id=order_id)
        if order.status != 'delivered':
            return
        
        # Get earning rule
        purchase_rule = EarningRule.objects.filter(
            rule_type='purchase',
            is_active=True
        ).first()
        
        if not purchase_rule:
            return
        
        points_earned = int(order.total * purchase_rule.points_per_rand)
        
        with transaction.atomic():
            user_points, created = UserPoints.objects.get_or_create(
                user=order.user,
                defaults={'current_points': 0, 'lifetime_points': 0}
            )
            
            user_points.current_points += points_earned
            user_points.lifetime_points += points_earned
            user_points.save()
            
            # Update tier if necessary
            update_user_tier.delay(order.user.id)
            
            # Record transaction
            PointsTransaction.objects.create(
                user=order.user,
                points=points_earned,
                transaction_type='earned',
                description=f'Points earned from order #{order.id}',
                order_id=order.id
            )
            
    except Order.DoesNotExist:
        pass

@shared_task
def update_user_tier(user_id):
    """Update user's loyalty tier based on current points"""
    try:
        user_points = UserPoints.objects.get(user_id=user_id)
        appropriate_tier = LoyaltyTier.objects.filter(
            min_points__lte=user_points.current_points
        ).order_by('-min_points').first()
        
        if appropriate_tier and user_points.tier != appropriate_tier:
            user_points.tier = appropriate_tier
            user_points.save()
            
            # Send tier upgrade notification
            send_tier_upgrade_notification.delay(user_id, appropriate_tier.name)
            
    except UserPoints.DoesNotExist:
        pass
```

## Testing

### API Tests Example
```python
# tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User

class RewardsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_points_balance(self):
        response = self.client.get('/rewards/balance/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['current_points'], 0)
    
    def test_redeem_points(self):
        # Create user points
        UserPoints.objects.create(
            user=self.user,
            current_points=500
        )
        
        response = self.client.post('/rewards/redeem/', {
            'redemption_option_id': 'voucher-10',
            'points_to_redeem': 100
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('voucher', response.data)
```

## Deployment Checklist

- [ ] Run database migrations
- [ ] Update environment variables
- [ ] Deploy new code with API endpoints
- [ ] Set up Celery workers for background tasks
- [ ] Configure Redis for caching and task queue
- [ ] Test Stream Chat integration
- [ ] Verify Firebase Analytics connection
- [ ] Test push notifications
- [ ] Monitor API performance
- [ ] Set up logging and monitoring

## Monitoring & Logging

### Key Metrics to Track
- API response times
- Points redemption rates
- Chat support usage
- Push notification delivery rates
- Recommendation click-through rates
- Database query performance

### Logging Setup
```python
# logging.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'markethub_api.log',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'rewards': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'chat_support': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

This migration guide provides a comprehensive roadmap for implementing the backend changes required for MarketHub Mobile's advanced features. Follow the steps sequentially and test thoroughly in staging before production deployment.
