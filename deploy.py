#!/usr/bin/env python
"""
MarketHub Django WebApp Deployment Script
Supports staging and production deployment with rollback capabilities
"""
import os
import sys
import subprocess
import json
from datetime import datetime
import argparse


class Deployer:
    def __init__(self, environment='staging'):
        self.environment = environment
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.backup_dir = f"backups/{environment}_{self.timestamp}"

        # Environment-specific settings
        self.environments = {
            'staging': {
                'branch': 'develop',
                'remote': 'origin',
                'settings_module': 'markethub.settings.staging',
                'requirements_file': 'requirements.txt',
                'collect_static': True,
                'migrate': True,
                'run_tests': True,
                'load_fixtures': True
            },
            'production': {
                'branch': 'main',
                'remote': 'origin',
                'settings_module': 'markethub.settings.production',
                'requirements_file': 'requirements.txt',
                'collect_static': True,
                'migrate': True,
                'run_tests': True,
                'load_fixtures': False  # Don't load fixtures in production
            }
        }

    def log(self, message, level='INFO'):
        """Log deployment messages with timestamps"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] [{level}] {message}")

    def run_command(self, command, capture_output=False, check=True):
        """Run shell command with logging"""
        self.log(f"Running: {command}")
        try:
            # Split command into list for safer execution
            if isinstance(command, str):
                command_list = command.split()
            else:
                command_list = command
                
            if capture_output:
                result = subprocess.run(
                    command_list,
                    check=check,
                    capture_output=True,
                    text=True
                )
                return result
            else:
                subprocess.run(command_list, check=check)
        except subprocess.CalledProcessError as e:
            self.log(f"Command failed: {command}", 'ERROR')
            self.log(f"Error: {e}", 'ERROR')
            raise

    def create_backup(self):
        """Create backup of current state"""
        self.log(f"Creating backup to {self.backup_dir}")

        # Create backup directory
        os.makedirs(self.backup_dir, exist_ok=True)

        # Backup database
        db_backup_path = os.path.join(self.backup_dir, 'db_backup.sqlite3')
        if os.path.exists('db.sqlite3'):
            import shutil
            shutil.copy2('db.sqlite3', db_backup_path)
            self.log(f"Database backed up to {db_backup_path}")

        # Backup media files if they exist
        if os.path.exists('media'):
            import shutil
            media_backup_path = os.path.join(self.backup_dir, 'media')
            shutil.copytree('media', media_backup_path)
            self.log(f"Media files backed up to {media_backup_path}")

        # Save current git commit hash
        try:
            result = self.run_command('git rev-parse HEAD', capture_output=True)
            commit_hash = result.stdout.strip()

            backup_info = {
                'timestamp': self.timestamp,
                'environment': self.environment,
                'git_commit': commit_hash,
                'backup_dir': self.backup_dir
            }

            info_file = os.path.join(self.backup_dir, 'backup_info.json')
            with open(info_file, 'w') as f:
                json.dump(backup_info, f, indent=2)

            self.log(f"Backup info saved to {info_file}")
            return backup_info
        except Exception as e:
            self.log(f"Error getting git commit: {e}", 'WARNING')
            return None

    def run_tests(self):
        """Run the test suite"""
        self.log("Running test suite...")
        os.environ['DJANGO_SETTINGS_MODULE'] = 'markethub.settings'
        self.run_command('python manage.py test --verbosity=1')
        self.log("All tests passed!")

    def update_code(self):
        """Update code from git repository"""
        config = self.environments[self.environment]

        self.log(f"Updating code from {config['remote']}/{config['branch']}")

        # Fetch latest changes
        self.run_command(f"git fetch {config['remote']}")

        # Checkout target branch
        self.run_command(f"git checkout {config['branch']}")

        # Pull latest changes
        self.run_command(f"git pull {config['remote']} {config['branch']}")

        self.log("Code updated successfully")

    def install_dependencies(self):
        """Install/update Python dependencies"""
        config = self.environments[self.environment]

        self.log("Installing dependencies...")
        self.run_command(f"pip install -r {config['requirements_file']}")
        self.log("Dependencies installed successfully")

    def run_migrations(self):
        """Run database migrations"""
        config = self.environments[self.environment]

        if config['migrate']:
            self.log("Running database migrations...")
            os.environ['DJANGO_SETTINGS_MODULE'] = config['settings_module']
            self.run_command('python manage.py migrate --noinput')
            self.log("Migrations completed successfully")

    def collect_static_files(self):
        """Collect static files"""
        config = self.environments[self.environment]

        if config['collect_static']:
            self.log("Collecting static files...")
            os.environ['DJANGO_SETTINGS_MODULE'] = config['settings_module']
            self.run_command('python manage.py collectstatic --noinput')
            self.log("Static files collected successfully")

    def load_fixtures(self):
        """Load fixture data"""
        config = self.environments[self.environment]

        if config['load_fixtures']:
            self.log("Loading fixtures...")
            os.environ['DJANGO_SETTINGS_MODULE'] = config['settings_module']

            fixture_files = [
                'fixtures/users.json',
                'fixtures/categories.json',
                'fixtures/products.json',
                'fixtures/hero_slides.json',
                'fixtures/promotions.json',
                'fixtures/carts.json'
            ]

            for fixture in fixture_files:
                if os.path.exists(fixture):
                    self.run_command(f'python manage.py loaddata {fixture}')
                    self.log(f"Loaded fixture: {fixture}")
                else:
                    self.log(f"Fixture not found: {fixture}", 'WARNING')

    def restart_services(self):
        """Restart application services"""
        self.log("Services restart would happen here (platform-specific)")
        # This would be platform-specific (e.g., systemctl, supervisor, etc.)
        # For now, just log what would happen
        if self.environment == 'production':
            self.log("Would restart: nginx, gunicorn, redis, celery")
        else:
            self.log("Would restart: development server")

    def health_check(self):
        """Perform basic health check"""
        self.log("Performing health check...")

        # Check Django configuration
        os.environ['DJANGO_SETTINGS_MODULE'] = self.environments[self.environment]['settings_module']
        self.run_command('python manage.py check')

        # TODO: Add more health checks
        # - Database connectivity
        # - Redis connectivity (if used)
        # - External API connectivity
        # - Static files accessibility

        self.log("Health check passed!")

    def deploy(self):
        """Run full deployment process"""
        try:
            self.log(f"Starting {self.environment} deployment...")

            # Create backup
            backup_info = self.create_backup()

            # Pre-deployment tests (if enabled)
            config = self.environments[self.environment]
            if config.get('run_tests', False):
                self.run_tests()

            # Update code
            self.update_code()

            # Install dependencies
            self.install_dependencies()

            # Run migrations
            self.run_migrations()

            # Collect static files
            self.collect_static_files()

            # Load fixtures (staging only)
            self.load_fixtures()

            # Health check
            self.health_check()

            # Restart services
            self.restart_services()

            self.log(f"{self.environment.capitalize()} deployment completed successfully!")

            if backup_info:
                self.log(f"Backup created: {backup_info['backup_dir']}")
                self.log(f"To rollback: python deploy.py --rollback {backup_info['backup_dir']}")

        except Exception as e:
            self.log(f"Deployment failed: {e}", 'ERROR')
            if backup_info:
                self.log(f"Consider rolling back: python deploy.py --rollback {backup_info['backup_dir']}", 'ERROR')
            sys.exit(1)

    def rollback(self, backup_path):
        """Rollback to previous state"""
        self.log(f"Starting rollback to {backup_path}...")

        if not os.path.exists(backup_path):
            self.log(f"Backup path does not exist: {backup_path}", 'ERROR')
            sys.exit(1)

        # Load backup info
        info_file = os.path.join(backup_path, 'backup_info.json')
        if os.path.exists(info_file):
            with open(info_file, 'r') as f:
                backup_info = json.load(f)
            self.log(f"Rolling back to commit: {backup_info.get('git_commit', 'unknown')}")

        # Restore database
        db_backup = os.path.join(backup_path, 'db_backup.sqlite3')
        if os.path.exists(db_backup):
            import shutil
            shutil.copy2(db_backup, 'db.sqlite3')
            self.log("Database restored")

        # Restore media files
        media_backup = os.path.join(backup_path, 'media')
        if os.path.exists(media_backup):
            import shutil
            if os.path.exists('media'):
                shutil.rmtree('media')
            shutil.copytree(media_backup, 'media')
            self.log("Media files restored")

        # Restore git state if commit hash available
        if os.path.exists(info_file):
            try:
                git_commit = backup_info.get('git_commit')
                if git_commit:
                    self.run_command(f"git checkout {git_commit}")
                    self.log(f"Git state restored to {git_commit}")
            except Exception as e:
                self.log(f"Could not restore git state: {e}", 'WARNING')

        # Restart services
        self.restart_services()

        self.log("Rollback completed!")


def main():
    parser = argparse.ArgumentParser(description='MarketHub Deployment Script')
    parser.add_argument('--environment', '-e',
                        choices=['staging', 'production'],
                        default='staging',
                        help='Deployment environment')
    parser.add_argument('--rollback', '-r',
                        help='Rollback to specified backup directory')

    args = parser.parse_args()

    deployer = Deployer(args.environment)

    if args.rollback:
        deployer.rollback(args.rollback)
    else:
        deployer.deploy()


if __name__ == '__main__':
    main()
