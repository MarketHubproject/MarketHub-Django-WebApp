#!/usr/bin/env python3
"""
MarketHub Load Testing and Performance Verification Suite

This script performs comprehensive load testing to ensure the MarketHub
application can handle production traffic loads.

Usage:
    python load_test_suite.py [--concurrent-users 10] [--test-duration 60] [--base-url http://localhost:8000]
"""

import asyncio
import aiohttp
import time
import json
import statistics
import argparse
import logging
from datetime import datetime
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
import concurrent.futures
import requests
from urllib.parse import urljoin

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class LoadTestResult:
    """Data class to store individual test result."""
    endpoint: str
    method: str
    status_code: int
    response_time: float
    success: bool
    error: str = None

@dataclass
class LoadTestSummary:
    """Data class to store load test summary statistics."""
    endpoint: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    errors: List[str]

class MarketHubLoadTester:
    """Comprehensive load tester for MarketHub application."""
    
    def __init__(self, base_url: str, concurrent_users: int = 10, test_duration: int = 60):
        self.base_url = base_url.rstrip('/')
        self.concurrent_users = concurrent_users
        self.test_duration = test_duration
        self.results: List[LoadTestResult] = []
        
        # Test scenarios
        self.test_scenarios = [
            {
                'name': 'Homepage Load',
                'endpoint': '/',
                'method': 'GET',
                'weight': 30  # 30% of traffic
            },
            {
                'name': 'Product Search',
                'endpoint': '/api/products/',
                'method': 'GET',
                'params': {'search': 'laptop', 'page': 1},
                'weight': 25
            },
            {
                'name': 'Product Detail',
                'endpoint': '/api/products/1/',
                'method': 'GET',
                'weight': 20
            },
            {
                'name': 'Product Listing',
                'endpoint': '/products/',
                'method': 'GET',
                'weight': 15
            },
            {
                'name': 'Category Browse',
                'endpoint': '/api/products/',
                'method': 'GET',
                'params': {'category': 'electronics'},
                'weight': 10
            }
        ]
        
        # Performance thresholds
        self.performance_thresholds = {
            'avg_response_time': 2.0,  # seconds
            'p95_response_time': 5.0,  # seconds
            'success_rate': 99.0,  # percentage
            'requests_per_second': 10.0  # minimum RPS
        }
    
    async def make_request(self, session: aiohttp.ClientSession, scenario: Dict[str, Any]) -> LoadTestResult:
        """Make a single HTTP request and return result."""
        start_time = time.time()
        endpoint = scenario['endpoint']
        method = scenario['method']
        params = scenario.get('params', {})
        
        try:
            url = urljoin(self.base_url, endpoint)
            async with session.request(method, url, params=params) as response:
                await response.text()  # Read response body
                response_time = time.time() - start_time
                
                return LoadTestResult(
                    endpoint=endpoint,
                    method=method,
                    status_code=response.status,
                    response_time=response_time,
                    success=200 <= response.status < 400
                )
                
        except Exception as e:
            response_time = time.time() - start_time
            return LoadTestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=response_time,
                success=False,
                error=str(e)
            )
    
    async def user_simulation(self, user_id: int):
        """Simulate a single user's behavior."""
        logger.info(f"Starting user simulation {user_id}")
        
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            end_time = time.time() + self.test_duration
            
            while time.time() < end_time:
                # Choose scenario based on weight
                import random
                scenario = random.choices(
                    self.test_scenarios,
                    weights=[s['weight'] for s in self.test_scenarios]
                )[0]
                
                result = await self.make_request(session, scenario)
                self.results.append(result)
                
                # Wait between requests (simulate user think time)
                await asyncio.sleep(random.uniform(0.5, 2.0))
    
    def calculate_statistics(self) -> Dict[str, LoadTestSummary]:
        """Calculate performance statistics for each endpoint."""
        endpoint_results = {}
        
        # Group results by endpoint
        for result in self.results:
            if result.endpoint not in endpoint_results:
                endpoint_results[result.endpoint] = []
            endpoint_results[result.endpoint].append(result)
        
        summaries = {}
        for endpoint, results in endpoint_results.items():
            if not results:
                continue
                
            successful_results = [r for r in results if r.success]
            response_times = [r.response_time for r in successful_results]
            
            if response_times:
                avg_response_time = statistics.mean(response_times)
                min_response_time = min(response_times)
                max_response_time = max(response_times)
                p95_response_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 1 else avg_response_time
                p99_response_time = statistics.quantiles(response_times, n=100)[98] if len(response_times) > 1 else avg_response_time
            else:
                avg_response_time = min_response_time = max_response_time = p95_response_time = p99_response_time = 0
            
            requests_per_second = len(results) / self.test_duration if self.test_duration > 0 else 0
            
            summaries[endpoint] = LoadTestSummary(
                endpoint=endpoint,
                total_requests=len(results),
                successful_requests=len(successful_results),
                failed_requests=len(results) - len(successful_results),
                success_rate=(len(successful_results) / len(results) * 100) if results else 0,
                avg_response_time=avg_response_time,
                min_response_time=min_response_time,
                max_response_time=max_response_time,
                p95_response_time=p95_response_time,
                p99_response_time=p99_response_time,
                requests_per_second=requests_per_second,
                errors=[r.error for r in results if r.error]
            )
        
        return summaries
    
    def check_performance_thresholds(self, summaries: Dict[str, LoadTestSummary]) -> Dict[str, Any]:
        """Check if performance meets defined thresholds."""
        overall_stats = {
            'total_requests': sum(s.total_requests for s in summaries.values()),
            'total_successful': sum(s.successful_requests for s in summaries.values()),
            'overall_success_rate': 0,
            'overall_avg_response_time': 0,
            'overall_rps': 0
        }
        
        if overall_stats['total_requests'] > 0:
            overall_stats['overall_success_rate'] = (
                overall_stats['total_successful'] / overall_stats['total_requests'] * 100
            )
            
            all_response_times = []
            for result in self.results:
                if result.success:
                    all_response_times.append(result.response_time)
            
            if all_response_times:
                overall_stats['overall_avg_response_time'] = statistics.mean(all_response_times)
                overall_stats['overall_p95_response_time'] = (
                    statistics.quantiles(all_response_times, n=20)[18] 
                    if len(all_response_times) > 1 else overall_stats['overall_avg_response_time']
                )
            
            overall_stats['overall_rps'] = overall_stats['total_requests'] / self.test_duration
        
        # Check thresholds
        threshold_results = {
            'avg_response_time': {
                'value': overall_stats['overall_avg_response_time'],
                'threshold': self.performance_thresholds['avg_response_time'],
                'passed': overall_stats['overall_avg_response_time'] <= self.performance_thresholds['avg_response_time']
            },
            'p95_response_time': {
                'value': overall_stats.get('overall_p95_response_time', 0),
                'threshold': self.performance_thresholds['p95_response_time'],
                'passed': overall_stats.get('overall_p95_response_time', 0) <= self.performance_thresholds['p95_response_time']
            },
            'success_rate': {
                'value': overall_stats['overall_success_rate'],
                'threshold': self.performance_thresholds['success_rate'],
                'passed': overall_stats['overall_success_rate'] >= self.performance_thresholds['success_rate']
            },
            'requests_per_second': {
                'value': overall_stats['overall_rps'],
                'threshold': self.performance_thresholds['requests_per_second'],
                'passed': overall_stats['overall_rps'] >= self.performance_thresholds['requests_per_second']
            }
        }
        
        return {
            'overall_stats': overall_stats,
            'threshold_results': threshold_results,
            'all_thresholds_passed': all(t['passed'] for t in threshold_results.values())
        }
    
    async def run_load_test(self) -> Dict[str, Any]:
        """Run the complete load test suite."""
        logger.info(f"Starting load test with {self.concurrent_users} concurrent users for {self.test_duration} seconds")
        logger.info(f"Target URL: {self.base_url}")
        
        # Start user simulations
        start_time = time.time()
        tasks = [self.user_simulation(i) for i in range(self.concurrent_users)]
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Load test failed: {str(e)}")
            return None
        
        actual_duration = time.time() - start_time
        logger.info(f"Load test completed in {actual_duration:.2f} seconds")
        
        # Calculate statistics
        summaries = self.calculate_statistics()
        performance_check = self.check_performance_thresholds(summaries)
        
        # Generate report
        report = {
            'test_config': {
                'base_url': self.base_url,
                'concurrent_users': self.concurrent_users,
                'planned_duration': self.test_duration,
                'actual_duration': actual_duration,
                'timestamp': datetime.now().isoformat()
            },
            'endpoint_summaries': {k: asdict(v) for k, v in summaries.items()},
            'performance_analysis': performance_check,
            'recommendations': self.generate_recommendations(summaries, performance_check)
        }
        
        return report
    
    def generate_recommendations(self, summaries: Dict[str, LoadTestSummary], performance_check: Dict[str, Any]) -> List[str]:
        """Generate performance recommendations based on test results."""
        recommendations = []
        
        # Check response times
        threshold_results = performance_check['threshold_results']
        
        if not threshold_results['avg_response_time']['passed']:
            recommendations.append(
                f"Average response time ({threshold_results['avg_response_time']['value']:.2f}s) "
                f"exceeds threshold ({threshold_results['avg_response_time']['threshold']}s). "
                "Consider optimizing database queries, adding caching, or scaling infrastructure."
            )
        
        if not threshold_results['p95_response_time']['passed']:
            recommendations.append(
                f"95th percentile response time ({threshold_results['p95_response_time']['value']:.2f}s) "
                f"exceeds threshold ({threshold_results['p95_response_time']['threshold']}s). "
                "This indicates performance inconsistency under load."
            )
        
        if not threshold_results['success_rate']['passed']:
            recommendations.append(
                f"Success rate ({threshold_results['success_rate']['value']:.1f}%) "
                f"below threshold ({threshold_results['success_rate']['threshold']}%). "
                "Check for errors in application logs and fix failing endpoints."
            )
        
        if not threshold_results['requests_per_second']['passed']:
            recommendations.append(
                f"Throughput ({threshold_results['requests_per_second']['value']:.1f} RPS) "
                f"below threshold ({threshold_results['requests_per_second']['threshold']} RPS). "
                "Consider scaling infrastructure or optimizing application performance."
            )
        
        # Endpoint-specific recommendations
        for endpoint, summary in summaries.items():
            if summary.success_rate < 95:
                recommendations.append(f"Endpoint {endpoint} has low success rate ({summary.success_rate:.1f}%)")
            
            if summary.avg_response_time > 3.0:
                recommendations.append(f"Endpoint {endpoint} has high average response time ({summary.avg_response_time:.2f}s)")
        
        if not recommendations:
            recommendations.append("All performance metrics meet the defined thresholds. Great job!")
        
        return recommendations

def run_smoke_test(base_url: str) -> bool:
    """Run a quick smoke test to verify basic functionality."""
    logger.info("Running smoke test...")
    
    smoke_endpoints = [
        ('/', 'Homepage'),
        ('/api/products/', 'Products API'),
        ('/api/health/', 'Health Check')
    ]
    
    session = requests.Session()
    session.headers.update({'User-Agent': 'MarketHub-LoadTester/1.0'})
    
    all_passed = True
    for endpoint, name in smoke_endpoints:
        try:
            url = urljoin(base_url, endpoint)
            response = session.get(url, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"✅ {name}: OK")
            else:
                logger.error(f"❌ {name}: HTTP {response.status_code}")
                all_passed = False
                
        except Exception as e:
            logger.error(f"❌ {name}: {str(e)}")
            all_passed = False
    
    return all_passed

async def main():
    """Main function to run load testing suite."""
    parser = argparse.ArgumentParser(description='MarketHub Load Testing Suite')
    parser.add_argument('--base-url', default='http://localhost:8000',
                       help='Base URL for the application (default: http://localhost:8000)')
    parser.add_argument('--concurrent-users', type=int, default=10,
                       help='Number of concurrent users to simulate (default: 10)')
    parser.add_argument('--test-duration', type=int, default=60,
                       help='Test duration in seconds (default: 60)')
    parser.add_argument('--smoke-test-only', action='store_true',
                       help='Run only smoke test, skip load test')
    parser.add_argument('--output-file', default=None,
                       help='Output file for test results (JSON format)')
    
    args = parser.parse_args()
    
    # Run smoke test first
    logger.info("="*60)
    logger.info("🚀 MARKETHUB LOAD TESTING SUITE")
    logger.info("="*60)
    
    if not run_smoke_test(args.base_url):
        logger.error("❌ Smoke test failed. Fix basic connectivity issues before running load test.")
        return 1
    
    logger.info("✅ Smoke test passed!")
    
    if args.smoke_test_only:
        logger.info("Smoke test only mode. Exiting.")
        return 0
    
    # Run load test
    logger.info("\n" + "="*60)
    logger.info("🔥 STARTING LOAD TEST")
    logger.info("="*60)
    
    load_tester = MarketHubLoadTester(
        base_url=args.base_url,
        concurrent_users=args.concurrent_users,
        test_duration=args.test_duration
    )
    
    report = await load_tester.run_load_test()
    
    if not report:
        logger.error("❌ Load test failed")
        return 1
    
    # Print results
    logger.info("\n" + "="*60)
    logger.info("📊 LOAD TEST RESULTS")
    logger.info("="*60)
    
    overall_stats = report['performance_analysis']['overall_stats']
    logger.info(f"Total Requests: {overall_stats['total_requests']}")
    logger.info(f"Successful Requests: {overall_stats['total_successful']}")
    logger.info(f"Success Rate: {overall_stats['overall_success_rate']:.1f}%")
    logger.info(f"Average Response Time: {overall_stats['overall_avg_response_time']:.3f}s")
    logger.info(f"Requests per Second: {overall_stats['overall_rps']:.1f}")
    
    # Print threshold results
    logger.info("\n🎯 PERFORMANCE THRESHOLDS:")
    threshold_results = report['performance_analysis']['threshold_results']
    for metric, result in threshold_results.items():
        status = "✅ PASS" if result['passed'] else "❌ FAIL"
        logger.info(f"{metric}: {result['value']:.2f} (threshold: {result['threshold']}) {status}")
    
    # Print recommendations
    logger.info("\n💡 RECOMMENDATIONS:")
    for rec in report['recommendations']:
        logger.info(f"• {rec}")
    
    # Save report to file
    if args.output_file:
        with open(args.output_file, 'w') as f:
            json.dump(report, f, indent=2)
        logger.info(f"\n📄 Full report saved to: {args.output_file}")
    
    # Generate timestamped report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    default_filename = f"load_test_report_{timestamp}.json"
    with open(default_filename, 'w') as f:
        json.dump(report, f, indent=2)
    logger.info(f"📄 Report also saved to: {default_filename}")
    
    # Final verdict
    if report['performance_analysis']['all_thresholds_passed']:
        logger.info("\n🎉 All performance thresholds PASSED! Application is ready for production load.")
        return 0
    else:
        logger.error("\n⚠️  Some performance thresholds FAILED. Review recommendations before deployment.")
        return 1

if __name__ == '__main__':
    import sys
    sys.exit(asyncio.run(main()))
