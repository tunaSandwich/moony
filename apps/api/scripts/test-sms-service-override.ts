#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

// Create a mock AWS config to avoid the validation issue
const mockAWSConfig = {
  region: process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  },
  snsTopicArn: process.env.AWS_SNS_TOPIC_ARN || 'arn:aws:sns:us-west-1:123456789012:mock-topic',
  isSandbox: process.env.AWS_SANDBOX_MODE !== 'false',
  environment: 'local' as const
};

// Override the aws config module
import module from 'module';
const originalRequire = module.prototype.require;
module.prototype.require = function(id: string) {
  if (id.endsWith('config/aws.js')) {
    return { awsConfig: mockAWSConfig };
  }
  return originalRequire.apply(this, arguments as any);
};

// Now import the service
import { AWSSMSService } from '../src/services/aws/smsService.js';

async function testSMSServiceOverride() {
  console.log(chalk.blue.bold('\n🔄 AWS SMS Service Override Test\n'));
  
  try {
    const smsService = new AWSSMSService();
    
    // Test 1: Real number that should be overridden
    console.log(chalk.cyan('Test 1: Real Number Override'));
    console.log(chalk.gray('Sending to real number (should be overridden with simulator)'));
    
    const realNumberResult = await smsService.sendMessage({
      to: '+16268075538', // Real number
      body: 'Test message to real number\n\nThis should be redirected to simulator destination.',
      messageType: 'TRANSACTIONAL',
      userId: 'test-user-1'
    });
    
    console.log(chalk.gray(`Result: ${realNumberResult.success ? '✓ Success' : '✗ Failed'}`));
    if (realNumberResult.success) {
      console.log(chalk.gray(`Message ID: ${realNumberResult.messageId}`));
    } else {
      console.log(chalk.red(`Error: ${realNumberResult.error}`));
    }
    console.log();
    
    // Test 2: Simulator number (should go through directly)
    console.log(chalk.cyan('Test 2: Simulator Number Direct'));
    console.log(chalk.gray('Sending to simulator number (should go through directly)'));
    
    const simulatorResult = await smsService.sendMessage({
      to: '+14254147755', // Simulator number
      body: 'Test message to simulator\n\nThis should go directly to simulator.',
      messageType: 'TRANSACTIONAL',
      userId: 'test-user-2'
    });
    
    console.log(chalk.gray(`Result: ${simulatorResult.success ? '✓ Success' : '✗ Failed'}`));
    if (simulatorResult.success) {
      console.log(chalk.gray(`Message ID: ${simulatorResult.messageId}`));
    } else {
      console.log(chalk.red(`Error: ${simulatorResult.error}`));
    }
    console.log();
    
    // Summary
    console.log(chalk.green.bold('✅ SMS Service Override Tests Completed!'));
    console.log(chalk.gray(`Real number override: ${realNumberResult.success ? 'PASS' : 'FAIL'}`));
    console.log(chalk.gray(`Simulator direct: ${simulatorResult.success ? 'PASS' : 'FAIL'}`));
    
  } catch (error: any) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  }
}

testSMSServiceOverride().catch(console.error);