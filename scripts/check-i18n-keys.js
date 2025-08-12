#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively extracts all keys from a nested object
 * @param {object} obj - The object to extract keys from
 * @param {string} prefix - The current prefix for nested keys
 * @returns {string[]} - Array of dot-notation keys
 */
function extractKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      keys.push(...extractKeys(value, fullKey));
    } else {
      // Add leaf key
      keys.push(fullKey);
    }
  }
  
  return keys.sort();
}

/**
 * Compares two arrays and returns missing elements
 * @param {string[]} arr1 - First array
 * @param {string[]} arr2 - Second array
 * @param {string} arr1Name - Name for first array (for error messages)
 * @param {string} arr2Name - Name for second array (for error messages)
 * @returns {object} - Object with missing keys from each array
 */
function compareArrays(arr1, arr2, arr1Name, arr2Name) {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  
  const missingInArr1 = arr2.filter(key => !set1.has(key));
  const missingInArr2 = arr1.filter(key => !set2.has(key));
  
  return {
    [`missingIn${arr1Name}`]: missingInArr1,
    [`missingIn${arr2Name}`]: missingInArr2
  };
}

/**
 * Main function to check i18n key consistency
 */
function checkI18nKeys() {
  const i18nDir = path.join(__dirname, '..', 'i18n');
  const enFilePath = path.join(i18nDir, 'en.json');
  const zhFilePath = path.join(i18nDir, 'zh.json');
  
  // Check if files exist
  if (!fs.existsSync(enFilePath)) {
    console.error('❌ Error: en.json not found at', enFilePath);
    process.exit(1);
  }
  
  if (!fs.existsSync(zhFilePath)) {
    console.error('❌ Error: zh.json not found at', zhFilePath);
    process.exit(1);
  }
  
  try {
    // Read and parse JSON files
    const enContent = fs.readFileSync(enFilePath, 'utf8');
    const zhContent = fs.readFileSync(zhFilePath, 'utf8');
    
    let enData, zhData;
    
    try {
      enData = JSON.parse(enContent);
    } catch (error) {
      console.error('❌ Error: Invalid JSON in en.json:', error.message);
      process.exit(1);
    }
    
    try {
      zhData = JSON.parse(zhContent);
    } catch (error) {
      console.error('❌ Error: Invalid JSON in zh.json:', error.message);
      process.exit(1);
    }
    
    // Extract keys from both files
    const enKeys = extractKeys(enData);
    const zhKeys = extractKeys(zhData);
    
    console.log('🔍 Checking i18n key consistency...');
    console.log(`📄 English (en.json): ${enKeys.length} keys`);
    console.log(`📄 Chinese (zh.json): ${zhKeys.length} keys`);
    console.log('');
    
    // Compare keys
    const comparison = compareArrays(enKeys, zhKeys, 'English', 'Chinese');
    
    let hasErrors = false;
    
    // Check for missing keys in Chinese
    if (comparison.missingInChinese.length > 0) {
      hasErrors = true;
      console.log('❌ Keys missing in Chinese (zh.json):');
      comparison.missingInChinese.forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log('');
    }
    
    // Check for missing keys in English
    if (comparison.missingInEnglish.length > 0) {
      hasErrors = true;
      console.log('❌ Keys missing in English (en.json):');
      comparison.missingInEnglish.forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log('');
    }
    
    if (hasErrors) {
      console.log('❌ Key consistency check failed!');
      console.log('📝 Please ensure both translation files have identical key structures.');
      process.exit(1);
    } else {
      console.log('✅ Key consistency check passed!');
      console.log('🎉 Both translation files have identical key sets.');
      
      // Show some sample keys for verification
      if (enKeys.length > 0) {
        console.log('');
        console.log('📋 Sample keys found:');
        const sampleKeys = enKeys.slice(0, 5);
        sampleKeys.forEach(key => {
          console.log(`   - ${key}`);
        });
        if (enKeys.length > 5) {
          console.log(`   ... and ${enKeys.length - 5} more`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkI18nKeys();
}

module.exports = { checkI18nKeys, extractKeys, compareArrays };
