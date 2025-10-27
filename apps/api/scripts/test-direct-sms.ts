#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { SendTextMessageCommand, PinpointSMSVoiceV2Client } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import chalk from 'chalk';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

async function testDirectSMS() {
  console.log(chalk.blue.bold('\n🛰️  Direct AWS SMS Test\n'));
  
  // Validate required environment variables
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const originationNumber = process.env.AWS_PHONE_NUMBER;
  const destinationNumber = process.env.AWS_SIMULATOR_DESTINATION;
  
  if (!region || !accessKeyId || !secretAccessKey || !originationNumber || !destinationNumber) {
    console.log(chalk.red('❌ Missing required environment variables'));
    console.log(chalk.red(`   AWS_REGION: ${region ? '✓' : '✗'}`));
    console.log(chalk.red(`   AWS_ACCESS_KEY_ID: ${accessKeyId ? '✓' : '✗'}`));
    console.log(chalk.red(`   AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? '✓' : '✗'}`));
    console.log(chalk.red(`   AWS_PHONE_NUMBER: ${originationNumber ? '✓' : '✗'}`));
    console.log(chalk.red(`   AWS_SIMULATOR_DESTINATION: ${destinationNumber ? '✓' : '✗'}`));
    return;
  }
  
  // Display configuration
  console.log(chalk.cyan('Configuration:'));
  console.log(chalk.gray(`  Region: ${region}`));
  console.log(chalk.gray(`  Sandbox Mode: ${process.env.AWS_SANDBOX_MODE}`));
  console.log(chalk.gray(`  Override Mode: ${process.env.AWS_USE_SIMULATOR_OVERRIDE}`));
  console.log(chalk.gray(`  Origination: ${originationNumber}`));
  console.log(chalk.gray(`  Destination: ${destinationNumber}`));
  console.log();
  
  try {
    // Create SMS client directly
    const client = new PinpointSMSVoiceV2Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    // Test message
    const testMessage = 'moony simulator test\n\n🛰️ This is a simulator-to-simulator test message.\n\nSuccessfully sent from AWS Pinpoint SMS!';
    
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
    
    console.log(chalk.blue('📤 Sending SMS...'));
    const response = await client.send(command);
    
    console.log(chalk.green('✅ SMS sent successfully!'));
    console.log(chalk.gray(`   Message ID: ${response.MessageId}`));
    console.log(chalk.gray(`   Timestamp: ${new Date().toISOString()}`));
    console.log();
    
    // Log success details
    console.log(chalk.cyan('Test Results:'));
    console.log(chalk.green('✓ Simulator-to-simulator messaging works'));
    console.log(chalk.green('✓ AWS Pinpoint SMS Voice V2 client configured correctly'));
    console.log(chalk.green('✓ Environment variables loaded properly'));
    console.log();
    
  } catch (error: any) {
    console.log(chalk.red('❌ SMS failed'));
    console.log(chalk.red(`   Error: ${error.message}`));
    console.log(chalk.red(`   Code: ${error.code || 'Unknown'}`));
    console.log(chalk.red(`   Name: ${error.name || 'Unknown'}`));
    
    if (error.code) {
      console.log();
      console.log(chalk.yellow('Troubleshooting:'));
      switch (error.code) {
        case 'UnauthorizedOperation':
        case 'InvalidAccessKeyId':
          console.log(chalk.yellow('• Check AWS credentials in .env.local'));
          break;
        case 'ValidationException':
          console.log(chalk.yellow('• Check phone number formats (E.164)'));
          console.log(chalk.yellow('• Verify origination number is simulator'));
          break;
        case 'ResourceNotFoundException':
          console.log(chalk.yellow('• Check AWS region and service availability'));
          break;
        default:
          console.log(chalk.yellow(`• Unknown error code: ${error.code}`));
      }
    }
    console.log();
  }
}

// Run the test
testDirectSMS().catch((error) => {
  console.error(chalk.red('❌ Test script failed:'), error);
  process.exit(1);
});