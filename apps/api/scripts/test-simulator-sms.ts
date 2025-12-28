#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

// Now import the service after env is loaded
import { AWSSMSService } from '../src/services/aws/smsService.js';

class SimulatorSMSTester {
  private smsService: AWSSMSService;
  
  constructor() {
    this.smsService = new AWSSMSService();
  }
  
  async run() {
    console.log(chalk.blue.bold('\n🛰️  AWS SMS Simulator Testing Suite\n'));
    
    // Display current configuration
    this.displayConfiguration();
    
    const { testType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'testType',
        message: 'Select test type:',
        choices: [
          { name: '🎯 Test 1: Simulator to Simulator (Direct)', value: 'simulator-to-simulator' },
          { name: '🔄 Test 2: Real Number Override (Simulator Redirect)', value: 'real-override' },
          { name: '📱 Test 3: Custom Number Test', value: 'custom' },
          { name: '🧪 Run All Tests', value: 'all' }
        ]
      }
    ]);
    
    switch (testType) {
      case 'simulator-to-simulator':
        await this.testSimulatorToSimulator();
        break;
      case 'real-override':
        await this.testRealNumberOverride();
        break;
      case 'custom':
        await this.testCustomNumber();
        break;
      case 'all':
        await this.runAllTests();
        break;
    }
    
    console.log(chalk.green.bold('\n✅ Testing completed!\n'));
  }
  
  private displayConfiguration() {
    const sandboxMode = process.env.AWS_SANDBOX_MODE !== 'false';
    const useOverride = process.env.AWS_USE_SIMULATOR_OVERRIDE === 'true';
    const originationNumber = process.env.AWS_PHONE_NUMBER || 'Not set';
    const destinationOverride = process.env.AWS_SIMULATOR_DESTINATION || 'Not set';
    
    console.log(chalk.cyan('Current Configuration:'));
    console.log(chalk.gray(`  Sandbox Mode: ${sandboxMode ? '✓ Enabled' : '✗ Disabled'}`));
    console.log(chalk.gray(`  Simulator Override: ${useOverride ? '✓ Enabled' : '✗ Disabled'}`));
    console.log(chalk.gray(`  Origination Number: ${originationNumber}`));
    console.log(chalk.gray(`  Override Destination: ${destinationOverride}`));
    console.log();
    
    if (!sandboxMode) {
      console.log(chalk.yellow('⚠️  Warning: Not in sandbox mode. Real SMS charges may apply!'));
    }
    
    if (!useOverride) {
      console.log(chalk.yellow('⚠️  Warning: Simulator override disabled. Real numbers will be used.'));
    }
    
    console.log();
  }
  
  /**
   * Test 1: Direct simulator to simulator messaging
   * Send from simulator origination to simulator destination
   */
  async testSimulatorToSimulator() {
    console.log(chalk.cyan('\n🎯 Test 1: Simulator to Simulator (Direct)\n'));
    
    const simulatorDestination = '+14254147755';
    const testMessage = 'Test message from AWS SMS simulator\n\nThis is a direct simulator-to-simulator test.';
    
    console.log(chalk.gray(`Sending to simulator destination: ${simulatorDestination}`));
    console.log(chalk.gray(`Message: ${testMessage.substring(0, 50)}...`));
    
    const result = await this.smsService.sendMessage({
      to: simulatorDestination,
      body: testMessage,
      messageType: 'TRANSACTIONAL'
    });
    
    this.displayResult('Simulator to Simulator', result);
  }
  
  /**
   * Test 2: Real number with simulator override
   * Send to a real number that should be overridden with simulator
   */
  async testRealNumberOverride() {
    console.log(chalk.cyan('\n🔄 Test 2: Real Number Override (Simulator Redirect)\n'));
    
    const realNumber = process.env.TEST_REAL_PHONE || '+16268075538';
    const testMessage = 'Test message with simulator override\n\nThis real number should be redirected to simulator.';
    
    console.log(chalk.gray(`Original destination: ${this.maskPhoneNumber(realNumber)}`));
    console.log(chalk.gray(`Expected override: ${process.env.AWS_SIMULATOR_DESTINATION}`));
    console.log(chalk.gray(`Message: ${testMessage.substring(0, 50)}...`));
    
    const result = await this.smsService.sendMessage({
      to: realNumber,
      body: testMessage,
      messageType: 'TRANSACTIONAL'
    });
    
    this.displayResult('Real Number Override', result);
  }
  
  /**
   * Test 3: Custom number test
   * Allow user to input a custom number for testing
   */
  async testCustomNumber() {
    console.log(chalk.cyan('\n📱 Test 3: Custom Number Test\n'));
    
    const { phoneNumber, message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'phoneNumber',
        message: 'Enter phone number (E.164 format):',
        default: '+14254147755',
        validate: (input: string) => {
          const phoneRegex = /^\+[1-9]\d{1,14}$/;
          return phoneRegex.test(input) || 'Please enter a valid E.164 format phone number';
        }
      },
      {
        type: 'input',
        name: 'message',
        message: 'Enter custom message:',
        default: 'Custom test message from AWS SMS simulator'
      }
    ]);
    
    console.log(chalk.gray(`Sending to: ${this.maskPhoneNumber(phoneNumber)}`));
    console.log(chalk.gray(`Message: ${message.substring(0, 50)}...`));
    
    const result = await this.smsService.sendMessage({
      to: phoneNumber,
      body: message,
      messageType: 'TRANSACTIONAL'
    });
    
    this.displayResult('Custom Number', result);
  }
  
  /**
   * Run all tests sequentially
   */
  async runAllTests() {
    console.log(chalk.cyan('\n🧪 Running All Tests\n'));
    
    await this.testSimulatorToSimulator();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
    
    await this.testRealNumberOverride();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
    
    // Use default simulator number for final test
    console.log(chalk.cyan('\n📱 Test 3: Default Simulator Test\n'));
    const result = await this.smsService.sendMessage({
      to: '+14254147755',
      body: 'Final test message in batch run\n\nAll tests completed successfully.',
      messageType: 'TRANSACTIONAL'
    });
    
    this.displayResult('Default Simulator', result);
  }
  
  /**
   * Display test result in formatted output
   */
  private displayResult(testName: string, result: any) {
    console.log(chalk.gray(`\n${testName} Result:`));
    
    if (result.success) {
      console.log(chalk.green(`  ✓ Success`));
      console.log(chalk.gray(`    Message ID: ${result.messageId || 'N/A'}`));
      console.log(chalk.gray(`    Cost: $${result.cost?.toFixed(4) || '0.0000'}`));
      
      if (result.sandboxSkipped) {
        console.log(chalk.yellow(`    Note: Sandbox mode - message simulated`));
      }
    } else {
      console.log(chalk.red(`  ✗ Failed`));
      console.log(chalk.red(`    Error: ${result.error}`));
      
      if (result.retryable) {
        console.log(chalk.yellow(`    Note: Error is retryable`));
      }
    }
    
    console.log();
  }
  
  /**
   * Mask phone number for logging (show first 4 and last 4 digits)
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 8) return phoneNumber;
    return `${phoneNumber.substring(0, 4)}****${phoneNumber.slice(-4)}`;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⏹️  Shutting down...'));
  process.exit(0);
});

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_PHONE_NUMBER'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    missing.forEach(key => console.error(chalk.red(`  - ${key}`)));
    process.exit(1);
  }
  
  // Warn about optional but recommended variables
  const recommended = [
    'AWS_SANDBOX_MODE',
    'AWS_USE_SIMULATOR_OVERRIDE',
    'AWS_SIMULATOR_DESTINATION'
  ];
  
  const missingRecommended = recommended.filter(key => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn(chalk.yellow('⚠️  Missing recommended environment variables:'));
    missingRecommended.forEach(key => console.warn(chalk.yellow(`  - ${key}`)));
    console.log();
  }
}

// Run the tester
validateEnvironment();
const tester = new SimulatorSMSTester();
tester.run().catch((error) => {
  console.error(chalk.red('\n❌ Error running simulator tests:'), error);
  process.exit(1);
});