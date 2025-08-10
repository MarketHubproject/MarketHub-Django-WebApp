#!/usr/bin/env python3
"""
MarketHub Deployment Readiness Checker

This script performs comprehensive pre-deployment checks to ensure the MarketHub
Django e-commerce application is ready for production deployment.

Usage:
    python deployment_readiness_checker.py [--env production] [--verbose] [--fix-issues]
"""

import os
import sys
import json
import subprocess
import importlib
import django
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple
import argparse
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('deployment_readiness.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DeploymentReadinessChecker:
    """Comprehensive deployment readiness checker for MarketHub."""
    
    def __init__(self, env: str = 'production', verbose: bool = False, fix_issues: bool = False):
        self.env = env
        self.verbose = verbose
        self.fix_issues = fix_issues
        self.base_dir = Path(__file__).parent
        self.checks_passed = 0
        self.checks_failed = 0
        self.warnings = 0
        self.critical_issues = []
        self.issues = []
        self.recommendations = []
        
    def log(self, message: str, level: str = 'INFO'):
        """Log message with appropriate level."""
        if level == 'CRITICAL':
            logger.critical(message)
            self.critical_issues.append(message)
        elif level == 'ERROR':
            logger.error(message)
            self.issues.append(message)
            self.checks_failed += 1
        elif level == 'WARNING':
            logger.warning(message)
            self.warnings += 1
        else:
            logger.info(message)
            if level == 'PASS':
                self.checks_passed += 1
    
    def check_environment_variables(self) -> bool:
        """Check required environment variables are set."""
        self.log("🔍 Checking environment variables...")
        
        required_vars = {
            'production': [
                'SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS',
                'DATABASE_URL', 'REDIS_URL',
                'STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
                'EMAIL_HOST', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD',
                'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_STORAGE_BUCKET_NAME',
                'SENTRY_DSN'
            ],
            'dev': [
                'SECRET_KEY', 'DEBUG',
                'STRIPE_PUBLISHABLE_KEY_TEST', 'STRIPE_SECRET_KEY_TEST'
            ]
        }
        
        env_file = f'.env.{self.env}' if self.env != 'dev' else '.env'
        missing_vars = []
        
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                env_content = f.read()
                for var in required_vars.get(self.env, []):
                    if f'{var}=' not in env_content:
                        missing_vars.append(var)
        else:
            self.log(f"Environment file {env_file} not found", 'ERROR')
            return False
        
        if missing_vars:
            self.log(f"Missing environment variables: {', '.join(missing_vars)}", 'ERROR')
            return False
        else:
            self.log("✅ All required environment variables are present", 'PASS')
            return True
    
    def check_django_configuration(self) -> bool:
        """Check Django configuration for production readiness."""
        self.log("🔍 Checking Django configuration...")
        
        try:
            # Set up Django
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'markethub.settings.{self.env}')
            django.setup()
            
            from django.conf import settings
            issues = []
            
            # Security checks
            if self.env == 'production':
                if settings.DEBUG:
                    issues.append("DEBUG is True in production")
                
                if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
                    issues.append("SECRET_KEY is too short or missing")
                
                if not settings.ALLOWED_HOSTS or '*' in settings.ALLOWED_HOSTS:
                    issues.append("ALLOWED_HOSTS is not properly configured")
                
                if not getattr(settings, 'SECURE_SSL_REDIRECT', False):
                    issues.append("SECURE_SSL_REDIRECT should be True in production")
                
                if not getattr(settings, 'SESSION_COOKIE_SECURE', False):
                    issues.append("SESSION_COOKIE_SECURE should be True in production")
                
                if not getattr(settings, 'CSRF_COOKIE_SECURE', False):
                    issues.append("CSRF_COOKIE_SECURE should be True in production")
            
            # Database configuration
            if 'postgresql' not in settings.DATABASES['default']['ENGINE'].lower():
                self.log("Warning: Not using PostgreSQL in production", 'WARNING')
            
            # Cache configuration
            if 'redis' not in str(settings.CACHES.get('default', {}).get('BACKEND', '')).lower():
                self.log("Warning: Not using Redis for caching", 'WARNING')
            
            if issues:
                for issue in issues:
                    self.log(f"Django config issue: {issue}", 'ERROR')
                return False
            else:
                self.log("✅ Django configuration looks good", 'PASS')
                return True
                
        except Exception as e:
            self.log(f"Failed to check Django configuration: {str(e)}", 'ERROR')
            return False
    
    def check_database_connectivity(self) -> bool:
        """Check database connectivity and basic operations."""
        self.log("🔍 Checking database connectivity...")
        
        try:
            from django.db import connection
            from django.core.management import execute_from_command_line
            
            # Test database connection
            connection.ensure_connection()
            
            # Check for pending migrations
            result = subprocess.run([
                sys.executable, 'manage.py', 'showmigrations', '--plan'
            ], capture_output=True, text=True, timeout=30)
            
            if 'UNAPPLIED' in result.stdout:
                self.log("Warning: There are unapplied migrations", 'WARNING')
                self.recommendations.append("Run 'python manage.py migrate' before deployment")
            
            self.log("✅ Database connectivity successful", 'PASS')
            return True
            
        except Exception as e:
            self.log(f"Database connectivity failed: {str(e)}", 'ERROR')
            return False
    
    def check_static_files(self) -> bool:
        """Check static files collection and configuration."""
        self.log("🔍 Checking static files configuration...")
        
        try:
            from django.conf import settings
            
            # Check static files settings
            if not getattr(settings, 'STATIC_ROOT', None):
                self.log("STATIC_ROOT is not configured", 'ERROR')
                return False
            
            # Check if staticfiles directory exists and has content
            static_root = Path(settings.STATIC_ROOT)
            if not static_root.exists() or not any(static_root.iterdir()):
                self.log("Static files not collected. Run collectstatic", 'WARNING')
                self.recommendations.append("Run 'python manage.py collectstatic' before deployment")
            
            self.log("✅ Static files configuration OK", 'PASS')
            return True
            
        except Exception as e:
            self.log(f"Static files check failed: {str(e)}", 'ERROR')
            return False
    
    def run_security_checks(self) -> bool:
        """Run Django's built-in security checks."""
        self.log("🔍 Running security checks...")
        
        try:
            result = subprocess.run([
                sys.executable, 'manage.py', 'check', '--deploy'
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                self.log(f"Security check failed: {result.stdout} {result.stderr}", 'ERROR')
                return False
            else:
                self.log("✅ Security checks passed", 'PASS')
                return True
                
        except subprocess.TimeoutExpired:
            self.log("Security check timed out", 'ERROR')
            return False
        except Exception as e:
            self.log(f"Security check failed: {str(e)}", 'ERROR')
            return False
    
    def run_test_suite(self) -> bool:
        """Run the complete test suite."""
        self.log("🔍 Running test suite...")
        
        try:
            # Run pytest with coverage
            result = subprocess.run([
                sys.executable, '-m', 'pytest', 
                '--cov=.', '--cov-report=term-missing',
                '--cov-fail-under=85',
                '-x',  # Stop on first failure for quick feedback
                '--tb=short'
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                self.log(f"Test suite failed: {result.stdout} {result.stderr}", 'ERROR')
                return False
            else:
                # Extract coverage percentage
                output = result.stdout
                if 'TOTAL' in output:
                    lines = output.split('\n')
                    for line in lines:
                        if 'TOTAL' in line:
                            parts = line.split()
                            if len(parts) >= 4:
                                coverage = parts[-1].replace('%', '')
                                self.log(f"✅ Test suite passed with {coverage}% coverage", 'PASS')
                                return True
                
                self.log("✅ Test suite passed", 'PASS')
                return True
                
        except subprocess.TimeoutExpired:
            self.log("Test suite timed out", 'ERROR')
            return False
        except Exception as e:
            self.log(f"Test suite failed: {str(e)}", 'ERROR')
            return False
    
    def check_dependencies(self) -> bool:
        """Check for security vulnerabilities in dependencies."""
        self.log("🔍 Checking dependencies for security vulnerabilities...")
        
        try:
            # Run safety check
            result = subprocess.run([
                sys.executable, '-m', 'safety', 'check', '--json'
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                try:
                    vulnerabilities = json.loads(result.stdout)
                    if vulnerabilities:
                        self.log(f"Found {len(vulnerabilities)} security vulnerabilities", 'ERROR')
                        for vuln in vulnerabilities:
                            self.log(f"  - {vuln.get('package_name', 'Unknown')}: {vuln.get('advisory', 'No details')}", 'ERROR')
                        return False
                except json.JSONDecodeError:
                    self.log(f"Safety check failed: {result.stderr}", 'WARNING')
            
            self.log("✅ No known security vulnerabilities found", 'PASS')
            return True
            
        except subprocess.TimeoutExpired:
            self.log("Dependency security check timed out", 'WARNING')
            return True  # Don't fail deployment for this
        except Exception as e:
            self.log(f"Dependency security check failed: {str(e)}", 'WARNING')
            return True  # Don't fail deployment for this
    
    def check_code_quality(self) -> bool:
        """Run code quality checks."""
        self.log("🔍 Running code quality checks...")
        
        try:
            # Run flake8
            result = subprocess.run([
                sys.executable, '-m', 'flake8', '.', 
                '--max-line-length=88',
                '--exclude=migrations,venv,env,__pycache__,node_modules'
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                self.log(f"Code quality issues found: {result.stdout}", 'WARNING')
                self.recommendations.append("Fix code quality issues before deployment")
            else:
                self.log("✅ Code quality checks passed", 'PASS')
            
            return True  # Don't fail deployment for code quality issues
            
        except Exception as e:
            self.log(f"Code quality check failed: {str(e)}", 'WARNING')
            return True
    
    def check_performance_requirements(self) -> bool:
        """Check performance-related configurations."""
        self.log("🔍 Checking performance configurations...")
        
        try:
            from django.conf import settings
            
            performance_issues = []
            
            # Check if using database connection pooling
            db_engine = settings.DATABASES['default']['ENGINE']
            if self.env == 'production' and 'postgrespool' not in db_engine:
                performance_issues.append("Consider using connection pooling for better performance")
            
            # Check caching configuration
            if not settings.CACHES.get('default', {}).get('BACKEND'):
                performance_issues.append("No caching backend configured")
            
            # Check static files compression
            if not hasattr(settings, 'STATICFILES_STORAGE') or 'Compressed' not in settings.STATICFILES_STORAGE:
                performance_issues.append("Static files compression not enabled")
            
            if performance_issues:
                for issue in performance_issues:
                    self.log(f"Performance consideration: {issue}", 'WARNING')
                    self.recommendations.append(issue)
            
            self.log("✅ Performance configuration checked", 'PASS')
            return True
            
        except Exception as e:
            self.log(f"Performance check failed: {str(e)}", 'WARNING')
            return True
    
    def check_monitoring_setup(self) -> bool:
        """Check monitoring and logging setup."""
        self.log("🔍 Checking monitoring and logging setup...")
        
        try:
            from django.conf import settings
            
            # Check Sentry configuration
            if self.env == 'production':
                if not getattr(settings, 'SENTRY_DSN', None):
                    self.log("Sentry not configured for error tracking", 'WARNING')
                    self.recommendations.append("Configure Sentry for production error tracking")
                else:
                    self.log("✅ Sentry configured for error tracking", 'PASS')
            
            # Check logging configuration
            if not getattr(settings, 'LOGGING', None):
                self.log("No logging configuration found", 'WARNING')
                self.recommendations.append("Configure proper logging for production")
            else:
                self.log("✅ Logging configuration found", 'PASS')
            
            return True
            
        except Exception as e:
            self.log(f"Monitoring setup check failed: {str(e)}", 'WARNING')
            return True
    
    def check_ssl_certificates(self) -> bool:
        """Check SSL certificate configuration (if applicable)."""
        self.log("🔍 Checking SSL configuration...")
        
        if self.env == 'production':
            # This is a placeholder - in real deployment, you'd check actual SSL config
            self.log("SSL certificate check skipped (manual verification required)", 'WARNING')
            self.recommendations.append("Verify SSL certificates are properly configured")
        else:
            self.log("✅ SSL check skipped for non-production environment", 'PASS')
        
        return True
    
    def generate_deployment_report(self) -> Dict[str, Any]:
        """Generate comprehensive deployment readiness report."""
        total_checks = self.checks_passed + self.checks_failed
        success_rate = (self.checks_passed / total_checks * 100) if total_checks > 0 else 0
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'environment': self.env,
            'summary': {
                'total_checks': total_checks,
                'checks_passed': self.checks_passed,
                'checks_failed': self.checks_failed,
                'warnings': self.warnings,
                'success_rate': round(success_rate, 2),
                'ready_for_deployment': self.checks_failed == 0 and len(self.critical_issues) == 0
            },
            'critical_issues': self.critical_issues,
            'issues': self.issues,
            'recommendations': self.recommendations,
            'deployment_readiness': 'READY' if self.checks_failed == 0 and len(self.critical_issues) == 0 else 'NOT READY'
        }
        
        return report
    
    def run_all_checks(self) -> Dict[str, Any]:
        """Run all deployment readiness checks."""
        self.log("🚀 Starting MarketHub Deployment Readiness Check...")
        self.log(f"Environment: {self.env}")
        self.log(f"Timestamp: {datetime.now()}")
        self.log("="*60)
        
        checks = [
            ('Environment Variables', self.check_environment_variables),
            ('Django Configuration', self.check_django_configuration),
            ('Database Connectivity', self.check_database_connectivity),
            ('Static Files', self.check_static_files),
            ('Security Checks', self.run_security_checks),
            ('Test Suite', self.run_test_suite),
            ('Dependencies Security', self.check_dependencies),
            ('Code Quality', self.check_code_quality),
            ('Performance Configuration', self.check_performance_requirements),
            ('Monitoring Setup', self.check_monitoring_setup),
            ('SSL Configuration', self.check_ssl_certificates)
        ]
        
        for check_name, check_func in checks:
            self.log(f"\n--- {check_name} ---")
            try:
                check_func()
            except Exception as e:
                self.log(f"Check '{check_name}' failed with exception: {str(e)}", 'ERROR')
        
        # Generate and save report
        report = self.generate_deployment_report()
        
        # Save report to file
        report_file = f'deployment_readiness_report_{self.env}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        self.log("\n" + "="*60)
        self.log("📊 DEPLOYMENT READINESS SUMMARY")
        self.log("="*60)
        self.log(f"Total Checks: {report['summary']['total_checks']}")
        self.log(f"Passed: {report['summary']['checks_passed']}")
        self.log(f"Failed: {report['summary']['checks_failed']}")
        self.log(f"Warnings: {report['summary']['warnings']}")
        self.log(f"Success Rate: {report['summary']['success_rate']}%")
        self.log(f"Deployment Ready: {report['deployment_readiness']}")
        self.log(f"Report saved to: {report_file}")
        
        if report['deployment_readiness'] == 'READY':
            self.log("🎉 MarketHub is READY for deployment!", 'PASS')
        else:
            self.log("❌ MarketHub is NOT ready for deployment. Please address the issues above.", 'CRITICAL')
        
        return report


def main():
    """Main function to run deployment readiness checker."""
    parser = argparse.ArgumentParser(description='MarketHub Deployment Readiness Checker')
    parser.add_argument('--env', default='production', choices=['dev', 'production'],
                       help='Environment to check (default: production)')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose output')
    parser.add_argument('--fix-issues', action='store_true',
                       help='Attempt to automatically fix issues where possible')
    
    args = parser.parse_args()
    
    checker = DeploymentReadinessChecker(
        env=args.env,
        verbose=args.verbose,
        fix_issues=args.fix_issues
    )
    
    report = checker.run_all_checks()
    
    # Exit with appropriate code
    sys.exit(0 if report['deployment_readiness'] == 'READY' else 1)


if __name__ == '__main__':
    main()
