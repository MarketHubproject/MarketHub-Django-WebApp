# Contributing to MarketHub

🎉 Thank you for your interest in contributing to MarketHub! This document provides comprehensive guidelines for developers who want to contribute to this premium Django e-commerce platform.

## 🌟 **Table of Contents**

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Pull Request Process](#pull-request-process)
- [Security Guidelines](#security-guidelines)
- [Documentation](#documentation)

## 🚀 **Getting Started**

### **Prerequisites**

Before contributing to MarketHub, ensure you have:

- **Python 3.9+** installed
- **Git** for version control
- **PostgreSQL** (for production-like testing)
- **Node.js** (for frontend tooling)
- **Redis** (for caching and session management)

### **Fork and Clone**

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/MarketHub-Django-WebApp.git
   cd MarketHub-Django-WebApp
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/MarketHub-Django-WebApp.git
   ```

## 🛠️ **Development Environment**

### **Setup Virtual Environment**

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### **Install Dependencies**

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

Create `requirements-dev.txt` if it doesn't exist:
```txt
# Development and testing dependencies
pytest==8.3.4
pytest-django==4.8.0
pytest-cov==6.0.0
pytest-benchmark==4.0.0
pytest-mock==3.14.0
pytest-xdist==3.6.1
factory-boy==3.4.0
faker==33.1.0

# Code formatting and linting
black==24.3.0
isort==5.13.2
flake8==7.0.0
flake8-django==1.4.0
flake8-docstrings==1.7.0
mypy==1.11.2
django-stubs==5.1.0

# Security tools
bandit==1.7.5
safety==3.0.1

# Pre-commit hooks
pre-commit==3.8.0

# Documentation
sphinx==7.4.7
sphinx-rtd-theme==2.0.0

# Development utilities
django-debug-toolbar==4.4.6
django-extensions==3.2.3
ipython==8.29.0
```

### **Environment Configuration**

```bash
# Copy environment template
cp .env.example .env.dev

# Edit development environment
nano .env.dev
```

### **Database Setup**

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data
python seed_data.py
```

### **Verify Installation**

```bash
# Run development server
python manage.py runserver

# Run tests
pytest

# Check code style
black --check .
isort --check-only .
flake8 .
```

## 📏 **Code Standards**

### **Python Style Guide**

MarketHub follows **PEP 8** with these specific configurations:

#### **Black Configuration** (`.pyproject.toml`)
```toml
[tool.black]
line-length = 88
target-version = ['py39']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
  | migrations
)/
'''
```

#### **isort Configuration**
```toml
[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 88
known_django = "django"
known_first_party = "markethub,homepage,products,profiles,student_rewards"
sections = ["FUTURE","STDLIB","DJANGO","THIRDPARTY","FIRSTPARTY","LOCALFOLDER"]
```

#### **Flake8 Configuration** (`.flake8`)
```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503, E501
exclude = 
    .git,
    __pycache__,
    venv,
    .venv,
    migrations,
    .pytest_cache,
    .mypy_cache
per-file-ignores =
    __init__.py:F401
    */settings/*.py:E501
    */tests/*.py:S101
```

### **Django Best Practices**

#### **Model Guidelines**
```python
class Product(models.Model):
    """Product model with comprehensive fields and validation."""
    
    name = models.CharField(
        max_length=200,
        help_text="Product name (max 200 characters)"
    )
    description = models.TextField(
        help_text="Detailed product description"
    )
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'price']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.price}"
    
    def clean(self):
        """Custom validation logic."""
        if self.price and self.price <= 0:
            raise ValidationError("Price must be positive")
```

#### **View Guidelines**
```python
class ProductListAPIView(ListCreateAPIView):
    """API view for listing and creating products."""
    
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'price']
    
    def get_queryset(self):
        """Return optimized queryset with prefetched relations."""
        return Product.objects.select_related('category').prefetch_related('images')
```

#### **URL Configuration**
```python
# Use descriptive URL names
urlpatterns = [
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('cart/', CartView.as_view(), name='cart'),
    path('cart/add/', AddToCartView.as_view(), name='cart-add'),
]
```

## 🧪 **Testing Guidelines**

### **Test Structure**

```
tests/
├── __init__.py
├── conftest.py          # Pytest configuration and fixtures
├── factories.py         # Factory Boy factories
├── test_models.py       # Model tests
├── test_views.py        # View and API tests
├── test_forms.py        # Form validation tests
├── test_utils.py        # Utility function tests
├── test_integration.py  # Integration tests
├── test_performance.py  # Performance benchmarks
└── test_security.py     # Security-specific tests
```

### **Writing Tests**

#### **Model Tests**
```python
import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from homepage.models import Product
from tests.factories import ProductFactory


class TestProductModel:
    """Test suite for Product model."""
    
    @pytest.mark.django_db
    def test_product_creation(self):
        """Test basic product creation."""
        product = ProductFactory(name="Test Product", price=Decimal('99.99'))
        assert product.name == "Test Product"
        assert product.price == Decimal('99.99')
    
    @pytest.mark.django_db
    def test_price_validation(self):
        """Test price validation constraints."""
        with pytest.raises(ValidationError):
            product = ProductFactory(price=Decimal('-10.00'))
            product.full_clean()
    
    @pytest.mark.django_db
    def test_string_representation(self):
        """Test model string representation."""
        product = ProductFactory(name="Sample Product", price=Decimal('50.00'))
        assert str(product) == "Sample Product - $50.00"
```

#### **API Tests**
```python
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from tests.factories import UserFactory, ProductFactory


class TestProductAPI:
    """Test suite for Product API endpoints."""
    
    @pytest.fixture
    def api_client(self):
        return APIClient()
    
    @pytest.fixture
    def user(self):
        return UserFactory()
    
    @pytest.mark.django_db
    def test_product_list_authenticated(self, api_client, user):
        """Test product list for authenticated users."""
        ProductFactory.create_batch(3)
        api_client.force_authenticate(user=user)
        
        response = api_client.get('/api/products/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3
    
    @pytest.mark.django_db
    def test_product_creation_requires_permission(self, api_client):
        """Test product creation permission requirements."""
        product_data = {
            'name': 'New Product',
            'price': '99.99',
            'description': 'Test description'
        }
        
        response = api_client.post('/api/products/', product_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### **Test Fixtures and Factories**

#### **conftest.py**
```python
import pytest
from django.test import Client
from django.contrib.auth.models import User
from rest_framework.test import APIClient


@pytest.fixture
def client():
    """Django test client."""
    return Client()


@pytest.fixture
def api_client():
    """DRF API test client."""
    return APIClient()


@pytest.fixture
def admin_user():
    """Admin user fixture."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@markethub.com',
        password='adminpass123'
    )


@pytest.fixture
def regular_user():
    """Regular user fixture."""
    return User.objects.create_user(
        username='testuser',
        email='test@markethub.com',
        password='testpass123'
    )
```

#### **factories.py**
```python
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth.models import User
from homepage.models import Product, Category
from decimal import Decimal


class UserFactory(DjangoModelFactory):
    """Factory for User model."""
    
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@markethub.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True


class CategoryFactory(DjangoModelFactory):
    """Factory for Category model."""
    
    class Meta:
        model = Category
    
    name = factory.Faker('word')
    description = factory.Faker('sentence')


class ProductFactory(DjangoModelFactory):
    """Factory for Product model."""
    
    class Meta:
        model = Product
    
    name = factory.Faker('catch_phrase')
    description = factory.Faker('paragraph')
    price = factory.LazyFunction(lambda: Decimal(factory.Faker('pydecimal', 
                                                               left_digits=3, 
                                                               right_digits=2, 
                                                               positive=True).generate({})))
    category = factory.SubFactory(CategoryFactory)
    stock_quantity = factory.Faker('random_int', min=0, max=100)
```

### **Running Tests**

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html --cov-report=term-missing

# Run specific test categories
pytest -m unit          # Unit tests
pytest -m integration   # Integration tests
pytest -m api          # API tests
pytest -m security     # Security tests

# Run tests in parallel
pytest -n auto

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_models.py

# Run specific test class
pytest tests/test_models.py::TestProductModel

# Run specific test method
pytest tests/test_models.py::TestProductModel::test_product_creation
```

### **Test Configuration** (`pytest.ini`)

```ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = markethub.settings.test
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
addopts = 
    --reuse-db
    --nomigrations
    --cov=.
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=85
    --strict-markers
    --disable-warnings
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    security: Security tests
    performance: Performance tests
    slow: Slow running tests
testpaths = tests
```

## 🪝 **Pre-commit Hooks**

### **Installation and Setup**

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run hooks on all files (first time)
pre-commit run --all-files
```

### **Pre-commit Configuration** (`.pre-commit-config.yaml`)

```yaml
repos:
  # Code formatting
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
        language_version: python3.9
        args: [--line-length=88]

  # Import sorting
  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
        args: [--profile, black]

  # Linting
  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        additional_dependencies: [
          flake8-django,
          flake8-docstrings,
          flake8-bugbear,
          flake8-comprehensions
        ]

  # Security scanning
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: [-c, pyproject.toml]

  # Dependency vulnerability check
  - repo: https://github.com/pyupio/safety
    rev: 3.0.1
    hooks:
      - id: safety
        args: [--json]

  # General hooks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-merge-conflict
      - id: check-added-large-files
      - id: debug-statements
      - id: check-docstring-first

  # Django specific
  - repo: https://github.com/adamchainz/django-upgrade
    rev: 1.15.0
    hooks:
      - id: django-upgrade
        args: [--target-version, "4.2"]

  # Type checking
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.2
    hooks:
      - id: mypy
        additional_dependencies: [django-stubs]
        exclude: migrations/

  # Documentation
  - repo: https://github.com/pycqa/pydocstyle
    rev: 6.3.0
    hooks:
      - id: pydocstyle
        match: '^(?!.*migrations).*\.py$'

  # Commit message format
  - repo: https://github.com/commitizen-tools/commitizen
    rev: v3.13.0
    hooks:
      - id: commitizen
      - id: commitizen-branch
        stages: [push]
```

### **Pre-commit Hook Commands**

```bash
# Run pre-commit on staged files
pre-commit run

# Run on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black
pre-commit run flake8
pre-commit run bandit

# Update hooks to latest versions
pre-commit autoupdate

# Skip hooks for specific commit
git commit -m "commit message" --no-verify

# Uninstall hooks
pre-commit uninstall
```

## 🔄 **Pull Request Process**

### **Branch Naming Convention**

Use descriptive branch names following this pattern:
```
feature/add-payment-integration
bugfix/fix-cart-total-calculation
hotfix/security-csrf-vulnerability
docs/update-api-documentation
refactor/optimize-product-queries
```

### **Commit Message Format**

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Examples:
```bash
feat(payment): add Stripe payment integration
fix(cart): resolve cart total calculation error
docs(api): update authentication endpoint documentation
test(models): add comprehensive product model tests
refactor(views): optimize database queries in product list
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### **Pull Request Checklist**

Before submitting a pull request, ensure:

#### **Code Quality**
- [ ] Code follows PEP 8 and project style guidelines
- [ ] All pre-commit hooks pass
- [ ] No linting errors or warnings
- [ ] Type hints are used appropriately
- [ ] Docstrings are provided for new functions/classes

#### **Testing**
- [ ] All existing tests pass
- [ ] New tests are added for new functionality
- [ ] Test coverage is maintained (85%+ required)
- [ ] Integration tests pass
- [ ] Security tests pass

#### **Documentation**
- [ ] README.md updated if necessary
- [ ] API documentation updated
- [ ] Inline code documentation provided
- [ ] Migration guide updated if applicable

#### **Security**
- [ ] No sensitive information exposed
- [ ] Security best practices followed
- [ ] Input validation implemented
- [ ] Authentication/authorization properly handled

#### **Performance**
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Caching implemented where appropriate
- [ ] Performance benchmarks pass

### **Pull Request Template**

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Fixes #(issue number)
```

### **Review Process**

1. **Automated Checks**: CI/CD pipeline runs tests and checks
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Manual testing of new features
4. **Documentation Review**: Documentation changes verified
5. **Security Review**: Security implications assessed
6. **Performance Review**: Performance impact evaluated

## 🔒 **Security Guidelines**

### **Security Checklist**

When contributing code, ensure:

- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented
- [ ] Output sanitized to prevent XSS
- [ ] SQL injection protection in place
- [ ] Authentication/authorization checked
- [ ] CSRF protection enabled
- [ ] Secure headers configured
- [ ] Error messages don't leak information

### **Security Testing**

```bash
# Run security checks
bandit -r . -f json -o security_report.json
safety check --json --output safety_report.json

# Test for common vulnerabilities
python manage.py check --deploy
pytest tests/test_security.py -v
```

### **Reporting Security Issues**

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead:
1. Email security issues to: security@markethub.com
2. Include detailed description and reproduction steps
3. Wait for acknowledgment before disclosure
4. Follow responsible disclosure practices

## 📚 **Documentation**

### **Code Documentation**

#### **Docstring Format**
```python
def calculate_tax(price: Decimal, tax_rate: Decimal) -> Decimal:
    """Calculate tax amount for a given price and tax rate.
    
    Args:
        price: The base price amount
        tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)
        
    Returns:
        Decimal: The calculated tax amount
        
    Raises:
        ValueError: If price or tax_rate is negative
        
    Example:
        >>> calculate_tax(Decimal('100.00'), Decimal('0.08'))
        Decimal('8.00')
    """
    if price < 0 or tax_rate < 0:
        raise ValueError("Price and tax rate must be non-negative")
    
    return price * tax_rate
```

#### **API Documentation**

Use Django REST Framework's built-in documentation:

```python
class ProductViewSet(ModelViewSet):
    """
    ViewSet for managing products.
    
    Provides CRUD operations for products with proper permissions
    and filtering capabilities.
    """
    
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    @action(detail=True, methods=['post'])
    def add_to_cart(self, request, pk=None):
        """
        Add product to user's cart.
        
        Requires authentication. Creates or updates cart item
        with specified quantity.
        """
        # Implementation here
        pass
```

### **Documentation Build**

```bash
# Install documentation dependencies
pip install sphinx sphinx-rtd-theme

# Build documentation
cd docs/
make html

# Serve documentation locally
python -m http.server 8080 -d _build/html/
```

## 🎯 **Development Workflow**

### **Daily Development**

```bash
# 1. Start development
git checkout main
git pull upstream main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test
# ... code changes ...
pytest
black .
isort .
flake8 .

# 4. Commit changes
git add .
git commit -m "feat: add new feature"

# 5. Push and create PR
git push origin feature/your-feature-name
# Create PR on GitHub
```

### **Before Submitting PR**

```bash
# Sync with upstream
git fetch upstream
git rebase upstream/main

# Run full test suite
pytest --cov=. --cov-report=html
bandit -r .
safety check

# Verify pre-commit hooks
pre-commit run --all-files

# Push final changes
git push origin feature/your-feature-name --force-with-lease
```

## 🤝 **Community Guidelines**

### **Code of Conduct**

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be patient** with new contributors
- **Be professional** in all interactions

### **Getting Help**

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat with community
- **Email**: Direct contact for sensitive issues

### **Recognition**

Contributors are recognized through:
- **Contributors page** in documentation
- **Release notes** mention
- **GitHub badges** for significant contributions
- **Special thanks** in README.md

---

## 🎉 **Thank You!**

Thank you for contributing to MarketHub! Your contributions help make this platform better for everyone.

**Happy coding!** 🚀

---

*For questions about this guide, please open an issue or contact the maintainers.*
