#!/usr/bin/env node

/**
 * Chinese Unicode Character Detection Script
 * 
 * This script scans the codebase for Chinese Unicode characters and fails
 * if any are found. It's designed to be run in CI to prevent regression.
 * 
 * Usage: node scripts/check-chinese-unicode.js
 * Exit codes:
 *   0 - No Chinese characters found
 *   1 - Chinese characters detected or script error
 */

const fs = require('fs');
const path = require('path');

// Unicode range for Chinese characters (Han script)
// U+4E00-U+9FFF covers most commonly used Chinese characters
const CHINESE_REGEX = /[\u4e00-\u9fff]/g;

// Directories to scan
const SCAN_DIRECTORIES = [
  'src',
  'components', 
  'screens',
  'services',
  'utils',
  'i18n'
];

// File extensions to check
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'build',
  'dist',
  '__tests__',
  '.expo',
  'android/build',
  'ios/build',
  'coverage'
];

/**
 * Check if a path should be excluded from scanning
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Check if a file has a valid extension for scanning
 */
function hasValidExtension(filePath) {
  const ext = path.extname(filePath);
  return FILE_EXTENSIONS.includes(ext);
}

/**
 * Recursively scan a directory for files
 */
function scanDirectory(dirPath, allFiles = []) {
  try {
    if (!fs.existsSync(dirPath)) {
      return allFiles;
    }

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      if (shouldExclude(fullPath)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, allFiles);
      } else if (stat.isFile() && hasValidExtension(fullPath)) {
        allFiles.push(fullPath);
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
    return allFiles;
  }
}

/**
 * Check a single file for Chinese characters
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    let match;
    
    CHINESE_REGEX.lastIndex = 0; // Reset regex
    
    while ((match = CHINESE_REGEX.exec(content)) !== null) {
      const lines = content.substring(0, match.index).split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;
      
      matches.push({
        character: match[0],
        line: lineNumber,
        column: columnNumber,
        position: match.index
      });
    }
    
    return matches;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🔍 Scanning codebase for Chinese Unicode characters...');
  console.log(`📁 Scanning directories: ${SCAN_DIRECTORIES.join(', ')}`);
  console.log(`📄 File extensions: ${FILE_EXTENSIONS.join(', ')}`);
  console.log('');
  
  let allFiles = [];
  let totalViolations = 0;
  let filesWithViolations = 0;
  
  // Collect all files to scan
  for (const dir of SCAN_DIRECTORIES) {
    const dirFiles = scanDirectory(dir);
    allFiles = allFiles.concat(dirFiles);
  }
  
  // Also scan root level files
  const rootFiles = fs.readdirSync('.')
    .filter(file => hasValidExtension(file) && !shouldExclude(file))
    .map(file => path.resolve(file));
  
  allFiles = allFiles.concat(rootFiles);
  
  if (allFiles.length === 0) {
    console.log('⚠️  No files found to scan. Check your directory structure.');
    process.exit(1);
  }
  
  console.log(`📊 Scanning ${allFiles.length} files...`);
  console.log('');
  
  // Check each file
  for (const filePath of allFiles) {
    const violations = checkFile(filePath);
    
    if (violations.length > 0) {
      filesWithViolations++;
      totalViolations += violations.length;
      
      console.log(`❌ ${filePath}:`);
      for (const violation of violations) {
        console.log(`   Line ${violation.line}, Column ${violation.column}: "${violation.character}" (U+${violation.character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
      }
      console.log('');
    }
  }
  
  // Report results
  if (totalViolations > 0) {
    console.log('═'.repeat(60));
    console.log(`❌ CHINESE CHARACTERS DETECTED`);
    console.log(`📊 Summary:`);
    console.log(`   • Files scanned: ${allFiles.length}`);
    console.log(`   • Files with violations: ${filesWithViolations}`);
    console.log(`   • Total violations: ${totalViolations}`);
    console.log('');
    console.log('🔧 Action Required:');
    console.log('   • Replace Chinese characters with i18n translation keys');
    console.log('   • Move hardcoded text to translation files');
    console.log('   • Use i18n.t() method for dynamic text');
    console.log('');
    console.log('📖 See contribution guidelines for more information.');
    console.log('═'.repeat(60));
    
    process.exit(1);
  } else {
    console.log('✅ SUCCESS: No Chinese characters detected!');
    console.log(`📊 Scanned ${allFiles.length} files across ${SCAN_DIRECTORIES.length} directories.`);
    console.log('🎉 Codebase is clean and ready for internationalization.');
    
    process.exit(0);
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});

// Run the script
main();
