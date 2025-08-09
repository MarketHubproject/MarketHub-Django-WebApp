#!/usr/bin/env python3
"""
Simple API testing script for MarketHub API endpoints
"""
import requests
import json
import sys

# Base API URL
BASE_URL = "http://127.0.0.1:8000/api"


def test_api_overview():
    """Test API overview endpoint"""
    print("🔍 Testing API Overview...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print("✅ API Overview successful")
            print("Available endpoints:")
            for category, endpoints in data.items():
                print(f"  📁 {category}")
                if isinstance(endpoints, dict):
                    for name, details in endpoints.items():
                        print(f"    - {name}: {details}")
        else:
            print(f"❌ API Overview failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API Overview error: {e}")
    print("-" * 60)


def test_products_list():
    """Test products list endpoint"""
    print("📦 Testing Products List...")
    try:
        response = requests.get(f"{BASE_URL}/products/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Products List successful")
            if 'results' in data:
                print(f"   Found {len(data['results'])} products")
                print(f"   Total count: {data.get('count', 'N/A')}")
                if data['results']:
                    product = data['results'][0]
                    print(f"   First product: {product['name']} - ${product['price']}")
            else:
                print(f"   Found {len(data)} products")
        else:
            print(f"❌ Products List failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Products List error: {e}")
    print("-" * 60)


def test_categories():
    """Test categories endpoint"""
    print("📂 Testing Categories...")
    try:
        response = requests.get(f"{BASE_URL}/categories/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Categories successful")
            categories = data.get('categories', [])
            print(f"   Found {len(categories)} categories:")
            for cat in categories:
                print(f"     - {cat['label']} ({cat['value']})")
        else:
            print(f"❌ Categories failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Categories error: {e}")
    print("-" * 60)


def test_authentication():
    """Test authentication endpoint"""
    print("🔐 Testing Authentication...")
    try:
        # Test login with invalid credentials
        response = requests.post(f"{BASE_URL}/login/", json={
            "username": "testuser",
            "password": "wrongpassword"
        })

        if response.status_code == 401:
            print("✅ Authentication rejection working (expected for invalid credentials)")

        # Test with admin credentials (if they exist)
        response = requests.post(f"{BASE_URL}/login/", json={
            "username": "admin",
            "password": "admin123"
        })

        if response.status_code == 200:
            data = response.json()
            print("✅ Authentication successful with admin credentials")
            print(f"   Token: {data.get('token', 'N/A')[:20]}...")
            print(f"   User: {data.get('user', {}).get('username', 'N/A')}")
            return data.get('token')
        else:
            print(f"ℹ️  Admin authentication failed: {response.status_code}")
            print("   (This is expected if admin user doesn't exist)")

    except Exception as e:
        print(f"❌ Authentication error: {e}")
    print("-" * 60)
    return None


def test_cart_endpoints(token=None):
    """Test cart endpoints (requires authentication)"""
    print("🛒 Testing Cart Endpoints...")

    if not token:
        print("⚠️  Skipping cart tests - no authentication token available")
        print("-" * 60)
        return

    headers = {"Authorization": f"Token {token}"}

    try:
        # Test cart view
        response = requests.get(f"{BASE_URL}/cart/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print("✅ Cart view successful")
            print(f"   Items in cart: {len(data.get('items', []))}")
            print(f"   Total price: ${data.get('total_price', 0)}")
        else:
            print(f"❌ Cart view failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Cart test error: {e}")
    print("-" * 60)


def main():
    """Run all API tests"""
    print("🚀 MarketHub API Testing Suite")
    print("=" * 60)

    # Test endpoints
    test_api_overview()
    test_categories()
    test_products_list()

    # Test authentication and cart (if possible)
    token = test_authentication()
    test_cart_endpoints(token)

    print("🏁 API testing complete!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        sys.exit(1)
