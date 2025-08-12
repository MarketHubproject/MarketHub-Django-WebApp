/**
 * Environment Switching Demonstration
 * Shows how USE_MOCK_API toggles between mock and real API services
 */

const fs = require('fs');
const TestMatrix = require('./test-matrix.js');

class EnvironmentSwitchingDemo {
  constructor() {
    this.testMatrix = new TestMatrix();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level.toUpperCase();
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  }

  async demonstrateEnvironmentSwitching() {
    this.log('🔄 Demonstrating Environment Switching\n');

    // Backup current environment
    if (fs.existsSync('.env')) {
      fs.copyFileSync('.env', '.env.demo-backup');
    }

    try {
      // 1. Test Development with Mock API
      this.log('1️⃣  Testing Development Environment with Mock API');
      this.log('================================================');
      
      this.testMatrix.setupEnvironment('dev_mock');
      const config1 = this.testMatrix.readEnvironmentConfig();
      
      this.log(`API Base URL: ${config1.API_BASE_URL}`);
      this.log(`Use Mock API: ${config1.USE_MOCK_API}`);
      this.log(`Image Base URL: ${config1.IMAGE_BASE_URL}`);
      this.log(`Timeout: ${config1.TIMEOUT}ms\n`);

      // 2. Test Development with Real API
      this.log('2️⃣  Testing Development Environment with Real API');
      this.log('=================================================');
      
      this.testMatrix.setupEnvironment('dev_real');
      const config2 = this.testMatrix.readEnvironmentConfig();
      
      this.log(`API Base URL: ${config2.API_BASE_URL}`);
      this.log(`Use Mock API: ${config2.USE_MOCK_API}`);
      this.log(`Image Base URL: ${config2.IMAGE_BASE_URL}`);
      this.log(`Timeout: ${config2.TIMEOUT}ms\n`);

      // 3. Test Staging Environment
      this.log('3️⃣  Testing Staging Environment');
      this.log('===============================');
      
      this.testMatrix.setupEnvironment('staging');
      const config3 = this.testMatrix.readEnvironmentConfig();
      
      this.log(`API Base URL: ${config3.API_BASE_URL}`);
      this.log(`Use Mock API: ${config3.USE_MOCK_API}`);
      this.log(`Image Base URL: ${config3.IMAGE_BASE_URL}`);
      this.log(`Timeout: ${config3.TIMEOUT}ms\n`);

      // 4. Test Production Environment
      this.log('4️⃣  Testing Production Environment');
      this.log('==================================');
      
      this.testMatrix.setupEnvironment('production');
      const config4 = this.testMatrix.readEnvironmentConfig();
      
      this.log(`API Base URL: ${config4.API_BASE_URL}`);
      this.log(`Use Mock API: ${config4.USE_MOCK_API}`);
      this.log(`Image Base URL: ${config4.IMAGE_BASE_URL}`);
      this.log(`Timeout: ${config4.TIMEOUT}ms\n`);

      // 5. Demonstrate live switching
      this.log('5️⃣  Demonstrating Live Environment Variable Switching');
      this.log('====================================================');
      
      this.log('Setting USE_MOCK_API to true...');
      this.testMatrix.updateEnvVariable('USE_MOCK_API', 'true');
      const mockConfig = this.testMatrix.readEnvironmentConfig();
      this.log(`Mock API enabled: ${mockConfig.USE_MOCK_API}`);
      
      this.log('Setting USE_MOCK_API to false...');
      this.testMatrix.updateEnvVariable('USE_MOCK_API', 'false');
      const realConfig = this.testMatrix.readEnvironmentConfig();
      this.log(`Mock API enabled: ${realConfig.USE_MOCK_API}\n`);

      // 6. Show API service selection logic
      this.log('6️⃣  API Service Selection Logic');
      this.log('===============================');
      
      this.demonstrateApiSelection(true);
      this.demonstrateApiSelection(false);

      this.log('✅ Environment switching demonstration completed successfully!');

    } catch (error) {
      this.log(`❌ Demo failed: ${error.message}`, 'error');
      throw error;
    } finally {
      // Restore original environment
      if (fs.existsSync('.env.demo-backup')) {
        fs.copyFileSync('.env.demo-backup', '.env');
        fs.unlinkSync('.env.demo-backup');
        this.log('Original environment restored');
      }
    }
  }

  demonstrateApiSelection(useMockApi) {
    this.log(`\nWhen USE_MOCK_API = ${useMockApi}:`);
    
    if (useMockApi) {
      this.log('  → MockApi service will be selected');
      this.log('  → Login credentials: test@example.com / password');
      this.log('  → Products: Mock data with placeholder images');
      this.log('  → Network delay: Simulated (500ms)');
      this.log('  → Errors: Controlled mock errors');
    } else {
      this.log('  → RealApi service will be selected');
      this.log('  → Login credentials: From actual backend');
      this.log('  → Products: Real data from API endpoint');
      this.log('  → Network delay: Actual network latency');
      this.log('  → Errors: Real network/server errors');
    }
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new EnvironmentSwitchingDemo();
  
  demo.demonstrateEnvironmentSwitching()
    .then(() => {
      console.log('\n🎯 Demo completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

module.exports = EnvironmentSwitchingDemo;
