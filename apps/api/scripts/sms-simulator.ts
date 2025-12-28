#!/usr/bin/env node
/**
 * SMS Simulator CLI Script
 * 
 * Launches the SMS simulator for testing two-way SMS conversations in development.
 * This script is designed to be run in a separate terminal window.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { createSMSSimulator } from '../src/services/dev/smsSimulator.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function startSimulator(): Promise<void> {
  try {
    console.log(chalk.blue.bold('\n🚀 Starting SMS Simulator...\n'));

    // Validate environment
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'local') {
      throw new Error('SMS Simulator can only run in development mode');
    }

    if (process.env.SMS_SIMULATOR !== 'true') {
      console.log(chalk.yellow('⚠️  SMS_SIMULATOR is not enabled'));
      console.log(chalk.gray('Set SMS_SIMULATOR=true in your .env file to enable'));
      process.exit(1);
    }

    // Get phone number from command line args or environment
    let phoneNumber = process.argv[2];
    
    if (!phoneNumber) {
      // Try to get from environment or use default simulator number
      phoneNumber = process.env.YOUR_PHONE_NUMBER || '+14254147755';
    }

    // Validate phone number format
    if (!/^\+\d{10,15}$/.test(phoneNumber)) {
      throw new Error(`Invalid phone number format: ${phoneNumber}`);
    }

    // Check required environment variables
    const requiredVars = ['AWS_REGION', 'AWS_PHONE_NUMBER'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log(chalk.green('✅ Environment validated'));
    console.log(chalk.gray(`   Phone: ${phoneNumber}`));
    console.log(chalk.gray(`   API: http://localhost:3000`));
    console.log(chalk.gray(`   Mode: ${process.env.NODE_ENV}`));

    // Create and start simulator
    const simulator = createSMSSimulator(phoneNumber);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n🛑 Shutting down SMS Simulator...'));
      simulator.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      simulator.stop();
      process.exit(0);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('\n💥 Unhandled Rejection:'), reason);
      simulator.stop();
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('\n💥 Uncaught Exception:'), error.message);
      simulator.stop();
      process.exit(1);
    });

    // Display startup instructions
    console.log(chalk.cyan('\n📱 SMS Simulator Instructions:'));
    console.log(chalk.gray('• Messages from moony will appear automatically'));
    console.log(chalk.gray('• Type your replies and press Enter to send'));
    console.log(chalk.gray('• Type "exit" to quit the simulator'));
    console.log(chalk.gray('• Type "clear" to clear message history'));
    
    console.log(chalk.yellow('\n⚠️  Development Tips:'));
    console.log(chalk.gray('• Complete phone verification to trigger welcome message'));
    console.log(chalk.gray('• Reply with budget amounts like "2000" or "3500"'));
    console.log(chalk.gray('• Reply "SAME" to use previous budget amount'));
    console.log(chalk.gray('• Invalid amounts will trigger error messages'));

    console.log(chalk.blue('\n🔗 Webhook Endpoint:'));
    console.log(chalk.gray('   http://localhost:3000/api/webhooks/aws/incoming-sms'));

    console.log(chalk.green('\n✨ Starting simulator UI...\n'));

    // Add a small delay to let the user read the instructions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start the simulator
    await simulator.start();

  } catch (error: any) {
    console.error(chalk.red.bold('\n💥 SMS Simulator failed to start:'));
    console.error(chalk.red(`   ${error.message}`));
    
    if (error.message.includes('phone number')) {
      console.log(chalk.yellow('\n💡 Usage:'));
      console.log(chalk.gray('   npm run sms:simulator'));
      console.log(chalk.gray('   npm run sms:simulator +14254147755'));
      console.log(chalk.gray('   tsx scripts/sms-simulator.ts +14254147755'));
    }

    if (error.message.includes('environment')) {
      console.log(chalk.yellow('\n💡 Environment Setup:'));
      console.log(chalk.gray('   Set SMS_SIMULATOR=true in .env.local'));
      console.log(chalk.gray('   Ensure NODE_ENV=development or local'));
      console.log(chalk.gray('   Set required AWS environment variables'));
    }

    console.log(chalk.yellow('\n📚 Troubleshooting:'));
    console.log(chalk.gray('• Check that the API server is running on port 3000'));
    console.log(chalk.gray('• Verify all environment variables are set'));
    console.log(chalk.gray('• Ensure AWS sandbox mode is enabled'));
    console.log(chalk.gray('• Check firewall settings for local connections'));

    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(chalk.blue.bold('\n📱 SMS Simulator CLI\n'));
  
  console.log(chalk.white('DESCRIPTION:'));
  console.log(chalk.gray('  Terminal-based SMS simulator for testing two-way SMS conversations'));
  console.log(chalk.gray('  in development mode. Simulates AWS SMS without real phone numbers.\n'));
  
  console.log(chalk.white('USAGE:'));
  console.log(chalk.gray('  npm run sms:simulator'));
  console.log(chalk.gray('  npm run sms:simulator +14254147755'));
  console.log(chalk.gray('  tsx scripts/sms-simulator.ts [phone-number]\n'));
  
  console.log(chalk.white('OPTIONS:'));
  console.log(chalk.gray('  phone-number    Phone number to simulate (E.164 format)'));
  console.log(chalk.gray('  -h, --help      Show this help message\n'));
  
  console.log(chalk.white('ENVIRONMENT:'));
  console.log(chalk.gray('  NODE_ENV=development    Required - must be development mode'));
  console.log(chalk.gray('  SMS_SIMULATOR=true      Required - enables SMS simulation'));
  console.log(chalk.gray('  AWS_REGION              Required - AWS region'));
  console.log(chalk.gray('  AWS_PHONE_NUMBER        Required - AWS origination number'));
  console.log(chalk.gray('  YOUR_PHONE_NUMBER       Optional - default number to simulate\n'));
  
  console.log(chalk.white('SIMULATOR COMMANDS:'));
  console.log(chalk.gray('  exit     - Quit the simulator'));
  console.log(chalk.gray('  clear    - Clear message history'));
  console.log(chalk.gray('  2000     - Set budget to $2,000'));
  console.log(chalk.gray('  SAME     - Use previous budget amount\n'));
  
  console.log(chalk.white('WORKFLOW:'));
  console.log(chalk.gray('  1. Start API server: npm run dev'));
  console.log(chalk.gray('  2. Complete phone verification in web app'));
  console.log(chalk.gray('  3. Simulator auto-launches or run manually'));
  console.log(chalk.gray('  4. Welcome message appears automatically'));
  console.log(chalk.gray('  5. Type budget amount and press Enter'));
  console.log(chalk.gray('  6. See confirmation message from moony\n'));
  
  console.log(chalk.white('EXAMPLES:'));
  console.log(chalk.gray('  # Start with default simulator number'));
  console.log(chalk.cyan('  npm run sms:simulator\n'));
  console.log(chalk.gray('  # Start with specific phone number'));
  console.log(chalk.cyan('  npm run sms:simulator +16268055538\n'));
  console.log(chalk.gray('  # Direct script execution'));
  console.log(chalk.cyan('  SMS_SIMULATOR=true tsx scripts/sms-simulator.ts +14254147755\n'));
  
  process.exit(0);
}

// Show version if requested
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log('SMS Simulator v1.0.0');
  process.exit(0);
}

// Start the simulator
startSimulator();
