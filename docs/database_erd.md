# MarketHub Database Entity Relationship Diagram (ERD)

This document provides a comprehensive Entity Relationship Diagram for the MarketHub e-commerce platform database structure.

## 🗂️ **Database Overview**

MarketHub uses a relational database design optimized for e-commerce operations, featuring:

- **User Management**: Django's built-in user system with custom profiles
- **Product Catalog**: Hierarchical category system with detailed product information  
- **Shopping Cart**: Session-based and persistent cart functionality
- **Order Processing**: Complete order lifecycle management
- **Payment Integration**: Stripe payment processing with audit trails
- **Security**: Comprehensive audit logging and access controls

## 📊 **Entity Relationship Diagram**

```mermaid
erDiagram
    %% Core User Management
    User ||--o{ UserProfile : has
    User ||--o{ Cart : owns
    User ||--o{ Order : places
    User ||--o{ Payment : makes
    User ||--o{ ProductReview : writes
    User ||--o{ PaymentMethod : saves
    
    %% Product Catalog Structure
    Category ||--o{ Product : contains
    Product ||--o{ ProductImage : has
    Product ||--o{ CartItem : includes
    Product ||--o{ OrderItem : includes
    Product ||--o{ ProductReview : receives
    Product }o--|| Category : belongs_to
    
    %% Shopping Cart System
    Cart ||--o{ CartItem : contains
    CartItem }o--|| Product : references
    CartItem }o--|| User : belongs_to
    
    %% Order Management
    Order ||--o{ OrderItem : contains
    Order }o--|| User : belongs_to
    Order }o--o| Payment : has
    OrderItem }o--|| Product : references
    
    %% Payment Processing
    Payment }o--|| User : belongs_to
    Payment }o--|| Order : for
    PaymentMethod }o--|| User : belongs_to
    
    %% Student Rewards System  
    User ||--o{ StudentProfile : has
    StudentProfile ||--o{ RewardTransaction : earns
    StudentProfile }o--|| University : attends
    University ||--o{ StudentProfile : has_students
    
    %% Content Management
    User ||--o{ HeroSlide : creates
    User ||--o{ Promotion : creates
    Category ||--o{ Promotion : features
    
    %% Django Built-in Tables
    User ||--o{ Session : has
    User ||--o{ Token : has
    User }o--o{ Group : belongs_to
    Group ||--o{ Permission : has
    User }o--o{ Permission : has
    
    %% Audit and Logging
    User ||--o{ AxesAttempt : generates
    User ||--o{ LogEntry : creates

    %% Entity Definitions
    User {
        int id PK
        string username UK
        string email UK
        string first_name
        string last_name
        boolean is_active
        boolean is_staff
        boolean is_superuser
        datetime date_joined
        datetime last_login
        string password_hash
    }
    
    UserProfile {
        int id PK
        int user_id FK
        string phone
        string address_line1
        string address_line2
        string city
        string state
        string postal_code
        string country
        date date_of_birth
        string profile_picture
        datetime created_at
        datetime updated_at
    }
    
    Category {
        int id PK
        string name UK
        string slug UK
        text description
        string image
        int parent_id FK
        boolean is_active
        int sort_order
        datetime created_at
        datetime updated_at
    }
    
    Product {
        int id PK
        string name
        string slug UK
        text description
        decimal price
        int category_id FK
        string sku UK
        int stock_quantity
        string status
        string image
        decimal weight
        string dimensions
        json metadata
        boolean is_featured
        boolean is_digital
        datetime created_at
        datetime updated_at
    }
    
    ProductImage {
        int id PK
        int product_id FK
        string image
        string alt_text
        int sort_order
        boolean is_primary
        datetime created_at
    }
    
    ProductReview {
        int id PK
        int product_id FK
        int user_id FK
        int rating
        text review_text
        boolean is_verified_purchase
        boolean is_approved
        datetime created_at
        datetime updated_at
    }
    
    Cart {
        int id PK
        int user_id FK
        string session_key
        datetime created_at
        datetime updated_at
    }
    
    CartItem {
        int id PK
        int cart_id FK
        int product_id FK
        int quantity
        decimal unit_price
        json product_options
        datetime created_at
        datetime updated_at
    }
    
    Order {
        int id PK
        string order_number UK
        int user_id FK
        string status
        decimal subtotal
        decimal tax_amount
        decimal shipping_cost
        decimal discount_amount
        decimal total_amount
        string shipping_address
        string billing_address
        string tracking_number
        json metadata
        datetime created_at
        datetime updated_at
        datetime shipped_at
        datetime delivered_at
    }
    
    OrderItem {
        int id PK
        int order_id FK
        int product_id FK
        string product_name
        string product_sku
        int quantity
        decimal unit_price
        decimal total_price
        json product_snapshot
        datetime created_at
    }
    
    Payment {
        int id PK
        int user_id FK
        int order_id FK
        string payment_method
        string status
        decimal amount
        string currency
        string stripe_payment_intent_id UK
        string stripe_customer_id
        json payment_details
        boolean is_refunded
        decimal refund_amount
        datetime created_at
        datetime updated_at
        datetime processed_at
    }
    
    PaymentMethod {
        int id PK
        int user_id FK
        string payment_type
        string card_brand
        string last_four
        string stripe_payment_method_id UK
        boolean is_default
        boolean is_active
        datetime expires_at
        datetime created_at
        datetime updated_at
    }
    
    HeroSlide {
        int id PK
        string title
        text description
        string image
        string link_url
        string button_text
        boolean is_active
        int sort_order
        datetime created_at
        datetime updated_at
    }
    
    Promotion {
        int id PK
        string name
        text description
        string discount_type
        decimal discount_value
        decimal minimum_amount
        int usage_limit
        int used_count
        string code UK
        datetime start_date
        datetime end_date
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    University {
        int id PK
        string name UK
        string domain UK
        string country
        string logo
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    StudentProfile {
        int id PK
        int user_id FK
        int university_id FK
        string student_id
        string major
        int graduation_year
        boolean is_verified
        decimal reward_balance
        datetime created_at
        datetime updated_at
    }
    
    RewardTransaction {
        int id PK
        int student_profile_id FK
        string transaction_type
        decimal amount
        string description
        string reference_id
        datetime created_at
    }
    
    Session {
        string session_key PK
        text session_data
        datetime expire_date
    }
    
    Token {
        string key PK
        int user_id FK
        datetime created
    }
    
    Group {
        int id PK
        string name UK
    }
    
    Permission {
        int id PK
        string name
        string content_type
        string codename
    }
    
    AxesAttempt {
        int id PK
        int user_id FK
        string ip_address
        string user_agent
        int failures_since_start
        datetime attempt_time
        boolean locked_out
    }
    
    LogEntry {
        int id PK
        int user_id FK
        string content_type
        string object_id
        string object_repr
        string action_flag
        text change_message
        datetime action_time
    }
```

## 🔗 **Relationship Details**

### **User Management Relationships**

1. **User ↔ UserProfile** (One-to-One)
   - Each user has exactly one profile with extended information
   - Cascading delete: Profile deleted when user is deleted

2. **User ↔ Cart** (One-to-Many)
   - Users can have multiple carts (for different sessions)
   - Anonymous users identified by session key

3. **User ↔ Order** (One-to-Many)
   - Users can place multiple orders
   - Orders retain user information even if user is deactivated

### **Product Catalog Relationships**

4. **Category ↔ Product** (One-to-Many)
   - Products belong to exactly one category
   - Categories can be hierarchical (self-referential)
   - Category changes affect product organization

5. **Product ↔ ProductImage** (One-to-Many)
   - Products can have multiple images
   - One primary image per product
   - Images sorted by display order

6. **Product ↔ ProductReview** (One-to-Many)
   - Products can have multiple reviews
   - Reviews linked to verified purchases
   - Moderation system for review approval

### **Shopping Cart Relationships**

7. **Cart ↔ CartItem** (One-to-Many)
   - Carts contain multiple items
   - Items store snapshot of product details
   - Quantity and pricing tracked per item

8. **CartItem ↔ Product** (Many-to-One)
   - Cart items reference current product
   - Product changes don't affect existing cart items

### **Order Processing Relationships**

9. **Order ↔ OrderItem** (One-to-Many)
   - Orders contain multiple line items
   - Items store complete product snapshot
   - Immutable record for audit purposes

10. **Order ↔ Payment** (One-to-One)
    - Each order has exactly one payment
    - Payment status determines order fulfillment

### **Payment System Relationships**

11. **User ↔ PaymentMethod** (One-to-Many)
    - Users can save multiple payment methods
    - Tokenized storage via Stripe
    - One default payment method per user

12. **Payment ↔ Stripe Integration**
    - Payment Intent ID for idempotency
    - Customer ID for recurring payments
    - Webhook event tracking

## 📋 **Database Indexes**

### **Performance Optimization Indexes**

```sql
-- Product search and filtering
CREATE INDEX idx_product_category_price ON homepage_product(category_id, price);
CREATE INDEX idx_product_status_featured ON homepage_product(status, is_featured);
CREATE INDEX idx_product_created_desc ON homepage_product(created_at DESC);

-- Full-text search
CREATE INDEX idx_product_search ON homepage_product 
USING GIN(to_tsvector('english', name || ' ' || description));

-- Cart and order performance
CREATE INDEX idx_cartitem_cart_product ON homepage_cartitem(cart_id, product_id);
CREATE INDEX idx_order_user_status ON homepage_order(user_id, status);
CREATE INDEX idx_order_created_desc ON homepage_order(created_at DESC);

-- Payment tracking
CREATE INDEX idx_payment_stripe_intent ON homepage_payment(stripe_payment_intent_id);
CREATE INDEX idx_payment_user_status ON homepage_payment(user_id, status);

-- User lookup optimization
CREATE INDEX idx_user_email_active ON auth_user(email, is_active);
CREATE INDEX idx_user_username_active ON auth_user(username, is_active);

-- Security and audit
CREATE INDEX idx_axes_attempt_ip_time ON axes_axesattempt(ip_address, attempt_time);
CREATE INDEX idx_session_expire_date ON django_session(expire_date);
```

## 🔒 **Data Constraints and Validation**

### **Database Constraints**

```sql
-- Price validation
ALTER TABLE homepage_product 
ADD CONSTRAINT chk_product_price_positive 
CHECK (price >= 0);

-- Stock quantity validation  
ALTER TABLE homepage_product 
ADD CONSTRAINT chk_product_stock_non_negative 
CHECK (stock_quantity >= 0);

-- Cart item quantity validation
ALTER TABLE homepage_cartitem 
ADD CONSTRAINT chk_cartitem_quantity_positive 
CHECK (quantity > 0);

-- Order total validation
ALTER TABLE homepage_order 
ADD CONSTRAINT chk_order_total_non_negative 
CHECK (total_amount >= 0);

-- Payment amount validation
ALTER TABLE homepage_payment 
ADD CONSTRAINT chk_payment_amount_positive 
CHECK (amount > 0);

-- Review rating validation
ALTER TABLE homepage_productreview 
ADD CONSTRAINT chk_review_rating_range 
CHECK (rating >= 1 AND rating <= 5);
```

## 🔄 **Data Migration Considerations**

### **Schema Evolution Strategy**

1. **Backward Compatible Changes**
   - Adding nullable columns
   - Adding new tables
   - Adding indexes
   - Extending varchar lengths

2. **Breaking Changes** (Require Migration)
   - Changing column types
   - Adding NOT NULL constraints
   - Dropping columns/tables
   - Modifying primary/foreign keys

3. **Migration Best Practices**
   - Backup before major changes
   - Test migrations on staging
   - Use reversible migrations
   - Monitor performance impact

## 📊 **Data Volume Estimates**

### **Production Scaling Projections**

| Table | Initial | 1 Year | 5 Years |
|-------|---------|---------|----------|
| User | 1K | 10K | 100K |
| Product | 500 | 5K | 50K |
| Order | 100 | 5K | 100K |
| CartItem | 1K | 20K | 500K |
| Payment | 100 | 5K | 100K |
| ProductReview | 50 | 2K | 25K |

### **Storage Requirements**

- **Initial**: ~100 MB
- **1 Year**: ~1 GB  
- **5 Years**: ~10 GB (without media files)
- **Media Files**: 10-100x larger than database

## 🛠️ **Database Tools and Utilities**

### **Management Commands**

```bash
# Generate ERD automatically
python manage.py graph_models -a -g -o markethub_erd.png

# Database statistics
python manage.py dbshell -c "\dt+ homepage_*"

# Index usage analysis
python manage.py dbshell -c "SELECT * FROM pg_stat_user_indexes;"

# Data integrity checks
python manage.py check --database default
```

### **Monitoring Queries**

```sql
-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Index effectiveness
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

---

## 🔄 **Database Evolution Timeline**

### **Phase 1: Core E-commerce** ✅
- User management
- Product catalog
- Shopping cart
- Basic orders

### **Phase 2: Enhanced Features** ✅  
- Payment processing
- User reviews
- Student rewards
- Content management

### **Phase 3: Future Enhancements** 🔄
- Advanced analytics
- Recommendation engine
- Multi-vendor support
- Internationalization

---

*This ERD represents the current state of the MarketHub database as of v1.0.0. For the most up-to-date schema, generate the ERD using the Django management commands.*
