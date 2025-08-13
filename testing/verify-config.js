/**
 * Environment Configuration Verification Script
 * Validates that all environment files are properly configured
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_VARS = [
  'API_BASE_URL',
  'IMAGE_BASE_URL', 
  'PLACEHOLDER_IMAGE_URL',
  'TIMEOUT',
  'USE_MOCK_API'
];

const ENV_FILES = [
  '.env.development',
  '.env.staging',
  '.env.production'
];

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const config = {};
  
  content.split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      config[key] = value.trim();
    }
  });
  
  return config;
}

function validateConfig(config, envName) {
  const errors = [];
  const warnings = [];
  
  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!config[varName]) {
      errors.push(`Missing required variable: ${varName}`);
    }
  });
  
  // Validate API_BASE_URL format
  if (config.API_BASE_URL) {
    if (!config.API_BASE_URL.startsWith('http')) {
      errors.push('API_BASE_URL must start with http:// or https://');
    }
    if (!config.API_BASE_URL.includes('/api')) {
      warnings.push('API_BASE_URL should probably end with /api');
    }
  }
  
  // Validate timeout
  if (config.TIMEOUT) {
    const timeout = parseInt(config.TIMEOUT);
    if (isNaN(timeout) || timeout < 5000 || timeout > 60000) {
      warnings.push('TIMEOUT should be between 5000 and 60000 milliseconds');
    }
  }
  
  // Environment-specific validations
  if (envName === 'development') {
    if (config.USE_MOCK_API !== 'true') {
      warnings.push('Development environment should typically use mock API');
    }
    if (config.API_BASE_URL && !config.API_BASE_URL.includes('localhost') && !config.API_BASE_URL.includes('10.0.2.2')) {
      warnings.push('Development environment should point to localhost or 10.0.2.2');
    }
  }
  
  if (envName === 'staging') {
    if (config.USE_MOCK_API === 'true') {
      warnings.push('Staging environment should use real API');
    }
    if (config.API_BASE_URL && !config.API_BASE_URL.includes('staging')) {
      warnings.push('Staging environment should point to staging server');
    }
  }
  
  if (envName === 'production') {
    if (config.USE_MOCK_API === 'true') {
      errors.push('Production environment must not use mock API');
    }
    if (config.API_BASE_URL && (config.API_BASE_URL.includes('localhost') || config.API_BASE_URL.includes('staging'))) {
      errors.push('Production environment should not point to localhost or staging');
    }
  }
  
  return { errors, warnings };
}

function main() {
  console.log('🔍 Environment Configuration Verification\n');
  
  let allValid = true;
  
  ENV_FILES.forEach(envFile => {
    const envName = path.basename(envFile, '.env').substring(1); // Remove .env prefix
    
    console.log(`📋 Checking ${envFile} (${envName}):`);
    
    if (!fs.existsSync(envFile)) {
      console.log(`❌ File does not exist: ${envFile}`);
      allValid = false;
      return;
    }
    
    try {
      const config = parseEnvFile(envFile);
      const { errors, warnings } = validateConfig(config, envName);
      
      // Display configuration
      console.log('  Configuration:');
      REQUIRED_ENV_VARS.forEach(varName => {
        const value = config[varName] || '(missing)';
        console.log(`    ${varName}: ${value}`);
      });
      
      // Display errors
      if (errors.length > 0) {
        console.log('  ❌ Errors:');
        errors.forEach(error => console.log(`    - ${error}`));
        allValid = false;
      }
      
      // Display warnings
      if (warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        warnings.forEach(warning => console.log(`    - ${warning}`));
      }
      
      if (errors.length === 0 && warnings.length === 0) {
        console.log('  ✅ Configuration looks good!');
      }
      
    } catch (error) {
      console.log(`❌ Error parsing ${envFile}: ${error.message}`);
      allValid = false;
    }
    
    console.log('');
  });
  
  console.log('📊 Summary:');
  console.log(`Overall validation: ${allValid ? '✅ PASS' : '❌ FAIL'}`);
  
  return allValid;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main, parseEnvFile, validateConfig };
