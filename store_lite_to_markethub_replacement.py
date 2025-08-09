#!/usr/bin/env python3
"""
Store Lite → MarketHub Complete Replacement Script

This script performs a comprehensive rebrand from Store Lite to MarketHub,
including file renames, content replacement, and database migrations.

Usage:
    python store_lite_to_markethub_replacement.py [--dry-run] [--stage STAGE]

Stages:
    1. files      - Rename files and directories
    2. content    - Replace content in files
    3. database   - Run database migrations
    4. assets     - Rebuild CSS/JS assets
    5. verify     - Verify the changes

Examples:
    # Full dry run
    python store_lite_to_markethub_replacement.py --dry-run
    
    # Run only content replacement
    python store_lite_to_markethub_replacement.py --stage content
    
    # Run specific stages
    python store_lite_to_markethub_replacement.py --stage files,content,assets
"""

import os
import shutil
import json
import re
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class StoreLiteToMarketHubReplacer:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.backup_dir = self.project_root / "rebrand_backups"
        self.changes_log = []
        
        # Define replacement mappings
        self.text_replacements = {
            # Basic text variations
            "Store Lite": "MarketHub",
            "store lite": "markethub", 
            "STORE LITE": "MARKETHUB",
            "Store_Lite": "MarketHub",
            "store_lite": "markethub",
            "STORE_LITE": "MARKETHUB",
            "store-lite": "markethub",
            "STORE-LITE": "MARKETHUB",
            "StoreLite": "MarketHub",
            "storelite": "markethub",
            "STORELITE": "MARKETHUB",
            
            # File and class specific
            "store_lite_": "markethub_",
            "store-lite-": "markethub-",
            ".store-lite": ".markethub",
            "#store-lite": "#markethub",
            "storelite_": "markethub_",
            "_storelite": "_markethub",
        }
        
        self.file_renames = {
            # CSS/SCSS files
            "homepage/static/MarketHub/css/store-lite.css": "homepage/static/MarketHub/css/markethub.css",
            "homepage/static/MarketHub/css/store-lite.css.map": "homepage/static/MarketHub/css/markethub.css.map",
            "homepage/static/MarketHub/scss/store-lite.scss": "homepage/static/MarketHub/scss/markethub.scss",
            "homepage/static/MarketHub/scss/_storelite_variables.scss": "homepage/static/MarketHub/scss/_markethub_variables.scss",
            
            # JavaScript files
            "homepage/static/MarketHub/store-lite.js": "homepage/static/MarketHub/markethub.js",
            
            # Documentation files
            "STORE_LITE_THEME.md": "MARKETHUB_THEME.md",
            "Store_Lite_Color_Palette.md": "MarketHub_Color_Palette.md",
            "Store_Lite_Design_Reference.md": "MarketHub_Design_Reference.md",
        }

    def create_backup(self, dry_run: bool = False) -> bool:
        """Create backup of current state."""
        logger.info("Creating backup...")
        
        if dry_run:
            logger.info(f"[DRY RUN] Would create backup at {self.backup_dir}")
            return True
            
        try:
            if self.backup_dir.exists():
                shutil.rmtree(self.backup_dir)
            self.backup_dir.mkdir(parents=True)
            
            # Backup key files and directories
            backup_items = [
                "homepage/static/MarketHub/",
                "homepage/templates/",
                "markethub/settings.py",
                "package.json",
                "README.md"
            ]
            
            for item in backup_items:
                source = self.project_root / item
                if source.exists():
                    dest = self.backup_dir / item
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    if source.is_dir():
                        shutil.copytree(source, dest, dirs_exist_ok=True)
                    else:
                        shutil.copy2(source, dest)
                        
            logger.info(f"Backup created at {self.backup_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False

    def rename_files(self, dry_run: bool = False) -> bool:
        """Rename files according to the mapping."""
        logger.info("Stage 1: Renaming files...")
        
        success = True
        renamed_count = 0
        
        for old_path, new_path in self.file_renames.items():
            old_file = self.project_root / old_path
            new_file = self.project_root / new_path
            
            if old_file.exists():
                logger.info(f"Renaming: {old_path} → {new_path}")
                
                if not dry_run:
                    try:
                        # Ensure parent directory exists
                        new_file.parent.mkdir(parents=True, exist_ok=True)
                        
                        # Move the file
                        old_file.rename(new_file)
                        renamed_count += 1
                        
                        self.changes_log.append({
                            "type": "file_rename",
                            "old": str(old_path),
                            "new": str(new_path)
                        })
                        
                    except Exception as e:
                        logger.error(f"Failed to rename {old_path}: {e}")
                        success = False
                else:
                    logger.info(f"[DRY RUN] Would rename: {old_path} → {new_path}")
                    renamed_count += 1
            else:
                logger.warning(f"File not found for rename: {old_path}")
        
        logger.info(f"Files renamed: {renamed_count}")
        return success

    def replace_content_in_file(self, file_path: Path, dry_run: bool = False) -> Tuple[bool, int]:
        """Replace content in a single file."""
        if not file_path.exists():
            return False, 0
            
        # Skip binary files
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
        except UnicodeDecodeError:
            return False, 0
        except Exception as e:
            logger.warning(f"Could not read {file_path}: {e}")
            return False, 0
            
        content = original_content
        changes_made = 0
        
        # Apply text replacements
        for old_text, new_text in self.text_replacements.items():
            if old_text in content:
                new_content = content.replace(old_text, new_text)
                changes_made += content.count(old_text)
                content = new_content
        
        # Apply regex patterns for more complex replacements
        regex_patterns = [
            # CSS class patterns
            (r'\bstore-lite\b', 'markethub'),
            (r'\bstorelite\b', 'markethub'),
            
            # Import/require patterns
            (r"from\s+['\"].*store.?lite", lambda m: m.group(0).replace('store-lite', 'markethub').replace('storelite', 'markethub')),
            (r"import\s+['\"].*store.?lite", lambda m: m.group(0).replace('store-lite', 'markethub').replace('storelite', 'markethub')),
            
            # URL patterns
            (r'/static/.*store.?lite', lambda m: m.group(0).replace('store-lite', 'markethub').replace('storelite', 'markethub')),
        ]
        
        for pattern, replacement in regex_patterns:
            if callable(replacement):
                matches = list(re.finditer(pattern, content, re.IGNORECASE))
                for match in reversed(matches):  # Replace from end to start
                    new_match = replacement(match)
                    content = content[:match.start()] + new_match + content[match.end():]
                    changes_made += 1
            else:
                matches = len(re.findall(pattern, content, re.IGNORECASE))
                if matches > 0:
                    content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
                    changes_made += matches
        
        # Write changes if content was modified
        if content != original_content and not dry_run:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True, changes_made
            except Exception as e:
                logger.error(f"Could not write {file_path}: {e}")
                return False, 0
        elif content != original_content and dry_run:
            return True, changes_made
            
        return False, changes_made

    def replace_content(self, dry_run: bool = False) -> bool:
        """Replace content in all relevant files."""
        logger.info("Stage 2: Replacing content in files...")
        
        # File extensions to process
        extensions = {'.py', '.js', '.html', '.css', '.scss', '.md', '.json', '.yml', '.yaml', '.txt', '.bat'}
        
        total_files = 0
        modified_files = 0
        total_changes = 0
        
        # Skip certain directories
        skip_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', 'rebrand_backups'}
        
        for root, dirs, files in os.walk(self.project_root):
            # Filter out skip directories
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            
            for file in files:
                file_path = Path(root) / file
                file_ext = file_path.suffix.lower()
                
                # Process files with relevant extensions
                if file_ext in extensions or not file_ext:
                    total_files += 1
                    modified, changes = self.replace_content_in_file(file_path, dry_run)
                    
                    if modified:
                        modified_files += 1
                        total_changes += changes
                        
                        if changes > 0:
                            logger.info(f"Modified {file_path.relative_to(self.project_root)}: {changes} changes")
                            
                            if not dry_run:
                                self.changes_log.append({
                                    "type": "content_change",
                                    "file": str(file_path.relative_to(self.project_root)),
                                    "changes": changes
                                })
        
        logger.info(f"Content replacement complete:")
        logger.info(f"  - Files processed: {total_files}")
        logger.info(f"  - Files modified: {modified_files}")
        logger.info(f"  - Total changes: {total_changes}")
        
        return True

    def run_database_migration(self, dry_run: bool = False) -> bool:
        """Run database migrations for the rebrand."""
        logger.info("Stage 3: Running database migrations...")
        
        if dry_run:
            logger.info("[DRY RUN] Would run database migration")
            return True
            
        try:
            # Check if migration file exists
            migration_file = self.project_root / "homepage/migrations/0002_update_store_lite_to_markethub.py"
            if not migration_file.exists():
                logger.warning("Database migration file not found")
                return False
            
            # Run the migration
            result = subprocess.run(
                ["python", "manage.py", "migrate", "homepage"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("Database migration completed successfully")
                self.changes_log.append({
                    "type": "database_migration",
                    "status": "success"
                })
                return True
            else:
                logger.error(f"Database migration failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Database migration error: {e}")
            return False

    def rebuild_assets(self, dry_run: bool = False) -> bool:
        """Rebuild CSS/JS assets after the rebrand."""
        logger.info("Stage 4: Rebuilding assets...")
        
        if dry_run:
            logger.info("[DRY RUN] Would rebuild CSS/JS assets")
            return True
            
        try:
            # Check if we have build scripts
            package_json = self.project_root / "package.json"
            if package_json.exists():
                # Try npm build
                result = subprocess.run(
                    ["npm", "run", "build"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    logger.info("NPM build completed successfully")
                else:
                    logger.warning(f"NPM build failed: {result.stderr}")
            
            # Try building SCSS directly
            scss_file = self.project_root / "homepage/static/MarketHub/scss/markethub.scss"
            css_file = self.project_root / "homepage/static/MarketHub/css/markethub.css"
            
            if scss_file.exists():
                # Try using sass command
                result = subprocess.run(
                    ["sass", str(scss_file), str(css_file)],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    logger.info("SCSS compiled successfully")
                    self.changes_log.append({
                        "type": "asset_build",
                        "status": "success"
                    })
                    return True
                else:
                    logger.warning(f"SCSS compilation failed: {result.stderr}")
            
            return True
            
        except Exception as e:
            logger.error(f"Asset rebuild error: {e}")
            return False

    def verify_changes(self, dry_run: bool = False) -> bool:
        """Verify that the rebrand was successful."""
        logger.info("Stage 5: Verifying changes...")
        
        issues = []
        
        # Check that renamed files exist
        for old_path, new_path in self.file_renames.items():
            new_file = self.project_root / new_path
            old_file = self.project_root / old_path
            
            if old_file.exists():
                issues.append(f"Old file still exists: {old_path}")
            if not new_file.exists() and not dry_run:
                issues.append(f"New file missing: {new_path}")
        
        # Check for remaining "Store Lite" references in key files
        check_files = [
            "homepage/templates/homepage/base.html",
            "markethub/settings.py",
            "README.md",
            "package.json"
        ]
        
        for file_path in check_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if "Store Lite" in content or "store-lite" in content:
                            issues.append(f"Still contains 'Store Lite' references: {file_path}")
                except Exception:
                    pass
        
        # Report verification results
        if issues:
            logger.warning("Verification found issues:")
            for issue in issues[:10]:  # Show first 10 issues
                logger.warning(f"  - {issue}")
            if len(issues) > 10:
                logger.warning(f"  ... and {len(issues) - 10} more issues")
            return False
        else:
            logger.info("Verification passed - rebrand appears successful!")
            return True

    def save_changes_log(self):
        """Save the changes log to a file."""
        log_file = self.project_root / "rebrand_changes_log.json"
        try:
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(self.changes_log, f, indent=2)
            logger.info(f"Changes log saved to {log_file}")
        except Exception as e:
            logger.error(f"Could not save changes log: {e}")

    def run(self, stages: List[str], dry_run: bool = False) -> bool:
        """Run the complete rebrand process."""
        logger.info(f"Starting Store Lite → MarketHub rebrand {'(DRY RUN)' if dry_run else ''}")
        logger.info(f"Project root: {self.project_root}")
        logger.info(f"Stages to run: {', '.join(stages)}")
        
        success = True
        
        # Create backup before starting
        if not dry_run and "files" in stages:
            if not self.create_backup(dry_run):
                logger.error("Backup failed - aborting")
                return False
        
        # Run stages
        if "files" in stages:
            if not self.rename_files(dry_run):
                success = False
        
        if "content" in stages:
            if not self.replace_content(dry_run):
                success = False
        
        if "database" in stages:
            if not self.run_database_migration(dry_run):
                success = False
        
        if "assets" in stages:
            if not self.rebuild_assets(dry_run):
                success = False
        
        if "verify" in stages:
            if not self.verify_changes(dry_run):
                success = False
        
        # Save changes log
        if not dry_run and self.changes_log:
            self.save_changes_log()
        
        logger.info(f"Rebrand {'completed' if success else 'completed with issues'}")
        return success


def main():
    parser = argparse.ArgumentParser(
        description="Store Lite → MarketHub Complete Replacement Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be changed without making changes")
    parser.add_argument("--stage", type=str, default="files,content,database,assets,verify",
                        help="Comma-separated list of stages to run (files,content,database,assets,verify)")
    parser.add_argument("--project-root", type=str, default=".",
                        help="Path to project root directory")
    
    args = parser.parse_args()
    
    # Parse stages
    stages = [s.strip() for s in args.stage.split(',')]
    valid_stages = {"files", "content", "database", "assets", "verify"}
    
    for stage in stages:
        if stage not in valid_stages:
            logger.error(f"Invalid stage: {stage}. Valid stages: {', '.join(valid_stages)}")
            return False
    
    # Initialize and run the replacer
    replacer = StoreLiteToMarketHubReplacer(args.project_root)
    success = replacer.run(stages, args.dry_run)
    
    return success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
