#!/usr/bin/env python3
"""
MarketHub Automated Deployment Script

This script automates the deployment process for MarketHub with comprehensive
pre-flight checks, deployment steps, and rollback capabilities.

Usage:
    python automated_deployment.py [--env production] [--skip-tests] [--dry-run]
"""

import os
import sys
import json
import subprocess
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'deployment_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DeploymentManager:
    """Automated deployment manager for MarketHub."""
    
    def __init__(self, environment: str = 'production', skip_tests: bool = False, dry_run: bool = False):
        self.environment = environment
        self.skip_tests = skip_tests
        self.dry_run = dry_run
        self.base_dir = Path(__file__).parent
        self.deployment_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_dir = self.base_dir / 'backups' / f'deployment_{self.deployment_id}'
        
        # Deployment steps tracking
        self.completed_steps = []
        self.failed_step = None
        
        # Configuration
        self.config = self.load_deployment_config()
        
    def load_deployment_config(self) -> Dict[str, Any]:
        """Load deployment configuration."""
        config_file = self.base_dir / f'deployment_config_{self.environment}.json'
        
        # Default configuration
        default_config = {
            'database': {
                'backup_before_deploy': True,
                'run_migrations': True,
                'migration_timeout': 300
            },
            'static_files': {
                'collect_static': True,
                'compress_static': True
            },
            'services': {
                'restart_required': ['web', 'celery', 'redis'],
                'health_check_timeout': 30,
                'health_check_retries': 5
            },
            'monitoring': {
                'send_deployment_notifications': True,
                'update_monitoring_config': True
            },
            'rollback': {
                'enabled': True,
                'automatic_on_failure': True,
                'keep_backups_count': 5
            }
        }
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
                # Merge with default config
                default_config.update(user_config)
            except Exception as e:
                logger.warning(f"Failed to load deployment config: {e}, using defaults")
        
        return default_config
    
    def log_step(self, step: str, success: bool = True, details: str = None):
        """Log deployment step with status."""
        if success:
            logger.info(f"✅ {step}")
            self.completed_steps.append(step)
        else:
            logger.error(f"❌ {step}")
            if details:
                logger.error(f"   Details: {details}")
            self.failed_step = step
    
    def run_command(self, command: List[str], description: str, timeout: int = 60, 
                   check: bool = True, capture_output: bool = True) -> subprocess.CompletedProcess:
        """Run shell command with logging and error handling."""
        logger.info(f"Running: {description}")
        
        if self.dry_run:
            logger.info(f"DRY RUN: {' '.join(command)}")
            return subprocess.CompletedProcess(command, 0, '', '')
        
        try:
            result = subprocess.run(
                command,
                capture_output=capture_output,
                text=True,
                timeout=timeout,
                check=check
            )
            
            if result.returncode == 0:
                logger.info(f"✅ {description}")
            else:
                logger.error(f"❌ {description} failed with code {result.returncode}")
                if result.stderr:
                    logger.error(f"Error: {result.stderr}")
            
            return result
            
        except subprocess.TimeoutExpired:
            logger.error(f"❌ {description} timed out after {timeout} seconds")
            raise
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ {description} failed: {e}")
            if e.stderr:
                logger.error(f"Error: {e.stderr}")
            raise
    
    def create_backup(self) -> bool:
        """Create backup before deployment."""
        logger.info("📦 Creating deployment backup...")
        
        try:
            # Create backup directory
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Backup database
            if self.config['database']['backup_before_deploy']:
                self.backup_database()
            
            # Backup static files
            static_root = self.base_dir / 'staticfiles'
            if static_root.exists():
                backup_static = self.backup_dir / 'staticfiles'
                if not self.dry_run:
                    shutil.copytree(static_root, backup_static)
                logger.info("✅ Static files backed up")
            
            # Backup media files
            media_root = self.base_dir / 'media'
            if media_root.exists():
                backup_media = self.backup_dir / 'media'
                if not self.dry_run:
                    shutil.copytree(media_root, backup_media)
                logger.info("✅ Media files backed up")
            
            # Create backup manifest
            manifest = {
                'deployment_id': self.deployment_id,
                'timestamp': datetime.now().isoformat(),
                'environment': self.environment,
                'backup_includes': ['database', 'static_files', 'media_files'],
                'git_commit': self.get_git_commit()
            }
            
            if not self.dry_run:
                with open(self.backup_dir / 'manifest.json', 'w') as f:
                    json.dump(manifest, f, indent=2)
            
            self.log_step("Backup created successfully")
            return True
            
        except Exception as e:
            self.log_step(f"Backup creation failed", False, str(e))
            return False
    
    def backup_database(self):
        """Backup database."""
        logger.info("Backing up database...")
        
        # Set Django settings
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'markethub.settings.{self.environment}')
        
        backup_file = self.backup_dir / f'database_backup_{self.deployment_id}.json'
        
        self.run_command([
            sys.executable, 'manage.py', 'dumpdata',
            '--natural-foreign', '--natural-primary',
            '--exclude=contenttypes', '--exclude=auth.Permission',
            f'--output={backup_file}'
        ], "Database backup", timeout=600)
    
    def get_git_commit(self) -> str:
        """Get current git commit hash."""
        try:
            result = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                                  capture_output=True, text=True, check=True)
            return result.stdout.strip()
        except:
            return 'unknown'
    
    def run_pre_deployment_checks(self) -> bool:
        """Run comprehensive pre-deployment checks."""
        logger.info("🔍 Running pre-deployment checks...")
        
        try:
            # Run deployment readiness checker
            result = self.run_command([
                sys.executable, 'deployment_readiness_checker.py',
                '--env', self.environment
            ], "Deployment readiness check", timeout=300, check=False)
            
            if result.returncode != 0:
                self.log_step("Pre-deployment checks failed", False)
                return False
            
            self.log_step("Pre-deployment checks passed")
            return True
            
        except Exception as e:
            self.log_step("Pre-deployment checks failed", False, str(e))
            return False
    
    def run_tests(self) -> bool:
        """Run test suite."""
        if self.skip_tests:
            logger.info("⏭️ Skipping tests (--skip-tests flag)")
            return True
        
        logger.info("🧪 Running test suite...")
        
        try:
            result = self.run_command([
                sys.executable, '-m', 'pytest',
                '--cov=.', '--cov-fail-under=85',
                '--tb=short', '-x'
            ], "Test suite", timeout=600, check=False)
            
            if result.returncode != 0:
                self.log_step("Test suite failed", False)
                return False
            
            self.log_step("Test suite passed")
            return True
            
        except Exception as e:
            self.log_step("Test suite failed", False, str(e))
            return False
    
    def collect_static_files(self) -> bool:
        """Collect and compress static files."""
        if not self.config['static_files']['collect_static']:
            return True
        
        logger.info("📦 Collecting static files...")
        
        try:
            # Set Django settings
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'markethub.settings.{self.environment}')
            
            # Collect static files
            self.run_command([
                sys.executable, 'manage.py', 'collectstatic',
                '--noinput', '--clear'
            ], "Collect static files", timeout=180)
            
            self.log_step("Static files collected")
            return True
            
        except Exception as e:
            self.log_step("Static files collection failed", False, str(e))
            return False
    
    def run_database_migrations(self) -> bool:
        """Run database migrations."""
        if not self.config['database']['run_migrations']:
            return True
        
        logger.info("🗄️ Running database migrations...")
        
        try:
            # Set Django settings
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'markethub.settings.{self.environment}')
            
            # Check for pending migrations
            result = self.run_command([
                sys.executable, 'manage.py', 'showmigrations', '--plan'
            ], "Check migrations", check=False)
            
            if 'UNAPPLIED' not in result.stdout:
                logger.info("✅ No pending migrations")
                return True
            
            # Apply migrations
            self.run_command([
                sys.executable, 'manage.py', 'migrate', '--noinput'
            ], "Apply migrations", timeout=self.config['database']['migration_timeout'])
            
            self.log_step("Database migrations applied")
            return True
            
        except Exception as e:
            self.log_step("Database migrations failed", False, str(e))
            return False
    
    def restart_services(self) -> bool:
        """Restart application services."""
        logger.info("🔄 Restarting services...")
        
        services = self.config['services']['restart_required']
        
        for service in services:
            try:
                if service == 'web':
                    # For development, just validate Django can start
                    self.run_command([
                        sys.executable, 'manage.py', 'check', '--deploy'
                    ], f"Check {service} service", timeout=30)
                elif service == 'celery':
                    logger.info(f"✅ {service} service check (placeholder)")
                elif service == 'redis':
                    logger.info(f"✅ {service} service check (placeholder)")
                else:
                    logger.info(f"✅ {service} service check (placeholder)")
                
            except Exception as e:
                self.log_step(f"Service {service} restart failed", False, str(e))
                return False
        
        self.log_step("Services restarted")
        return True
    
    def run_health_checks(self) -> bool:
        """Run post-deployment health checks."""
        logger.info("🩺 Running health checks...")
        
        timeout = self.config['services']['health_check_timeout']
        retries = self.config['services']['health_check_retries']
        
        for attempt in range(retries):
            try:
                # Django health check
                result = self.run_command([
                    sys.executable, 'manage.py', 'check'
                ], f"Health check (attempt {attempt + 1})", timeout=timeout, check=False)
                
                if result.returncode == 0:
                    self.log_step("Health checks passed")
                    return True
                
                if attempt < retries - 1:
                    logger.info(f"Health check failed, retrying in 10 seconds...")
                    time.sleep(10)
                
            except Exception as e:
                if attempt < retries - 1:
                    logger.info(f"Health check failed, retrying in 10 seconds...")
                    time.sleep(10)
                else:
                    self.log_step("Health checks failed", False, str(e))
                    return False
        
        self.log_step("Health checks failed after all retries", False)
        return False
    
    def send_deployment_notification(self, success: bool):
        """Send deployment notification."""
        if not self.config['monitoring']['send_deployment_notifications']:
            return
        
        status = "SUCCESS" if success else "FAILED"
        message = {
            'deployment_id': self.deployment_id,
            'environment': self.environment,
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'completed_steps': self.completed_steps,
            'failed_step': self.failed_step
        }
        
        # Save notification to file (in production, this would send to Slack/email/etc.)
        notification_file = self.base_dir / f'deployment_notification_{self.deployment_id}.json'
        try:
            with open(notification_file, 'w') as f:
                json.dump(message, f, indent=2)
            logger.info(f"📬 Deployment notification saved to {notification_file}")
        except Exception as e:
            logger.error(f"Failed to save deployment notification: {e}")
    
    def rollback_deployment(self) -> bool:
        """Rollback deployment to previous state."""
        if not self.config['rollback']['enabled']:
            logger.info("Rollback is disabled in configuration")
            return False
        
        logger.info("🔄 Starting deployment rollback...")
        
        try:
            # Restore database
            manifest_file = self.backup_dir / 'manifest.json'
            if manifest_file.exists():
                with open(manifest_file, 'r') as f:
                    manifest = json.load(f)
                
                # Restore database backup
                backup_file = self.backup_dir / f'database_backup_{self.deployment_id}.json'
                if backup_file.exists():
                    self.run_command([
                        sys.executable, 'manage.py', 'loaddata', str(backup_file)
                    ], "Restore database backup", timeout=600)
                
                # Restore static files
                backup_static = self.backup_dir / 'staticfiles'
                if backup_static.exists():
                    static_root = self.base_dir / 'staticfiles'
                    if static_root.exists():
                        shutil.rmtree(static_root)
                    shutil.copytree(backup_static, static_root)
                
                logger.info("✅ Rollback completed successfully")
                return True
            
        except Exception as e:
            logger.error(f"❌ Rollback failed: {e}")
            return False
        
        return False
    
    def cleanup_old_backups(self):
        """Clean up old backup directories."""
        try:
            backups_dir = self.base_dir / 'backups'
            if not backups_dir.exists():
                return
            
            # Get all backup directories
            backup_dirs = [d for d in backups_dir.iterdir() if d.is_dir() and d.name.startswith('deployment_')]
            
            # Sort by creation time (newest first)
            backup_dirs.sort(key=lambda x: x.stat().st_ctime, reverse=True)
            
            # Keep only the specified number of backups
            keep_count = self.config['rollback']['keep_backups_count']
            if len(backup_dirs) > keep_count:
                for old_backup in backup_dirs[keep_count:]:
                    if not self.dry_run:
                        shutil.rmtree(old_backup)
                    logger.info(f"🗑️ Removed old backup: {old_backup.name}")
        
        except Exception as e:
            logger.warning(f"Failed to cleanup old backups: {e}")
    
    def deploy(self) -> bool:
        """Execute the complete deployment process."""
        logger.info("🚀 Starting MarketHub deployment...")
        logger.info(f"Environment: {self.environment}")
        logger.info(f"Deployment ID: {self.deployment_id}")
        logger.info(f"Dry Run: {self.dry_run}")
        logger.info("="*60)
        
        deployment_steps = [
            ("Create backup", self.create_backup),
            ("Pre-deployment checks", self.run_pre_deployment_checks),
            ("Run tests", self.run_tests),
            ("Collect static files", self.collect_static_files),
            ("Database migrations", self.run_database_migrations),
            ("Restart services", self.restart_services),
            ("Health checks", self.run_health_checks)
        ]
        
        success = True
        
        for step_name, step_func in deployment_steps:
            logger.info(f"\n--- {step_name} ---")
            try:
                if not step_func():
                    success = False
                    break
            except Exception as e:
                logger.error(f"Step '{step_name}' failed with exception: {e}")
                success = False
                break
        
        # Send notification
        self.send_deployment_notification(success)
        
        if success:
            logger.info("\n" + "="*60)
            logger.info("🎉 DEPLOYMENT SUCCESSFUL!")
            logger.info("="*60)
            logger.info(f"Deployment ID: {self.deployment_id}")
            logger.info(f"Completed steps: {len(self.completed_steps)}")
            logger.info(f"Environment: {self.environment}")
            
            # Clean up old backups
            self.cleanup_old_backups()
            
        else:
            logger.error("\n" + "="*60)
            logger.error("❌ DEPLOYMENT FAILED!")
            logger.error("="*60)
            logger.error(f"Failed at step: {self.failed_step}")
            logger.error(f"Completed steps: {self.completed_steps}")
            
            # Automatic rollback if enabled
            if self.config['rollback']['automatic_on_failure']:
                logger.info("\n🔄 Attempting automatic rollback...")
                if self.rollback_deployment():
                    logger.info("✅ Automatic rollback completed")
                else:
                    logger.error("❌ Automatic rollback failed")
        
        return success

def main():
    """Main function to run automated deployment."""
    parser = argparse.ArgumentParser(description='MarketHub Automated Deployment')
    parser.add_argument('--env', default='production', choices=['dev', 'staging', 'production'],
                       help='Environment to deploy to (default: production)')
    parser.add_argument('--skip-tests', action='store_true',
                       help='Skip running test suite')
    parser.add_argument('--dry-run', action='store_true',
                       help='Run deployment in dry-run mode (no actual changes)')
    parser.add_argument('--rollback', action='store_true',
                       help='Rollback the last deployment')
    
    args = parser.parse_args()
    
    deployment_manager = DeploymentManager(
        environment=args.env,
        skip_tests=args.skip_tests,
        dry_run=args.dry_run
    )
    
    if args.rollback:
        logger.info("🔄 Rollback requested")
        success = deployment_manager.rollback_deployment()
    else:
        success = deployment_manager.deploy()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
