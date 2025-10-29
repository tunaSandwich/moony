#!/usr/bin/env node
/**
 * SMS Simulator Test Script
 * 
 * Tests the SMS simulator functionality without going through full phone verification.
 * Useful for development and debugging.
 */

import '../src/config/loadEnv.js';
import chalk from 'chalk';
import { createSMSSimulator } from '../src/services/dev/smsSimulator.js';
import { AWSSMSService } from '../src/services/aws/smsService.js';

async function testSimulator(): Promise<void> {
  console.log(chalk.blue.bold('\n🧪 SMS Simulator Test\n'));

  try {
    // Validate environment
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'local') {
      console.log(chalk.yellow('⚠️  This test should run in development mode'));
      console.log(chalk.gray('Set NODE_ENV=development in .env.local'));
    }

    // Enable SMS simulator for testing
    process.env.SMS_SIMULATOR = 'true';

    const testPhoneNumber = '+14254147755'; // Simulator number
    
    console.log(chalk.green('✅ Test Configuration:'));
    console.log(chalk.gray(`   Phone: ${testPhoneNumber}`));
    console.log(chalk.gray(`   Simulator: ${process.env.SMS_SIMULATOR}`));
    console.log(chalk.gray(`   Environment: ${process.env.NODE_ENV}`));

    // Create simulator
    console.log(chalk.cyan('\n📱 Creating SMS simulator...'));
    const simulator = createSMSSimulator(testPhoneNumber);

    // Setup event listeners for testing
    let messageReceived = false;
    
    process.on('sms:sent' as any, (data) => {
      console.log(chalk.green('\n✅ Event received:'), data);
      messageReceived = true;
    });

    console.log(chalk.cyan('\n🚀 Starting simulator (will open in 3 seconds)...'));
    console.log(chalk.gray('The simulator will start automatically.'));
    console.log(chalk.gray('Look for the terminal UI with blue borders.'));
    
    // Start simulator in background
    setTimeout(() => {
      simulator.start().catch(console.error);
    }, 1000);

    // Wait a moment for simulator to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(chalk.cyan('\n📧 Testing message sending...'));
    
    // Create AWS SMS service and send test message
    const smsService = new AWSSMSService();
    
    const testResult = await smsService.sendMessage({
      to: testPhoneNumber,
      body: 'Test message from SMS simulator test script! 🎉\n\nReply with "2000" to test budget setting.',
      messageType: 'TRANSACTIONAL'
    });

    if (testResult.success) {
      console.log(chalk.green('✅ Test message sent successfully'));
      console.log(chalk.gray(`   Message ID: ${testResult.messageId}`));
    } else {
      console.log(chalk.red('❌ Test message failed'));
      console.log(chalk.gray(`   Error: ${testResult.error}`));
    }

    // Check if event was received
    setTimeout(() => {
      if (messageReceived) {
        console.log(chalk.green('\n✅ Event interception working!'));
      } else {
        console.log(chalk.yellow('\n⚠️  Event not received - check simulator setup'));
      }

      console.log(chalk.cyan.bold('\n📋 Test Complete'));
      console.log(chalk.gray('Check the simulator terminal for the test message.'));
      console.log(chalk.gray('Type "2000" in the simulator to test webhook integration.'));
      console.log(chalk.gray('Type "exit" in the simulator to quit.'));
      
    }, 1000);

  } catch (error: any) {
    console.log(chalk.red.bold('\n💥 Test failed:'));
    console.log(chalk.red(`   ${error.message}`));
    
    console.log(chalk.yellow('\n💡 Troubleshooting:'));
    console.log(chalk.gray('• Ensure NODE_ENV=development or local'));
    console.log(chalk.gray('• Set SMS_SIMULATOR=true'));
    console.log(chalk.gray('• Check AWS environment variables'));
    console.log(chalk.gray('• Verify the API server is running'));
    
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(chalk.blue.bold('\n🧪 SMS Simulator Test\n'));
  console.log(chalk.gray('Tests the SMS simulator functionality by:'));
  console.log(chalk.gray('1. Creating a simulator instance'));
  console.log(chalk.gray('2. Sending a test SMS message'));
  console.log(chalk.gray('3. Verifying event interception'));
  console.log(chalk.gray('4. Opening the simulator UI\n'));
  
  console.log(chalk.white('USAGE:'));
  console.log(chalk.gray('  npm run test:sms-simulator'));
  console.log(chalk.gray('  tsx scripts/test-sms-simulator.ts\n'));
  
  console.log(chalk.white('REQUIREMENTS:'));
  console.log(chalk.gray('  NODE_ENV=development'));
  console.log(chalk.gray('  SMS_SIMULATOR=true (set automatically)'));
  console.log(chalk.gray('  AWS environment variables configured\n'));
  
  process.exit(0);
}

// Run the test
testSimulator();