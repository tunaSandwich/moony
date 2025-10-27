#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import chalk from 'chalk';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

// Import AWS clients after env is loaded  
import { AWSClients } from '../src/services/aws/clients/awsClients.js';

async function testSimulatorSMS() {
  console.log(chalk.blue.bold('\n🛰️  Simple AWS SMS Simulator Test\n'));
  
  // Display configuration
  console.log(chalk.cyan('Configuration:'));
  console.log(chalk.gray(`  Sandbox Mode: ${process.env.AWS_SANDBOX_MODE}`));
  console.log(chalk.gray(`  Override Mode: ${process.env.AWS_USE_SIMULATOR_OVERRIDE}`));
  console.log(chalk.gray(`  Origination: ${process.env.AWS_PHONE_NUMBER}`));
  console.log(chalk.gray(`  Destination: ${process.env.AWS_SIMULATOR_DESTINATION}`));
  console.log();
  
  try {
    // Get the SMS client
    const client = AWSClients.getSMSClient();
    
    // Test message
    const testMessage = 'Test message from AWS SMS simulator\n\nSimulator-to-simulator test completed successfully.';
    const destinationNumber = process.env.AWS_SIMULATOR_DESTINATION || '+14254147755';
    const originationNumber = process.env.AWS_PHONE_NUMBER || '+12065559457';
    
    console.log(chalk.gray(`Sending from: ${originationNumber}`));
    console.log(chalk.gray(`Sending to: ${destinationNumber}`));
    console.log(chalk.gray(`Message: ${testMessage.substring(0, 50)}...`));
    console.log();
    
    // Create and send the command
    const command = new SendTextMessageCommand({
      DestinationPhoneNumber: destinationNumber,
      OriginationIdentity: originationNumber,
      MessageBody: testMessage,
      MessageType: 'TRANSACTIONAL',
    });
    
    const response = await client.send(command);
    
    console.log(chalk.green('✓ SMS sent successfully!'));
    console.log(chalk.gray(`  Message ID: ${response.MessageId}`));
    console.log(chalk.gray(`  Status: Success`));
    console.log();
    
  } catch (error: any) {
    console.log(chalk.red('✗ SMS failed'));
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log(chalk.red(`  Code: ${error.code || 'Unknown'}`));
    console.log();
  }
}

// Run the test
testSimulatorSMS().catch((error) => {
  console.error(chalk.red('❌ Test failed:'), error);
  process.exit(1);
});