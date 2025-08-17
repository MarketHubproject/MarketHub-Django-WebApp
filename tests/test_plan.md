# MarketHub Comprehensive Test Plan

This document outlines the test strategy and plan for the MarketHub e-commerce application, including test coverage, methodologies, and organization.

## Test Organization

The test suite is organized into the following components:

1. **Model Tests** (`test_models.py`)
   - Test data integrity, validation, and business logic for all models
   - Test model relationships and constraints
   - Test model methods and properties

2. **API Tests** (`test_api_views.py`)
   - Test REST API endpoints functionality
   - Test API authentication and permissions
   - Test data validation and error handling
   - Test search, filtering, and pagination

3. **Web View Tests** (`test_views.py`)
   - Test web interface views
   - Test form handling and validation
   - Test template rendering and context data
   - Test user flow and interactions

4. **Integration Tests** (`test_integration.py`)
   - Test interaction between different components
   - Test end-to-end user journeys
   - Test multi-user scenarios
   - Test payment and order flows

## Test Coverage Goals

- **Model Coverage**: 100% coverage of model properties and methods
- **API Coverage**: 100% coverage of all API endpoints
- **View Coverage**: 90% coverage of all web views
- **Integration Coverage**: 80% coverage of key user journeys
- **Overall Code Coverage**: 85% minimum

## Test Types

### Unit Tests
- Isolated tests for individual components
- Mock external dependencies
- Focus on specific functionality

### Integration Tests
- Test interaction between components
- Test realistic user flows
- Limited mocking of external dependencies

### Functional Tests
- Test complete features end-to-end
- Test from user perspective
- Minimum mocking

### Performance Tests
- Test application under load
- Test database query performance
- Test response times

## Test Environment Setup

1. **Test Database**: In-memory SQLite for speed
2. **Migrations**: Disabled during testing
3. **Media/Static Files**: Temporary directories
4. **External Services**: Mocked where appropriate
5. **Payment Gateway**: Test mode or mocked

## Continuous Integration Integration

- Run all tests on every pull request
- Run fast tests on every commit
- Run comprehensive tests nightly
- Enforce minimum code coverage

## Test Data Management

- Use factories for test data generation
- Create realistic data scenarios
- Reset database between tests
- Avoid dependencies between tests

## Model Test Checklist

For each model, ensure tests cover:

- [x] Model creation with valid data
- [x] Field validation and constraints
- [x] Model methods and properties
- [x] String representation
- [x] Related object behavior

## API Test Checklist

For each API endpoint, ensure tests cover:

- [x] GET operations (list, detail)
- [x] POST operations (create)
- [x] PUT/PATCH operations (update)
- [x] DELETE operations (delete)
- [x] Authentication requirements
- [x] Permission checks
- [x] Input validation
- [x] Response format and status codes
- [x] Error handling
- [x] Pagination
- [x] Filtering and search

## Web View Test Checklist

For each web view, ensure tests cover:

- [x] Page loads correctly
- [x] Authentication requirements
- [x] Form submission
- [x] Error handling
- [x] Context data
- [x] Template rendering
- [x] User flow

## Required Model Test Fixes

### Favorite Model Tests
- Update tests to match the actual model without `created_at` field
- Fix string representation test to match the actual format: `{username} - {product_name}`

### Order Model Tests
- Update tests to use `province` instead of `country` field
- Fix tests for order number generation
- Test order status transitions

### Review Model Tests
- Fix string representation test to match format: `{product_name} - {rating}★ by {username}`
- Add tests for review validation and constraints

### Payment Model Tests
- Update tests to match new Payment model structure
- Test payment status transitions
- Test payment success/failure scenarios

## Known Model Limitations

- The `Product` model doesn't have negative price validation
- The `Favorite` model doesn't have a `created_at` field but an `added_at` field
- The `Order` model uses `province` instead of `country`
- The `Review` model string representation doesn't match test expectation

## Running Tests

### Command Line
```bash
# Run all tests
python manage.py test --settings=markethub.settings_test

# Run specific test modules
python manage.py test tests.test_models --settings=markethub.settings_test
python manage.py test tests.test_api_views --settings=markethub.settings_test
python manage.py test tests.test_views --settings=markethub.settings_test
python manage.py test tests.test_integration --settings=markethub.settings_test

# Run with coverage
coverage run --source=homepage,markethub manage.py test --settings=markethub.settings_test
coverage report
coverage html
```

### Using pytest
```bash
# Run all tests
pytest

# Run specific test modules
pytest tests/test_models.py
pytest tests/test_api_views.py
pytest tests/test_views.py
pytest tests/test_integration.py

# Run with coverage
pytest --cov=homepage --cov=markethub
```

### Using the test runner script
```bash
# Run all tests
python run_tests.py

# Run specific test types
python run_tests.py --type models
python run_tests.py --type api
python run_tests.py --type views
python run_tests.py --type integration

# Run with coverage
python run_tests.py --coverage
```

## Test Suite Maintenance

- Update tests when models or business logic changes
- Review and improve test coverage regularly
- Add new tests for new features
- Clean up obsolete tests

## Additional Test Scenarios

- Test payment gateway integration
- Test email notifications
- Test search functionality
- Test performance under load
- Test data migration scripts
- Test error handling and recovery
- Test security features
