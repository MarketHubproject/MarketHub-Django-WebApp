/**
 * Complete QA Test Runner
 * Executes the full test matrix and generates comprehensive reports
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class QATestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: process.platform,
      tests: {},
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level.toUpperCase();
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  }

  error(message) {
    this.log(message, 'error');
  }

  success(message) {
    this.log(message, 'success');
  }

  // Run environment configuration tests
  async runConfigTests() {
    this.log('Running environment configuration tests...');
    
    try {
      const result = execSync('node verify-config.js', { encoding: 'utf8' });
      this.success('Environment configuration tests passed');
      return { success: true, output: result };
    } catch (error) {
      this.error('Environment configuration tests failed');
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  // Run test matrix
  async runTestMatrix() {
    this.log('Running test matrix...');
    
    try {
      const result = execSync('node test-matrix.js', { encoding: 'utf8' });
      this.success('Test matrix completed');
      
      // Read the generated report
      const reportPath = 'test-matrix-report.json';
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        return { success: true, output: result, report };
      }
      
      return { success: true, output: result };
    } catch (error) {
      this.error('Test matrix failed');
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  // Run API service tests
  async runApiServiceTests() {
    this.log('Running API service tests...');
    
    try {
      const result = execSync('node test-api-service.js', { encoding: 'utf8' });
      this.success('API service tests passed');
      return { success: true, output: result };
    } catch (error) {
      this.error('API service tests failed');
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  // Test React Native dependencies and setup
  async testReactNativeSetup() {
    this.log('Testing React Native setup...');
    
    const tests = [];
    
    // Test React Native CLI
    try {
      const version = execSync('npx react-native --version', { encoding: 'utf8' });
      tests.push({ name: 'React Native CLI', success: true, version: version.trim() });
    } catch (error) {
      tests.push({ name: 'React Native CLI', success: false, error: error.message });
    }

    // Test Metro bundler
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasMetro = packageJson.devDependencies && packageJson.devDependencies['@react-native/metro-config'];
      tests.push({ name: 'Metro Config', success: !!hasMetro, found: !!hasMetro });
    } catch (error) {
      tests.push({ name: 'Metro Config', success: false, error: error.message });
    }

    // Test Android setup
    const androidExists = fs.existsSync('android');
    tests.push({ name: 'Android Project', success: androidExists, found: androidExists });

    // Test iOS setup  
    const iosExists = fs.existsSync('ios');
    tests.push({ name: 'iOS Project', success: iosExists, found: iosExists });

    const allPassed = tests.every(test => test.success);
    
    if (allPassed) {
      this.success('React Native setup verification passed');
    } else {
      this.error('Some React Native setup checks failed');
    }

    return { success: allPassed, tests };
  }

  // Test build configurations
  async testBuildConfigs() {
    this.log('Testing build configurations...');
    
    const results = [];

    // Test Android build config
    try {
      if (fs.existsSync('android/build.gradle')) {
        const buildGradle = fs.readFileSync('android/build.gradle', 'utf8');
        results.push({ 
          platform: 'Android', 
          success: true, 
          hasConfig: buildGradle.includes('buildscript')
        });
      } else {
        results.push({ platform: 'Android', success: false, error: 'build.gradle not found' });
      }
    } catch (error) {
      results.push({ platform: 'Android', success: false, error: error.message });
    }

    // Test iOS build config
    try {
      if (fs.existsSync('ios')) {
        const iosFiles = fs.readdirSync('ios');
        const hasXcworkspace = iosFiles.some(file => file.endsWith('.xcworkspace'));
        const hasXcodeproj = iosFiles.some(file => file.endsWith('.xcodeproj'));
        
        results.push({ 
          platform: 'iOS', 
          success: hasXcworkspace || hasXcodeproj, 
          hasWorkspace: hasXcworkspace,
          hasProject: hasXcodeproj
        });
      } else {
        results.push({ platform: 'iOS', success: false, error: 'iOS directory not found' });
      }
    } catch (error) {
      results.push({ platform: 'iOS', success: false, error: error.message });
    }

    const allPassed = results.every(result => result.success);
    return { success: allPassed, results };
  }

  // Simulate build tests (without actually building)
  async simulateBuildTests() {
    this.log('Simulating build tests for different environments...');
    
    const builds = [
      { env: 'development', platform: 'android', variant: 'debug' },
      { env: 'development', platform: 'ios', variant: 'debug' },
      { env: 'staging', platform: 'android', variant: 'debug' },
      { env: 'staging', platform: 'ios', variant: 'debug' },
      { env: 'production', platform: 'android', variant: 'release' },
      { env: 'production', platform: 'ios', variant: 'release' }
    ];

    const results = [];

    for (const build of builds) {
      const { env, platform, variant } = build;
      
      // Check if environment file exists
      const envFile = `.env.${env}`;
      const envExists = fs.existsSync(envFile);
      
      // Check if platform directory exists
      const platformExists = fs.existsSync(platform);
      
      const success = envExists && platformExists;
      
      results.push({
        environment: env,
        platform,
        variant,
        success,
        envFileExists: envExists,
        platformDirExists: platformExists,
        command: this.getBuildCommand(platform, variant)
      });
      
      this.log(`${success ? '✅' : '❌'} ${env}/${platform}/${variant} build check`);
    }

    const allPassed = results.every(r => r.success);
    return { success: allPassed, results };
  }

  getBuildCommand(platform, variant) {
    if (platform === 'android') {
      return variant === 'release' 
        ? 'cd android && ./gradlew assembleRelease' 
        : 'cd android && ./gradlew assembleDebug';
    } else if (platform === 'ios') {
      const config = variant === 'release' ? 'Release' : 'Debug';
      return `cd ios && xcodebuild -workspace MarketHubMobile.xcworkspace -scheme MarketHubMobile -configuration ${config} -sdk iphonesimulator -derivedDataPath build`;
    }
    return '';
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting comprehensive QA test suite...\n');

    // 1. Environment configuration tests
    this.results.tests.configTests = await this.runConfigTests();

    // 2. Test matrix
    this.results.tests.testMatrix = await this.runTestMatrix();

    // 3. API service tests
    this.results.tests.apiServiceTests = await this.runApiServiceTests();

    // 4. React Native setup verification
    this.results.tests.reactNativeSetup = await this.testReactNativeSetup();

    // 5. Build configuration tests
    this.results.tests.buildConfigs = await this.testBuildConfigs();

    // 6. Simulated build tests
    this.results.tests.simulatedBuilds = await this.simulateBuildTests();

    // Generate summary
    this.generateSummary();

    // Generate comprehensive report
    this.generateReport();

    return this.results;
  }

  generateSummary() {
    const testResults = Object.entries(this.results.tests);
    const passedTests = testResults.filter(([name, result]) => result.success).length;
    const totalTests = testResults.length;

    this.results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      overallSuccess: passedTests === totalTests
    };

    this.log('\n📊 QA TEST SUMMARY');
    this.log('==================');
    testResults.forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      this.log(`${status} ${testName}`);
      if (!result.success && result.error) {
        this.log(`    Error: ${result.error}`);
      }
    });

    this.log(`\nOverall Results:`);
    this.log(`  Total Tests: ${totalTests}`);
    this.log(`  Passed: ${passedTests}`);
    this.log(`  Failed: ${totalTests - passedTests}`);
    this.log(`  Success Rate: ${this.results.summary.successRate}%`);
    this.log(`  Overall Status: ${this.results.summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  }

  generateReport() {
    const reportPath = 'qa-comprehensive-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate markdown report
    const mdReport = this.generateMarkdownReport();
    fs.writeFileSync('qa-test-report.md', mdReport);
    
    this.success(`Comprehensive QA report saved to ${reportPath} and qa-test-report.md`);
  }

  generateMarkdownReport() {
    const { summary, tests } = this.results;
    
    return `# QA Test Report

**Generated:** ${this.results.timestamp}
**Environment:** ${this.results.environment}
**Overall Status:** ${summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}

## Summary

- **Total Tests:** ${summary.totalTests}
- **Passed:** ${summary.passedTests}
- **Failed:** ${summary.failedTests}
- **Success Rate:** ${summary.successRate}%

## Test Results

### 1. Environment Configuration Tests
**Status:** ${tests.configTests.success ? '✅ PASS' : '❌ FAIL'}

${tests.configTests.success ? 'All environment files are properly configured.' : `Error: ${tests.configTests.error}`}

### 2. Test Matrix
**Status:** ${tests.testMatrix.success ? '✅ PASS' : '❌ FAIL'}

${tests.testMatrix.success ? 'Environment switching and API configuration tests passed.' : `Error: ${tests.testMatrix.error}`}

### 3. API Service Tests
**Status:** ${tests.apiServiceTests.success ? '✅ PASS' : '❌ FAIL'}

${tests.apiServiceTests.success ? 'Mock and real API service tests passed.' : `Error: ${tests.apiServiceTests.error}`}

### 4. React Native Setup
**Status:** ${tests.reactNativeSetup.success ? '✅ PASS' : '❌ FAIL'}

${tests.reactNativeSetup.tests.map(test => 
  `- ${test.name}: ${test.success ? '✅' : '❌'}`
).join('\n')}

### 5. Build Configurations
**Status:** ${tests.buildConfigs.success ? '✅ PASS' : '❌ FAIL'}

${tests.buildConfigs.results.map(result => 
  `- ${result.platform}: ${result.success ? '✅' : '❌'} ${result.error ? `(${result.error})` : ''}`
).join('\n')}

### 6. Build Tests (Simulated)
**Status:** ${tests.simulatedBuilds.success ? '✅ PASS' : '❌ FAIL'}

${tests.simulatedBuilds.results.map(build => 
  `- ${build.environment}/${build.platform}/${build.variant}: ${build.success ? '✅' : '❌'}`
).join('\n')}

## Manual Testing Required

The following manual tests should be performed:

1. **Device Testing:**
   - Launch app on Android simulator with mock API
   - Launch app on iOS simulator with mock API
   - Test with real backend (when available)

2. **Auth Flow Testing:**
   - Login with valid credentials (test@example.com / password)
   - Login with invalid credentials
   - Registration flow
   - Logout functionality

3. **Product Features:**
   - Product list loading and images
   - Product detail views
   - Search and filtering
   - Error handling when server is down

4. **Environment Switching:**
   - Toggle USE_MOCK_API between true/false
   - Test different environment files
   - Verify API endpoints change correctly

## Next Steps

1. Run manual tests on simulators/devices
2. Test against real backend when available
3. Performance testing with release builds
4. User acceptance testing

---
*Report generated by MarketHub Mobile QA Test Suite*
`;
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new QATestRunner();
  
  runner.runAllTests()
    .then(results => {
      console.log('\n🎉 QA Test Suite completed!');
      process.exit(results.summary.overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ QA Test Suite failed:', error);
      process.exit(1);
    });
}

module.exports = QATestRunner;
