#!/usr/bin/env python3
"""
MarketHub to MarketHub Rebranding Script

This script applies the comprehensive search-and-replace mappings
defined in search_replace_mapping.json to perform automated rebranding.

Usage:
    python apply_rebranding.py [--dry-run] [--file FILE] [--dir DIR]
    
Examples:
    # Dry run on all files
    python apply_rebranding.py --dry-run
    
    # Apply to single file
    python apply_rebranding.py --file package.json
    
    # Apply to directory
    python apply_rebranding.py --dir homepage/static/MarketHub/
"""

import json
import re
import os
import argparse
import shutil
from pathlib import Path
from typing import Dict, List, Tuple

class RebrandingTool:
    def __init__(self, mapping_file: str = "search_replace_mapping.json"):
        """Initialize the rebranding tool with mappings."""
        self.mapping_file = mapping_file
        self.mappings = self._load_mappings()
        self.changes_made = []
        
    def _load_mappings(self) -> Dict:
        """Load the search-replace mappings from JSON file."""
        try:
            with open(self.mapping_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: {self.mapping_file} not found!")
            exit(1)
        except json.JSONDecodeError as e:
            print(f"Error parsing {self.mapping_file}: {e}")
            exit(1)
    
    def _backup_file(self, file_path: str) -> str:
        """Create a backup of the file before modification."""
        backup_path = f"{file_path}.bak"
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def _apply_text_mappings(self, content: str) -> Tuple[str, int]:
        """Apply simple text mappings to content."""
        changes = 0
        
        # Apply mappings in order of specificity
        mapping_groups = [
            self.mappings["text_mappings"]["wrapped_variations"],
            self.mappings["text_mappings"]["file_extensions"],
            self.mappings["text_mappings"]["team_references"],
            self.mappings["text_mappings"]["theme_references"],
            self.mappings["text_mappings"]["directory_paths"],
            self.mappings["text_mappings"]["css_class_variations"],
            self.mappings["text_mappings"]["id_variations"],
            self.mappings["text_mappings"]["variable_names"],
            self.mappings["text_mappings"]["underscore_variations"],
            self.mappings["text_mappings"]["hyphenated_variations"],
            self.mappings["text_mappings"]["concatenated_variations"],
            self.mappings["text_mappings"]["basic_variations"],
        ]
        
        for mapping_group in mapping_groups:
            for search_text, replace_text in mapping_group.items():
                if search_text in content:
                    old_content = content
                    content = content.replace(search_text, replace_text)
                    if content != old_content:
                        changes += content.count(replace_text) - old_content.count(replace_text)
        
        return content, changes
    
    def _apply_regex_patterns(self, content: str) -> Tuple[str, int]:
        """Apply regex patterns to content."""
        changes = 0
        flags = re.IGNORECASE | re.MULTILINE
        
        # Apply regex patterns
        pattern_groups = [
            self.mappings["regex_patterns"]["word_boundary_patterns"],
            self.mappings["regex_patterns"]["camelcase_patterns"],
            self.mappings["regex_patterns"]["file_path_patterns"],
            self.mappings["regex_patterns"]["css_scss_patterns"],
            self.mappings["regex_patterns"]["html_attribute_patterns"],
            self.mappings["regex_patterns"]["javascript_patterns"],
        ]
        
        for pattern_group in pattern_groups:
            for pattern_info in pattern_group:
                pattern = pattern_info["pattern"]
                replacement = pattern_info["replacement"]
                
                # Count matches before replacement
                matches = len(re.findall(pattern, content, flags))
                if matches > 0:
                    content = re.sub(pattern, replacement, content, flags=flags)
                    changes += matches
        
        return content, changes
    
    def _apply_special_cases(self, content: str) -> Tuple[str, int]:
        """Apply special case mappings."""
        changes = 0
        
        special_groups = [
            self.mappings["special_cases"]["package_json"],
            self.mappings["special_cases"]["url_slugs"],
            self.mappings["special_cases"]["database_fields"],
        ]
        
        for special_group in special_groups:
            for search_text, replace_text in special_group.items():
                if search_text in content:
                    old_content = content
                    content = content.replace(search_text, replace_text)
                    if content != old_content:
                        changes += 1
        
        return content, changes
    
    def _apply_context_specific(self, content: str) -> Tuple[str, int]:
        """Apply context-specific mappings."""
        changes = 0
        
        context_groups = [
            self.mappings["context_specific"]["titles_and_headings"],
            self.mappings["context_specific"]["comments"],
            self.mappings["context_specific"]["meta_tags"],
        ]
        
        for context_group in context_groups:
            for search_text, replace_text in context_group.items():
                if search_text in content:
                    old_content = content
                    content = content.replace(search_text, replace_text)
                    if content != old_content:
                        changes += 1
        
        return content, changes
    
    def process_file(self, file_path: str, dry_run: bool = False) -> Dict:
        """Process a single file with all mappings."""
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
        except UnicodeDecodeError:
            # Skip binary files
            return {"skipped": "Binary file"}
        except Exception as e:
            return {"error": f"Could not read file: {e}"}
        
        content = original_content
        total_changes = 0
        
        # Apply mappings in recommended order
        content, changes = self._apply_special_cases(content)
        total_changes += changes
        
        content, changes = self._apply_context_specific(content)
        total_changes += changes
        
        content, changes = self._apply_regex_patterns(content)
        total_changes += changes
        
        content, changes = self._apply_text_mappings(content)
        total_changes += changes
        
        result = {
            "file": file_path,
            "changes": total_changes,
            "modified": content != original_content
        }
        
        # Write changes if not dry run and changes were made
        if not dry_run and result["modified"]:
            try:
                # Create backup
                backup_path = self._backup_file(file_path)
                result["backup"] = backup_path
                
                # Write modified content
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                result["status"] = "success"
            except Exception as e:
                result["error"] = f"Could not write file: {e}"
        elif dry_run and result["modified"]:
            result["status"] = "would_modify"
        else:
            result["status"] = "no_changes"
        
        return result
    
    def process_directory(self, directory: str, dry_run: bool = False) -> List[Dict]:
        """Process all files in a directory recursively."""
        results = []
        
        # File extensions to process
        extensions = {'.py', '.js', '.html', '.css', '.scss', '.md', '.json', '.yml', '.yaml', '.txt'}
        
        for root, dirs, files in os.walk(directory):
            # Skip certain directories
            skip_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'venv'}
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = Path(file_path).suffix.lower()
                
                # Process files with relevant extensions
                if file_ext in extensions or not file_ext:
                    result = self.process_file(file_path, dry_run)
                    if result:
                        results.append(result)
        
        return results
    
    def get_file_renames(self) -> Dict[str, str]:
        """Get suggested file renames based on special cases."""
        return self.mappings["special_cases"]["file_names"]
    
    def print_summary(self, results: List[Dict], dry_run: bool = False):
        """Print a summary of the processing results."""
        total_files = len(results)
        modified_files = len([r for r in results if r.get("modified", False)])
        total_changes = sum(r.get("changes", 0) for r in results)
        errors = [r for r in results if "error" in r]
        
        print(f"\n{'=' * 60}")
        print(f"REBRANDING SUMMARY {'(DRY RUN)' if dry_run else '(APPLIED)'}")
        print(f"{'=' * 60}")
        print(f"Files processed: {total_files}")
        print(f"Files modified: {modified_files}")
        print(f"Total changes: {total_changes}")
        print(f"Errors: {len(errors)}")
        
        if errors:
            print(f"\nERRORS:")
            for error in errors[:5]:  # Show first 5 errors
                print(f"  - {error.get('file', 'Unknown')}: {error.get('error', 'Unknown error')}")
            if len(errors) > 5:
                print(f"  ... and {len(errors) - 5} more errors")
        
        # Show files with most changes
        sorted_results = sorted([r for r in results if r.get("changes", 0) > 0], 
                              key=lambda x: x.get("changes", 0), reverse=True)
        
        if sorted_results:
            print(f"\nFILES WITH MOST CHANGES:")
            for result in sorted_results[:10]:  # Show top 10
                print(f"  - {result['file']}: {result['changes']} changes")
        
        # Suggest file renames
        file_renames = self.get_file_renames()
        existing_files = [rename for rename in file_renames.keys() 
                         if os.path.exists(rename)]
        
        if existing_files:
            print(f"\nSUGGESTED FILE RENAMES:")
            for old_name in existing_files:
                new_name = file_renames[old_name]
                print(f"  - {old_name} → {new_name}")


def main():
    parser = argparse.ArgumentParser(
        description="Apply MarketHub to MarketHub rebranding",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument("--dry-run", action="store_true", 
                       help="Show what would be changed without making changes")
    parser.add_argument("--file", type=str,
                       help="Process a single file")
    parser.add_argument("--dir", type=str, default=".",
                       help="Process all files in directory (default: current directory)")
    parser.add_argument("--mapping", type=str, default="search_replace_mapping.json",
                       help="Path to mapping file (default: search_replace_mapping.json)")
    
    args = parser.parse_args()
    
    # Initialize the tool
    tool = RebrandingTool(args.mapping)
    
    print("MarketHub to MarketHub Rebranding Tool")
    print("=" * 40)
    
    if args.file:
        # Process single file
        print(f"Processing file: {args.file}")
        result = tool.process_file(args.file, args.dry_run)
        if result:
            tool.print_summary([result], args.dry_run)
    else:
        # Process directory
        print(f"Processing directory: {args.dir}")
        if args.dry_run:
            print("DRY RUN MODE - No files will be modified")
        
        results = tool.process_directory(args.dir, args.dry_run)
        tool.print_summary(results, args.dry_run)
    
    if not args.dry_run:
        print(f"\nBackup files created with .bak extension")
        print("Review changes and test thoroughly before committing!")


if __name__ == "__main__":
    main()
