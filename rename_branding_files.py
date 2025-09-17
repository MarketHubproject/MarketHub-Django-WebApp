#!/usr/bin/env python3
"""
Script to rename files and directories with old branding to new MarketHub branding
and update all import/require/template paths accordingly.
"""

import os
import re
import subprocess
import shutil
from pathlib import Path


class BrandingFileRenamer:
    def __init__(self):
        self.root_dir = Path('.')
        self.file_mappings = {
            # CSS and SCSS files
            'homepage/static/MarketHub/css/markethub.css': 'homepage/static/MarketHub/css/markethub.css',
            'homepage/static/MarketHub/css/markethub.css.map': 'homepage/static/MarketHub/css/markethub.css.map',
            'homepage/static/MarketHub/scss/markethub.scss': 'homepage/static/MarketHub/scss/markethub.scss',
            'homepage/static/MarketHub/scss/_markethub_variables.scss': 'homepage/static/MarketHub/scss/_markethub_variables.scss',
            'homepage/static/MarketHub/markethub.js': 'homepage/static/MarketHub/markethub.js',

            # Documentation files
            'MARKETHUB_THEME.md': 'MARKETHUB_THEME.md',
            'MarketHub_Color_Palette.md': 'MarketHub_Color_Palette.md',
            'MarketHub_Design_Reference.md': 'MarketHub_Design_Reference.md',
        }

        self.content_replacements = {
            # File references in code/templates
            'markethub.css': 'markethub.css',
            'markethub.js': 'markethub.js',
            'markethub.scss': 'markethub.scss',
            '_markethub_variables': '_markethub_variables',
            'markethub.css.map': 'markethub.css.map',

            # Documentation references
            'MARKETHUB_THEME': 'MARKETHUB_THEME',
            'MarketHub_Color_Palette': 'MarketHub_Color_Palette',
            'MarketHub_Design_Reference': 'MarketHub_Design_Reference',
            'MarketHub': 'MarketHub',
            'MARKETHUB': 'MARKETHUB',
            'markethub': 'markethub',
            'MarketHub': 'MarketHub',
            'MarketHub': 'MarketHub',
            'MARKETHUB': 'MARKETHUB',
        }

    def run_git_command(self, command):
        """Execute a git command and return the result"""
        try:
            # Split command into list for safer execution
            if isinstance(command, str):
                command_list = command.split()
            else:
                command_list = command
                
            result = subprocess.run(command_list, capture_output=True, text=True, cwd=self.root_dir)
            if result.returncode != 0:
                print(f"Git command failed: {' '.join(command_list)}")
                print(f"Error: {result.stderr}")
                return False
            return True
        except Exception as e:
            print(f"Error running git command: {e}")
            return False

    def rename_files_with_git_mv(self):
        """Rename files using git mv to preserve history"""
        print("=== Renaming files using git mv ===")

        for old_path, new_path in self.file_mappings.items():
            old_file = self.root_dir / old_path
            new_file = self.root_dir / new_path

            if old_file.exists():
                print(f"Renaming: {old_path} → {new_path}")

                # Create parent directory if it doesn't exist
                new_file.parent.mkdir(parents=True, exist_ok=True)

                # Use git mv to rename the file
                git_command = f'git mv "{old_file}" "{new_file}"'
                if self.run_git_command(git_command):
                    print(f"✓ Successfully renamed {old_path}")
                else:
                    print(f"✗ Failed to rename {old_path}, trying manual rename...")
                    try:
                        shutil.move(str(old_file), str(new_file))
                        print(f"✓ Manually renamed {old_path}")
                    except Exception as e:
                        print(f"✗ Manual rename also failed: {e}")
            else:
                print(f"⚠ File not found: {old_path}")

    def update_file_content(self, file_path):
        """Update content in a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            original_content = content

            # Apply all content replacements
            for old_text, new_text in self.content_replacements.items():
                # Use word boundaries for more precise matching where appropriate
                if old_text.replace('_', '').replace('-', '').isalpha():
                    # For text-only replacements, use word boundaries
                    pattern = r'\b' + re.escape(old_text) + r'\b'
                    content = re.sub(pattern, new_text, content)
                else:
                    # For file extensions and paths, use simple replacement
                    content = content.replace(old_text, new_text)

            # Write back if content changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True

            return False

        except Exception as e:
            print(f"Error updating {file_path}: {e}")
            return False

    def update_references_in_files(self):
        """Update all references in project files"""
        print("\n=== Updating file references ===")

        # File extensions to check
        extensions = ['.py', '.html', '.css', '.scss', '.js', '.md', '.txt', '.json', '.yml', '.yaml']

        updated_files = []

        for ext in extensions:
            # Find all files with this extension
            for file_path in self.root_dir.rglob(f'*{ext}'):
                # Skip certain directories
                if any(
                    skip_dir in file_path.parts for skip_dir in [
                        '.git',
                        '__pycache__',
                        'node_modules',
                        '.venv',
                        'env']):
                    continue

                if self.update_file_content(file_path):
                    updated_files.append(str(file_path))
                    print(f"✓ Updated references in: {file_path}")

        print(f"\nTotal files updated: {len(updated_files)}")
        return updated_files

    def fix_base_template_css_reference(self):
        """Fix the MarketHub.css reference in base.html template"""
        print("\n=== Fixing CSS reference in base template ===")

        base_template = self.root_dir / 'homepage/templates/homepage/base.html'

        if base_template.exists():
            try:
                with open(base_template, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Replace the incorrect MarketHub.css reference with markethub.css
                old_ref = "{% static 'MarketHub/css/MarketHub.css' %}"
                new_ref = "{% static 'MarketHub/css/markethub.css' %}"

                if old_ref in content:
                    content = content.replace(old_ref, new_ref)

                    with open(base_template, 'w', encoding='utf-8') as f:
                        f.write(content)

                    print(f"✓ Fixed CSS reference in {base_template}")
                    return True
                else:
                    print(f"⚠ CSS reference not found in {base_template}")

            except Exception as e:
                print(f"✗ Error fixing base template: {e}")

        return False

    def verify_renamed_files(self):
        """Verify that all files were renamed successfully"""
        print("\n=== Verifying renamed files ===")

        success_count = 0

        for old_path, new_path in self.file_mappings.items():
            old_file = self.root_dir / old_path
            new_file = self.root_dir / new_path

            if new_file.exists():
                print(f"✓ {new_path} exists")
                success_count += 1
            else:
                print(f"✗ {new_path} not found")

            if old_file.exists():
                print(f"⚠ Old file {old_path} still exists")

        print(f"\nSuccessfully verified: {success_count}/{len(self.file_mappings)} files")
        return success_count == len(self.file_mappings)

    def create_summary_report(self):
        """Create a summary report of the renaming operation"""
        print("\n=== Creating summary report ===")

        report_content = """# File Renaming Summary Report

## Files Renamed:
"""

        for old_path, new_path in self.file_mappings.items():
            old_file = self.root_dir / old_path
            new_file = self.root_dir / new_path

            if new_file.exists():
                report_content += f"✓ {old_path} → {new_path}\n"
            else:
                report_content += f"✗ {old_path} → {new_path} (FAILED)\n"

        report_content += "\n## Content Replacements Applied:\n"
        for old_text, new_text in self.content_replacements.items():
            report_content += f"- '{old_text}' → '{new_text}'\n"

        report_file = self.root_dir / 'file_renaming_report.md'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)

        print(f"✓ Summary report created: {report_file}")

    def run(self):
        """Execute the complete file renaming process"""
        print("Starting file renaming process for MarketHub branding...")
        print("=" * 60)

        # Step 1: Rename files using git mv
        self.rename_files_with_git_mv()

        # Step 2: Fix base template CSS reference specifically
        self.fix_base_template_css_reference()

        # Step 3: Update all references in files
        self.update_references_in_files()

        # Step 4: Verify the operation
        self.verify_renamed_files()

        # Step 5: Create summary report
        self.create_summary_report()

        print("\n" + "=" * 60)
        print("File renaming process completed!")
        print("Please review the changes and commit them to git if satisfied.")
        print("Run 'git status' to see all changes.")


if __name__ == "__main__":
    renamer = BrandingFileRenamer()
    renamer.run()
