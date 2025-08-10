#!/usr/bin/env python
"""
Bootstrap Icons Regression Test Script for MarketHub
This script automates the testing of Bootstrap Icons across key pages and browsers.
"""

import os
import sys
import time
import json
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions


class BootstrapIconTester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.test_results = {}
        self.screenshot_dir = "icon_test_screenshots"
        
        # Create screenshot directory
        os.makedirs(self.screenshot_dir, exist_ok=True)
        
        # Test configuration
        self.test_pages = [
            {"name": "Home", "path": "/", "key": "home"},
            {"name": "Product List", "path": "/products/", "key": "product_list"},
            {"name": "Icon Test Page", "path": "/bootstrap_icons_test.html", "key": "icon_test"},
        ]
        
        self.viewports = [
            {"name": "Desktop", "width": 1920, "height": 1080},
            {"name": "Tablet", "width": 768, "height": 1024},
            {"name": "Mobile", "width": 375, "height": 667},
        ]
        
        self.browsers = ["chrome", "firefox"]
    
    def create_driver(self, browser_name, viewport=None):
        """Create a WebDriver instance for the specified browser."""
        try:
            if browser_name == "chrome":
                options = ChromeOptions()
                options.add_argument("--disable-gpu")
                options.add_argument("--no-sandbox")
                options.add_argument("--disable-dev-shm-usage")
                
                if viewport:
                    options.add_argument(f"--window-size={viewport['width']},{viewport['height']}")
                
                driver = webdriver.Chrome(options=options)
            
            elif browser_name == "firefox":
                options = FirefoxOptions()
                options.add_argument("--headless")
                
                if viewport:
                    options.add_argument(f"--width={viewport['width']}")
                    options.add_argument(f"--height={viewport['height']}")
                
                driver = webdriver.Firefox(options=options)
            
            else:
                raise ValueError(f"Unsupported browser: {browser_name}")
            
            if viewport:
                driver.set_window_size(viewport['width'], viewport['height'])
            
            return driver
        
        except Exception as e:
            print(f"❌ Failed to create {browser_name} driver: {e}")
            return None
    
    def test_icon_loading(self, driver, page_url, test_name):
        """Test Bootstrap Icons loading on a specific page."""
        results = {
            "page_url": page_url,
            "test_name": test_name,
            "timestamp": datetime.now().isoformat(),
            "icons_found": 0,
            "icons_visible": 0,
            "font_loaded": False,
            "css_working": False,
            "screenshots": [],
            "errors": []
        }
        
        try:
            print(f"  📄 Testing {test_name}...")
            driver.get(page_url)
            
            # Wait for page to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Wait a bit more for icons to load
            time.sleep(3)
            
            # Find all Bootstrap Icons
            icons = driver.find_elements(By.CLASS_NAME, "bi")
            results["icons_found"] = len(icons)
            
            # Check visibility of icons
            visible_icons = 0
            for icon in icons:
                try:
                    if icon.is_displayed():
                        size = icon.size
                        if size['width'] > 0 and size['height'] > 0:
                            visible_icons += 1
                except:
                    pass
            
            results["icons_visible"] = visible_icons
            
            # Test font loading if on test page
            if "bootstrap_icons_test.html" in page_url:
                try:
                    # Wait for test suite to complete
                    time.sleep(5)
                    
                    # Get test results from JavaScript
                    js_results = driver.execute_script("""
                        if (window.iconTestSuite) {
                            return window.iconTestSuite.getTestResults();
                        }
                        return null;
                    """)
                    
                    if js_results:
                        results["font_loaded"] = js_results["results"]["fontLoading"]
                        results["css_working"] = js_results["results"]["cssRules"]
                        results["js_test_results"] = js_results
                
                except Exception as e:
                    results["errors"].append(f"JavaScript test execution failed: {str(e)}")
            
            # Take screenshot
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_name = f"{test_name}_{timestamp}.png"
            screenshot_path = os.path.join(self.screenshot_dir, screenshot_name)
            
            driver.save_screenshot(screenshot_path)
            results["screenshots"].append(screenshot_path)
            
            # Basic validation
            if results["icons_found"] > 0:
                success_rate = (results["icons_visible"] / results["icons_found"]) * 100
                results["success_rate"] = success_rate
                
                if success_rate > 90:
                    print(f"    ✅ {results['icons_visible']}/{results['icons_found']} icons visible ({success_rate:.1f}%)")
                elif success_rate > 70:
                    print(f"    ⚠️  {results['icons_visible']}/{results['icons_found']} icons visible ({success_rate:.1f}%)")
                else:
                    print(f"    ❌ Only {results['icons_visible']}/{results['icons_found']} icons visible ({success_rate:.1f}%)")
            else:
                print(f"    ❌ No Bootstrap Icons found on page")
                results["success_rate"] = 0
        
        except Exception as e:
            print(f"    ❌ Error testing {test_name}: {str(e)}")
            results["errors"].append(str(e))
            results["success_rate"] = 0
        
        return results
    
    def test_browser_viewport_combination(self, browser, viewport):
        """Test a specific browser and viewport combination."""
        driver = None
        combination_results = []
        
        try:
            print(f"\n🌐 Testing {browser.title()} - {viewport['name']} ({viewport['width']}x{viewport['height']})")
            driver = self.create_driver(browser, viewport)
            
            if not driver:
                return combination_results
            
            for page in self.test_pages:
                page_url = f"{self.base_url}{page['path']}"
                test_name = f"{browser}_{viewport['name'].lower()}_{page['key']}"
                
                result = self.test_icon_loading(driver, page_url, test_name)
                result["browser"] = browser
                result["viewport"] = viewport
                result["page_info"] = page
                
                combination_results.append(result)
        
        except Exception as e:
            print(f"❌ Error in browser/viewport combination: {str(e)}")
        
        finally:
            if driver:
                driver.quit()
        
        return combination_results
    
    def run_comprehensive_test(self):
        """Run comprehensive Bootstrap Icons regression test."""
        print("🚀 Starting Bootstrap Icons Regression Test Suite")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📁 Screenshots will be saved to: {self.screenshot_dir}")
        print("=" * 60)
        
        all_results = []
        
        # Test each browser and viewport combination
        for browser in self.browsers:
            for viewport in self.viewports:
                results = self.test_browser_viewport_combination(browser, viewport)
                all_results.extend(results)
        
        # Generate summary
        self.generate_test_summary(all_results)
        
        # Save detailed results
        self.save_test_results(all_results)
        
        return all_results
    
    def generate_test_summary(self, results):
        """Generate and display test summary."""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.get("success_rate", 0) > 90)
        warning_tests = sum(1 for r in results if 70 <= r.get("success_rate", 0) <= 90)
        failed_tests = sum(1 for r in results if r.get("success_rate", 0) < 70)
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"⚠️  Warnings: {warning_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        # Browser breakdown
        browser_stats = {}
        for result in results:
            browser = result.get("browser", "unknown")
            if browser not in browser_stats:
                browser_stats[browser] = {"total": 0, "passed": 0}
            
            browser_stats[browser]["total"] += 1
            if result.get("success_rate", 0) > 90:
                browser_stats[browser]["passed"] += 1
        
        print("\n📱 Browser Performance:")
        for browser, stats in browser_stats.items():
            success_rate = (stats["passed"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            print(f"  {browser.title()}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Viewport breakdown
        viewport_stats = {}
        for result in results:
            viewport = result.get("viewport", {}).get("name", "unknown")
            if viewport not in viewport_stats:
                viewport_stats[viewport] = {"total": 0, "passed": 0}
            
            viewport_stats[viewport]["total"] += 1
            if result.get("success_rate", 0) > 90:
                viewport_stats[viewport]["passed"] += 1
        
        print("\n📐 Viewport Performance:")
        for viewport, stats in viewport_stats.items():
            success_rate = (stats["passed"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            print(f"  {viewport}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Icon statistics
        total_icons = sum(r.get("icons_found", 0) for r in results)
        visible_icons = sum(r.get("icons_visible", 0) for r in results)
        
        if total_icons > 0:
            overall_visibility = (visible_icons / total_icons) * 100
            print(f"\n🎯 Overall Icon Visibility: {visible_icons}/{total_icons} ({overall_visibility:.1f}%)")
        
        # Recommendations
        print("\n💡 RECOMMENDATIONS:")
        if failed_tests > 0:
            print("  - Review failed tests and check CSS/font loading")
        if warning_tests > 0:
            print("  - Investigate partial icon loading issues")
        print("  - Verify icons display correctly across all browsers")
        print("  - Check responsive behavior on mobile devices")
    
    def save_test_results(self, results):
        """Save detailed test results to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"bootstrap_icons_test_results_{timestamp}.json"
        
        report_data = {
            "test_summary": {
                "timestamp": datetime.now().isoformat(),
                "total_tests": len(results),
                "base_url": self.base_url,
                "browsers_tested": list(set(r.get("browser") for r in results)),
                "viewports_tested": list(set(r.get("viewport", {}).get("name") for r in results))
            },
            "detailed_results": results
        }
        
        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: {filename}")
    
    def quick_test(self):
        """Run a quick test on the icon test page only."""
        print("🚀 Running Quick Bootstrap Icons Test")
        print("=" * 40)
        
        driver = self.create_driver("chrome", {"width": 1920, "height": 1080})
        if not driver:
            print("❌ Could not create Chrome driver")
            return
        
        try:
            test_url = f"{self.base_url}/bootstrap_icons_test.html"
            result = self.test_icon_loading(driver, test_url, "quick_test")
            
            print(f"\n📊 Quick Test Results:")
            print(f"Icons Found: {result['icons_found']}")
            print(f"Icons Visible: {result['icons_visible']}")
            print(f"Success Rate: {result.get('success_rate', 0):.1f}%")
            
            if result.get('js_test_results'):
                js_results = result['js_test_results']
                print(f"Font Loaded: {js_results['results']['fontLoading']}")
                print(f"CSS Working: {js_results['results']['cssRules']}")
                print(f"Browser: {js_results['summary']['browser']}")
                print(f"Overall: {js_results['summary']['overall']}")
        
        finally:
            driver.quit()


def main():
    """Main entry point for the test script."""
    tester = BootstrapIconTester()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        tester.quick_test()
    else:
        tester.run_comprehensive_test()


if __name__ == "__main__":
    main()
