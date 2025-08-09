#!/usr/bin/env python3
"""
Cross-Platform Automated Rebranding Script

This script performs automated in-file replacements across the codebase with:
- MIME type filtering for non-binary files
- Case-sensitive regex replacements from mapping files
- Detailed logging with diff snippets for audit
- Exclusion of virtualenv, node_modules, compiled assets, .git
- Dry-run capability and Git integration

Usage:
    python automated_rebranding.py --dry-run      # Preview changes
    python automated_rebranding.py --execute      # Apply changes
    python automated_rebranding.py --commit       # Apply and commit changes

Requirements:
    pip install python-magic pyyaml
"""

import json
import yaml
import re
import os
import sys
import argparse
import shutil
import subprocess
import mimetypes
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional
from datetime import datetime
from dataclasses import dataclass
import difflib
import hashlib

# Try to import python-magic for better MIME detection
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
    print("Warning: python-magic not available. Using basic MIME detection.")
    print("Install with: pip install python-magic")


@dataclass
class FileChange:
    """Represents a single file change for audit logging."""
    file_path: str
    original_content: str
    modified_content: str
    changes_count: int
    mime_type: str
    file_size: int
    checksum_before: str
    checksum_after: str


class AutomatedRebranding:
    """Cross-platform automated rebranding tool with comprehensive features."""

    # Directories to exclude from processing
    EXCLUDED_DIRS = {
        '.git', '.svn', '.hg',               # Version control
        '__pycache__', '.pytest_cache',       # Python cache
        'node_modules', '.npm',               # Node.js
        '.venv', 'venv', 'env',              # Python virtual environments
        'virtualenv', '.virtualenv',          # More virtual env patterns
        'build', 'dist', 'target',           # Build outputs
        '.sass-cache', '.cache',             # Cache directories
        'coverage', '.coverage',             # Coverage reports
        '.idea', '.vscode',                  # IDE files
        'backups', '.backups',               # Backup directories
        'logs', '.logs'                      # Log directories
    }

    # File extensions for compiled/binary assets to exclude
    EXCLUDED_EXTENSIONS = {
        '.pyc', '.pyo', '.pyd',              # Python compiled
        '.class', '.jar',                    # Java compiled
        '.exe', '.dll', '.so', '.dylib',     # Executables/libraries
        '.zip', '.tar', '.gz', '.bz2',       # Archives
        '.jpg', '.jpeg', '.png', '.gif',     # Images
        '.bmp', '.tiff', '.webp', '.ico',    # More images
        '.mp3', '.wav', '.mp4', '.avi',      # Media files
        '.pdf', '.doc', '.docx', '.xls',     # Documents
        '.bin', '.dat', '.db', '.sqlite',    # Binary data
        '.min.js', '.min.css',               # Minified assets
        '.map',                              # Source maps
        '.lock'                              # Lock files
    }

    # Text file extensions that are safe to process
    TEXT_EXTENSIONS = {
        '.py', '.js', '.jsx', '.ts', '.tsx',  # Code files
        '.html', '.htm', '.xml', '.xhtml',   # Markup
        '.css', '.scss', '.sass', '.less',   # Stylesheets
        '.json', '.yaml', '.yml', '.toml',   # Config files
        '.md', '.txt', '.rst',               # Documentation
        '.ini', '.cfg', '.conf',             # Configuration
        '.sh', '.bat', '.ps1',               # Scripts
        '.sql',                              # Database
        '.env', '.env.example',              # Environment files
        '.gitignore', '.dockerignore',       # Ignore files
        ''                                   # Files without extension
    }

    def __init__(self, mapping_file: str = "search_replace_mapping.json"):
        """Initialize the rebranding tool."""
        self.mapping_file = mapping_file
        self.mappings = self._load_mappings()
        self.changes_made: List[FileChange] = []
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'files_skipped': 0,
            'total_changes': 0,
            'errors': []
        }

        # Setup logging
        self.setup_logging()

        # Initialize MIME detection
        if HAS_MAGIC:
            self.magic = magic.Magic(mime=True)

    def setup_logging(self):
        """Setup logging configuration."""
        log_filename = f"rebranding_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )

        self.logger = logging.getLogger(__name__)
        self.logger.info("=== Automated Rebranding Session Started ===")
        self.logger.info(f"Mapping file: {self.mapping_file}")

    def _load_mappings(self) -> Dict:
        """Load search-replace mappings from JSON or YAML file."""
        if not os.path.exists(self.mapping_file):
            raise FileNotFoundError(f"Mapping file not found: {self.mapping_file}")

        try:
            with open(self.mapping_file, 'r', encoding='utf-8') as f:
                if self.mapping_file.endswith(('.yaml', '.yml')):
                    return yaml.safe_load(f)
                else:
                    return json.load(f)
        except (json.JSONDecodeError, yaml.YAMLError) as e:
            raise ValueError(f"Error parsing mapping file: {e}")

    def _is_text_file(self, file_path: str) -> bool:
        """Determine if a file is a text file using MIME type detection."""
        file_ext = Path(file_path).suffix.lower()

        # Quick check for known binary extensions
        if file_ext in self.EXCLUDED_EXTENSIONS:
            return False

        # Quick check for known text extensions
        if file_ext in self.TEXT_EXTENSIONS:
            return True

        # Use python-magic if available
        if HAS_MAGIC:
            try:
                mime_type = self.magic.from_file(file_path)
                return mime_type.startswith('text/') or 'json' in mime_type or 'xml' in mime_type
            except Exception as e:
                self.logger.warning(f"Magic MIME detection failed for {file_path}: {e}")

        # Fallback to mimetypes module
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type:
            return mime_type.startswith('text/') or mime_type in [
                'application/json', 'application/xml', 'application/javascript'
            ]

        # Final fallback: try to read as text
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                f.read(1024)  # Try to read first 1KB
            return True
        except (UnicodeDecodeError, PermissionError):
            return False

    def _get_file_checksum(self, content: str) -> str:
        """Generate MD5 checksum of file content."""
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def _should_skip_directory(self, dir_path: str) -> bool:
        """Check if directory should be skipped."""
        dir_name = os.path.basename(dir_path).lower()
        return dir_name in self.EXCLUDED_DIRS

    def _should_skip_file(self, file_path: str) -> bool:
        """Check if file should be skipped."""
        file_name = os.path.basename(file_path)
        file_ext = Path(file_path).suffix.lower()

        # Skip by extension
        if file_ext in self.EXCLUDED_EXTENSIONS:
            return True

        # Skip specific patterns
        skip_patterns = [
            '.bak',          # Backup files
            '.backup',       # Backup files
            '.tmp',          # Temporary files
            '.temp',         # Temporary files
            '.orig',         # Original files
            '.log',          # Log files (don't modify existing logs)
            'audit_'         # Our own audit files
        ]

        for pattern in skip_patterns:
            if pattern in file_name.lower():
                return True

        return False

    def _apply_text_mappings(self, content: str, file_path: str) -> Tuple[str, int]:
        """Apply simple text mappings to content."""
        changes = 0
        original_content = content

        # Apply mappings in order of specificity (most specific first)
        mapping_groups = [
            ("special_cases", "package_json"),
            ("special_cases", "url_slugs"),
            ("special_cases", "database_fields"),
            ("context_specific", "titles_and_headings"),
            ("context_specific", "comments"),
            ("context_specific", "meta_tags"),
            ("text_mappings", "wrapped_variations"),
            ("text_mappings", "file_extensions"),
            ("text_mappings", "team_references"),
            ("text_mappings", "theme_references"),
            ("text_mappings", "directory_paths"),
            ("text_mappings", "css_class_variations"),
            ("text_mappings", "id_variations"),
            ("text_mappings", "variable_names"),
            ("text_mappings", "underscore_variations"),
            ("text_mappings", "hyphenated_variations"),
            ("text_mappings", "concatenated_variations"),
            ("text_mappings", "basic_variations"),
        ]

        for group_type, group_name in mapping_groups:
            if group_type not in self.mappings or group_name not in self.mappings[group_type]:
                continue

            mapping_group = self.mappings[group_type][group_name]
            for search_text, replace_text in mapping_group.items():
                if search_text in content:
                    content = content.replace(search_text, replace_text)
                    if content != original_content:
                        changes += 1
                        original_content = content

        return content, changes

    def _apply_regex_patterns(self, content: str, file_path: str) -> Tuple[str, int]:
        """Apply regex patterns to content."""
        changes = 0

        if "regex_patterns" not in self.mappings:
            return content, changes

        pattern_groups = [
            "word_boundary_patterns",
            "camelcase_patterns",
            "file_path_patterns",
            "css_scss_patterns",
            "html_attribute_patterns",
            "javascript_patterns",
        ]

        for group_name in pattern_groups:
            if group_name not in self.mappings["regex_patterns"]:
                continue

            pattern_group = self.mappings["regex_patterns"][group_name]

            # Handle both list and dict formats
            if isinstance(pattern_group, list):
                patterns = pattern_group
            elif isinstance(pattern_group, dict):
                patterns = [{"pattern": k, "replacement": v} for k, v in pattern_group.items()]
            else:
                continue

            for pattern_info in patterns:
                if isinstance(pattern_info, dict):
                    pattern = pattern_info["pattern"]
                    replacement = pattern_info["replacement"]
                else:
                    continue

                try:
                    # Apply case-sensitive regex by default
                    flags = re.MULTILINE
                    matches = len(re.findall(pattern, content, flags))
                    if matches > 0:
                        new_content = re.sub(pattern, replacement, content, flags=flags)
                        if new_content != content:
                            content = new_content
                            changes += matches
                except re.error as e:
                    self.logger.warning(f"Regex error in {file_path} with pattern '{pattern}': {e}")

        return content, changes

    def _generate_diff_snippet(self, original: str, modified: str, file_path: str) -> str:
        """Generate a diff snippet for audit logging."""
        original_lines = original.splitlines(keepends=True)
        modified_lines = modified.splitlines(keepends=True)

        diff = difflib.unified_diff(
            original_lines,
            modified_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            lineterm=''
        )

        return ''.join(diff)

    def process_file(self, file_path: str, dry_run: bool = True) -> Optional[FileChange]:
        """Process a single file with all mappings."""
        if self._should_skip_file(file_path):
            self.logger.debug(f"Skipping file by pattern: {file_path}")
            self.stats['files_skipped'] += 1
            return None

        if not self._is_text_file(file_path):
            self.logger.debug(f"Skipping binary file: {file_path}")
            self.stats['files_skipped'] += 1
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
        except Exception as e:
            error_msg = f"Could not read file {file_path}: {e}"
            self.logger.error(error_msg)
            self.stats['errors'].append(error_msg)
            return None

        # Get file info
        file_size = len(original_content.encode('utf-8'))
        checksum_before = self._get_file_checksum(original_content)

        # Detect MIME type
        mime_type = "text/plain"
        if HAS_MAGIC:
            try:
                mime_type = self.magic.from_file(file_path)
            except BaseException:
                pass

        # Apply transformations
        content = original_content
        total_changes = 0

        # Apply regex patterns first (more precise)
        content, changes = self._apply_regex_patterns(content, file_path)
        total_changes += changes

        # Then apply text mappings
        content, changes = self._apply_text_mappings(content, file_path)
        total_changes += changes

        # Create file change record
        if content != original_content:
            checksum_after = self._get_file_checksum(content)

            file_change = FileChange(
                file_path=file_path,
                original_content=original_content,
                modified_content=content,
                changes_count=total_changes,
                mime_type=mime_type,
                file_size=file_size,
                checksum_before=checksum_before,
                checksum_after=checksum_after
            )

            # Log the change with diff
            self.logger.info(f"Modified: {file_path} ({total_changes} changes)")
            diff_snippet = self._generate_diff_snippet(original_content, content, file_path)
            self.logger.debug(f"Diff for {file_path}:\n{diff_snippet}")

            # Write file if not dry run
            if not dry_run:
                try:
                    # Create backup
                    backup_path = f"{file_path}.bak"
                    shutil.copy2(file_path, backup_path)

                    # Write modified content
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

                    self.logger.info(f"Applied changes to: {file_path} (backup: {backup_path})")
                except Exception as e:
                    error_msg = f"Could not write file {file_path}: {e}"
                    self.logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    return None

            self.stats['files_modified'] += 1
            self.stats['total_changes'] += total_changes
            return file_change
        else:
            self.logger.debug(f"No changes needed: {file_path}")

        self.stats['files_processed'] += 1
        return None

    def process_directory(self, directory: str, dry_run: bool = True) -> List[FileChange]:
        """Process all files in a directory recursively."""
        self.logger.info(f"Processing directory: {directory} ({'DRY RUN' if dry_run else 'APPLYING CHANGES'})")

        file_changes = []

        for root, dirs, files in os.walk(directory):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if not self._should_skip_directory(os.path.join(root, d))]

            for file in files:
                file_path = os.path.join(root, file)

                try:
                    change = self.process_file(file_path, dry_run)
                    if change:
                        file_changes.append(change)
                        self.changes_made.append(change)
                except Exception as e:
                    error_msg = f"Error processing {file_path}: {e}"
                    self.logger.error(error_msg)
                    self.stats['errors'].append(error_msg)

        return file_changes

    def generate_audit_report(self) -> str:
        """Generate a comprehensive audit report."""
        report = []
        report.append("=== AUTOMATED REBRANDING AUDIT REPORT ===")
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append(f"Mapping file: {self.mapping_file}")
        report.append("")

        # Summary statistics
        report.append("SUMMARY:")
        report.append(f"  Files processed: {self.stats['files_processed']}")
        report.append(f"  Files modified: {self.stats['files_modified']}")
        report.append(f"  Files skipped: {self.stats['files_skipped']}")
        report.append(f"  Total changes: {self.stats['total_changes']}")
        report.append(f"  Errors: {len(self.stats['errors'])}")
        report.append("")

        # File changes details
        if self.changes_made:
            report.append("MODIFIED FILES:")
            for change in self.changes_made:
                report.append(f"  File: {change.file_path}")
                report.append(f"    MIME Type: {change.mime_type}")
                report.append(f"    Size: {change.file_size} bytes")
                report.append(f"    Changes: {change.changes_count}")
                report.append(f"    Checksum Before: {change.checksum_before}")
                report.append(f"    Checksum After: {change.checksum_after}")
                report.append("")

        # Errors
        if self.stats['errors']:
            report.append("ERRORS:")
            for error in self.stats['errors']:
                report.append(f"  - {error}")
            report.append("")

        return '\n'.join(report)

    def save_audit_report(self) -> str:
        """Save audit report to file."""
        report_filename = f"rebranding_audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        report_content = self.generate_audit_report()

        try:
            with open(report_filename, 'w', encoding='utf-8') as f:
                f.write(report_content)
            self.logger.info(f"Audit report saved: {report_filename}")
            return report_filename
        except Exception as e:
            self.logger.error(f"Could not save audit report: {e}")
            return ""

    def is_git_repository(self) -> bool:
        """Check if current directory is a git repository."""
        return os.path.exists('.git') or subprocess.run(['git', 'rev-parse', '--git-dir'],
                                                        capture_output=True, check=False).returncode == 0

    def commit_changes(self, message: str = None) -> bool:
        """Commit changes to git repository."""
        if not self.is_git_repository():
            self.logger.warning("Not a git repository - skipping commit")
            return False

        if not message:
            message = f"Automated rebranding: {
                self.stats['files_modified']} files, {
                self.stats['total_changes']} changes"

        try:
            # Add all modified files
            subprocess.run(['git', 'add', '-A'], check=True)

            # Commit changes
            subprocess.run(['git', 'commit', '-m', message], check=True)

            self.logger.info(f"Changes committed with message: {message}")
            return True
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Git commit failed: {e}")
            return False

    def print_summary(self, dry_run: bool = True):
        """Print execution summary."""
        print("\n" + "=" * 80)
        print(f"AUTOMATED REBRANDING SUMMARY ({'DRY RUN' if dry_run else 'COMPLETED'})")
        print("=" * 80)
        print(f"Files processed: {self.stats['files_processed']}")
        print(f"Files modified: {self.stats['files_modified']}")
        print(f"Files skipped: {self.stats['files_skipped']}")
        print(f"Total changes: {self.stats['total_changes']}")
        print(f"Errors: {len(self.stats['errors'])}")

        if self.changes_made:
            print(f"\nTOP MODIFIED FILES:")
            sorted_changes = sorted(self.changes_made, key=lambda x: x.changes_count, reverse=True)
            for change in sorted_changes[:10]:
                print(f"  {change.file_path}: {change.changes_count} changes")

        if self.stats['errors']:
            print(f"\nERRORS:")
            for error in self.stats['errors'][:5]:
                print(f"  - {error}")
            if len(self.stats['errors']) > 5:
                print(f"  ... and {len(self.stats['errors']) - 5} more errors")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Cross-platform automated rebranding with MIME filtering and audit logging",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without applying them (default)")
    parser.add_argument("--execute", action="store_true",
                        help="Apply changes to files")
    parser.add_argument("--commit", action="store_true",
                        help="Apply changes and commit to git")
    parser.add_argument("--dir", type=str, default=".",
                        help="Directory to process (default: current directory)")
    parser.add_argument("--mapping", type=str, default="search_replace_mapping.json",
                        help="Path to mapping file (default: search_replace_mapping.json)")
    parser.add_argument("--file", type=str,
                        help="Process single file only")

    args = parser.parse_args()

    # Determine execution mode
    if args.commit:
        dry_run = False
        commit = True
    elif args.execute:
        dry_run = False
        commit = False
    else:
        dry_run = True
        commit = False

    print("Cross-Platform Automated Rebranding Tool")
    print("=" * 50)
    print(f"Mode: {'DRY RUN' if dry_run else 'EXECUTE'}")
    print(f"Commit: {'YES' if commit else 'NO'}")
    print(f"Mapping: {args.mapping}")
    print()

    try:
        # Initialize tool
        tool = AutomatedRebranding(args.mapping)

        if args.file:
            # Process single file
            print(f"Processing file: {args.file}")
            tool.process_file(args.file, dry_run)
        else:
            # Process directory
            tool.process_directory(args.dir, dry_run)

        # Generate and save audit report
        report_file = tool.save_audit_report()

        # Print summary
        tool.print_summary(dry_run)

        # Commit if requested and changes were made
        if commit and tool.stats['files_modified'] > 0:
            print(f"\nCommitting changes to git...")
            if tool.commit_changes():
                print("✓ Changes committed successfully")
            else:
                print("✗ Failed to commit changes")
        elif commit:
            print("\nNo changes to commit")

        if dry_run and tool.stats['files_modified'] > 0:
            print("\n" + "=" * 80)
            print("DRY RUN COMPLETE - No files were actually modified")
            print("To apply changes, run with --execute or --commit")
            print("=" * 80)

        print(f"\nAudit report: {report_file}")

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
