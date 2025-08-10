#!/usr/bin/env python3
"""
Quick validation script for Bootstrap Icons Diagnostic Tool
Tests the basic functionality without requiring a full browser test.
"""

import os
import sys
import django
from django.test import Client
from django.urls import reverse

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings.dev')
django.setup()

def test_diagnostic_page():
    """Test that the diagnostic page loads correctly"""
    client = Client()
    
    try:
        # Test GET request to diagnostic page
        response = client.get('/test_icons/')
        
        print(f"✅ Diagnostic page status: {response.status_code}")
        
        if response.status_code == 200:
            content = response.content.decode('utf-8')
            
            # Check for key diagnostic features
            checks = [
                ('Network Waterfall Timings', 'Network performance testing'),
                ('CDN Failure Simulation', 'CDN testing functionality'), 
                ('testNetworkTimings', 'Network timing JavaScript function'),
                ('setupCdnSimulation', 'CDN simulation JavaScript function'),
                ('bi-cdn', 'CDN link ID reference'),
                ('networkTimings', 'Network timing variables'),
                ('removeCdnBtn', 'Remove CDN button'),
                ('restoreCdnBtn', 'Restore CDN button')
            ]
            
            print("\n🔍 Diagnostic Features Check:")
            for feature, description in checks:
                if feature in content:
                    print(f"  ✅ {description}: Found")
                else:
                    print(f"  ❌ {description}: Missing")
            
            # Check for Bootstrap Icons in base template
            if 'bi-shop-window' in content:
                print("  ✅ Bootstrap Icons integration: Found")
            else:
                print("  ⚠️  Bootstrap Icons integration: Not detected")
                
            # Check for enhanced testing sections
            test_sections = [
                'Test 6: Network Waterfall Timings',
                'Test 7: CDN Failure Simulation',
                'DNS Lookup',
                'Connect',
                'Download',
                'Total'
            ]
            
            print("\n📊 Test Sections:")
            for section in test_sections:
                if section in content:
                    print(f"  ✅ {section}: Present")
                else:
                    print(f"  ❌ {section}: Missing")
        
        else:
            print(f"❌ Failed to load diagnostic page (Status: {response.status_code})")
            
    except Exception as e:
        print(f"❌ Error testing diagnostic page: {e}")

def test_url_configuration():
    """Test that the URL is properly configured"""
    try:
        from django.urls import resolve
        resolver = resolve('/test_icons/')
        print(f"✅ URL configuration: {resolver.view_name} -> {resolver.func.__name__}")
    except Exception as e:
        print(f"❌ URL configuration error: {e}")

def check_template_file():
    """Check that the template file exists and has correct content"""
    template_path = 'homepage/templates/homepage/test_icons.html'
    
    if os.path.exists(template_path):
        print(f"✅ Template file exists: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Check for new diagnostic features
        diagnostic_features = [
            'testNetworkTimings',
            'Network Waterfall Timings', 
            'CDN Failure Simulation',
            'networkTimings',
            'setupCdnSimulation',
            'Performance API'
        ]
        
        print("\n📄 Template Content Check:")
        for feature in diagnostic_features:
            if feature in content:
                print(f"  ✅ {feature}: Found")
            else:
                print(f"  ❌ {feature}: Missing")
    else:
        print(f"❌ Template file not found: {template_path}")

if __name__ == "__main__":
    print("🚀 Bootstrap Icons Diagnostic Tool - Validation Test\n")
    print("=" * 60)
    
    # Run tests
    check_template_file()
    print("\n" + "=" * 60)
    test_url_configuration()
    print("\n" + "=" * 60)
    test_diagnostic_page()
    
    print("\n" + "=" * 60)
    print("✅ Validation Complete!")
    print("\n📖 To use the diagnostic tool:")
    print("1. python manage.py runserver")
    print("2. Navigate to: http://localhost:8000/test_icons/")
    print("3. Run network and CDN tests")
    print("\n📚 See BOOTSTRAP_ICONS_DIAGNOSTIC_TOOL.md for detailed documentation")
