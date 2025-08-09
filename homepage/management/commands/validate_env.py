"""
Django management command to validate environment configuration
Usage: python manage.py validate_env
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from decouple import config
import os
import sys
from django.core.exceptions import ImproperlyConfigured


class Command(BaseCommand):
    help = 'Validates environment configuration for MarketHub'

    def add_arguments(self, parser):
        parser.add_argument(
            '--strict',
            action='store_true',
            dest='strict',
            help='Enable strict validation (fail on warnings)',
        )
        parser.add_argument(
            '--environment',
            type=str,
            dest='environment',
            default='development',
            help='Target environment (development, staging, production)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🔍 MarketHub Environment Validation')
        )
        self.stdout.write('=' * 50)
        
        strict_mode = options['strict']
        target_env = options['environment']
        
        # Track validation results
        errors = []
        warnings = []
        success_count = 0
        
        # Core Django settings validation
        self.stdout.write('\n📋 Core Django Settings:')
        
        # Secret Key
        try:
            secret_key = settings.SECRET_KEY
            if secret_key == 'django-insecure-2!q%^8-0tdl57)##4u_dq!%g8bx#n590f=m(#_%2=%@463+1om':
                if target_env == 'production':
                    errors.append('SECRET_KEY is using default insecure key in production!')
                else:
                    warnings.append('SECRET_KEY is using default development key')
            else:
                self.stdout.write('  ✅ SECRET_KEY: Configured')
                success_count += 1
        except Exception as e:
            errors.append(f'SECRET_KEY: {str(e)}')
            
        # Debug mode
        try:
            debug_mode = settings.DEBUG
            if debug_mode and target_env == 'production':
                errors.append('DEBUG=True in production environment!')
            else:
                status = 'Enabled' if debug_mode else 'Disabled'
                self.stdout.write(f'  ✅ DEBUG: {status}')
                success_count += 1
        except Exception as e:
            errors.append(f'DEBUG: {str(e)}')
            
        # Allowed hosts
        try:
            allowed_hosts = settings.ALLOWED_HOSTS
            if not allowed_hosts and target_env == 'production':
                errors.append('ALLOWED_HOSTS is empty in production!')
            else:
                self.stdout.write(f'  ✅ ALLOWED_HOSTS: {allowed_hosts}')
                success_count += 1
        except Exception as e:
            errors.append(f'ALLOWED_HOSTS: {str(e)}')
            
        # Database validation
        self.stdout.write('\n🗃️  Database Settings:')
        try:
            db_config = settings.DATABASES['default']
            engine = db_config.get('ENGINE')
            name = db_config.get('NAME')
            
            self.stdout.write(f'  ✅ DATABASE_ENGINE: {engine}')
            self.stdout.write(f'  ✅ DATABASE_NAME: {name}')
            
            if engine == 'django.db.backends.sqlite3' and target_env == 'production':
                warnings.append('Using SQLite in production (consider PostgreSQL)')
                
            success_count += 2
        except Exception as e:
            errors.append(f'Database configuration: {str(e)}')
            
        # API Configuration validation
        self.stdout.write('\n🌐 API Settings:')
        try:
            api_url = settings.API_BASE_URL
            self.stdout.write(f'  ✅ API_BASE_URL: {api_url}')
            
            if 'localhost' in api_url or '127.0.0.1' in api_url:
                if target_env == 'production':
                    errors.append('API_BASE_URL points to localhost in production!')
                else:
                    success_count += 1
            else:
                success_count += 1
        except Exception as e:
            errors.append(f'API_BASE_URL: {str(e)}')
            
        # Static/Media files validation
        self.stdout.write('\n📁 Static & Media Files:')
        try:
            static_url = settings.STATIC_URL
            media_url = settings.MEDIA_URL
            static_root = settings.STATIC_ROOT
            media_root = settings.MEDIA_ROOT
            
            self.stdout.write(f'  ✅ STATIC_URL: {static_url}')
            self.stdout.write(f'  ✅ MEDIA_URL: {media_url}')
            self.stdout.write(f'  ✅ STATIC_ROOT: {static_root}')
            self.stdout.write(f'  ✅ MEDIA_ROOT: {media_root}')
            success_count += 4
        except Exception as e:
            errors.append(f'Static/Media files: {str(e)}')
            
        # Security settings validation for production
        if target_env == 'production':
            self.stdout.write('\n🔒 Security Settings (Production):')
            
            security_checks = [
                ('SECURE_SSL_REDIRECT', getattr(settings, 'SECURE_SSL_REDIRECT', False)),
                ('SESSION_COOKIE_SECURE', getattr(settings, 'SESSION_COOKIE_SECURE', False)),
                ('CSRF_COOKIE_SECURE', getattr(settings, 'CSRF_COOKIE_SECURE', False)),
                ('SECURE_BROWSER_XSS_FILTER', getattr(settings, 'SECURE_BROWSER_XSS_FILTER', False)),
                ('SECURE_CONTENT_TYPE_NOSNIFF', getattr(settings, 'SECURE_CONTENT_TYPE_NOSNIFF', False)),
            ]
            
            for setting_name, value in security_checks:
                if value:
                    self.stdout.write(f'  ✅ {setting_name}: Enabled')
                    success_count += 1
                else:
                    warnings.append(f'{setting_name} is not enabled for production')
                    
        # Environment file validation
        self.stdout.write('\n📄 Environment File:')
        env_file_path = os.path.join(settings.BASE_DIR, '.env')
        if os.path.exists(env_file_path):
            self.stdout.write('  ✅ .env file: Found')
            success_count += 1
        else:
            if target_env == 'development':
                warnings.append('.env file not found (using defaults)')
            else:
                self.stdout.write('  ✅ .env file: Not needed (using environment variables)')
                success_count += 1
                
        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('📊 Validation Summary:')
        self.stdout.write(f'  ✅ Passed: {success_count} checks')
        self.stdout.write(f'  ⚠️  Warnings: {len(warnings)} issues')
        self.stdout.write(f'  ❌ Errors: {len(errors)} critical issues')
        
        # Display warnings
        if warnings:
            self.stdout.write('\n⚠️  Warnings:')
            for warning in warnings:
                self.stdout.write(f'  - {warning}')
                
        # Display errors
        if errors:
            self.stdout.write('\n❌ Errors:')
            for error in errors:
                self.stdout.write(self.style.ERROR(f'  - {error}'))
                
        # Final status
        if errors:
            self.stdout.write(
                self.style.ERROR('\n🚨 Environment validation FAILED - Please fix errors above')
            )
            sys.exit(1)
        elif warnings and strict_mode:
            self.stdout.write(
                self.style.WARNING('\n⚠️  Environment validation FAILED in strict mode - Please fix warnings')
            )
            sys.exit(1)
        else:
            status_msg = '🎉 Environment validation PASSED'
            if warnings and not strict_mode:
                status_msg += ' (with warnings)'
            self.stdout.write(
                self.style.SUCCESS(f'\n{status_msg}')
            )
            
        # Environment-specific recommendations
        self.stdout.write(f'\n💡 Recommendations for {target_env} environment:')
        if target_env == 'production':
            self.stdout.write('  - Use PostgreSQL database')
            self.stdout.write('  - Enable all security settings')
            self.stdout.write('  - Use proper domain in API_BASE_URL')
            self.stdout.write('  - Configure email backend for notifications')
            self.stdout.write('  - Set up Redis for caching')
        elif target_env == 'development':
            self.stdout.write('  - Current configuration is suitable for development')
            self.stdout.write('  - Consider using .env file for local overrides')
        
        self.stdout.write('\n🔗 For deployment help, see: DEPLOYMENT.md')
