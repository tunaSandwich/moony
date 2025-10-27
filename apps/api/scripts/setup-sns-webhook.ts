#!/usr/bin/env node
import { SNSClient, SubscribeCommand, ListSubscriptionsByTopicCommand, UnsubscribeCommand, CreateTopicCommand, ListTopicsCommand } from '@aws-sdk/client-sns';
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import axios from 'axios';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

class SNSWebhookSetup {
  private snsClient: SNSClient;
  private topicArn: string;
  
  constructor() {
    // Use your existing SNS topic
    this.topicArn = process.env.AWS_SNS_TOPIC_ARN || 'arn:aws:sns:us-west-1:757212422632:moony-sms-notifications';
    
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    };
    
    this.snsClient = new SNSClient({ 
      region: process.env.AWS_REGION || 'us-west-1', 
      credentials 
    });
  }
  
  async run() {
    console.log(chalk.blue.bold('\n🔗 AWS SNS Webhook Setup\n'));
    console.log(chalk.gray(`Using SNS Topic: ${this.topicArn}\n`));
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '✅ Check current configuration', value: 'check' },
          { name: '🆕 Create SNS topic', value: 'create-topic' },
          { name: '🔗 Add webhook subscription', value: 'subscribe' },
          { name: '📋 List active subscriptions', value: 'list' },
          { name: '🗑️  Remove subscription', value: 'unsubscribe' },
          { name: '🧪 Test webhook endpoint', value: 'test' }
        ]
      }
    ]);
    
    switch (action) {
      case 'check':
        await this.checkConfiguration();
        break;
      case 'create-topic':
        await this.createSNSTopic();
        break;
      case 'subscribe':
        await this.addWebhookSubscription();
        break;
      case 'list':
        await this.listSubscriptions();
        break;
      case 'unsubscribe':
        await this.removeSubscription();
        break;
      case 'test':
        await this.testWebhook();
        break;
    }
  }
  
  async checkConfiguration() {
    console.log(chalk.cyan('\n📊 Current Configuration:\n'));
    
    // Check environment variables
    const checks = [
      { name: 'AWS_SNS_TOPIC_ARN', value: process.env.AWS_SNS_TOPIC_ARN, required: true },
      { name: 'AWS_REGION', value: process.env.AWS_REGION, required: true },
      { name: 'AWS_ACCESS_KEY_ID', value: process.env.AWS_ACCESS_KEY_ID ? '✓ SET' : undefined, required: true },
      { name: 'AWS_SECRET_ACCESS_KEY', value: process.env.AWS_SECRET_ACCESS_KEY ? '✓ SET' : undefined, required: true },
      { name: 'AWS_PHONE_NUMBER', value: process.env.AWS_PHONE_NUMBER, required: true },
      { name: 'AWS_SIMULATOR_DESTINATION', value: process.env.AWS_SIMULATOR_DESTINATION, required: false },
      { name: 'AWS_WEBHOOK_URL', value: process.env.AWS_WEBHOOK_URL, required: false }
    ];
    
    let allGood = true;
    checks.forEach(check => {
      if (check.value) {
        console.log(chalk.green(`✅ ${check.name}: ${check.value}`));
      } else if (check.required) {
        console.log(chalk.red(`❌ ${check.name}: Not configured`));
        allGood = false;
      } else {
        console.log(chalk.yellow(`⚠️  ${check.name}: Not configured (optional)`));
      }
    });
    
    if (!allGood) {
      console.log(chalk.red('\n❌ Missing required configuration'));
      console.log(chalk.yellow('Add missing values to your .env.local file'));
    } else {
      console.log(chalk.green('\n✅ All required configuration present'));
    }
    
    // List current subscriptions
    console.log(chalk.cyan('\n📬 Current Subscriptions:'));
    await this.listSubscriptions();
  }
  
  async createSNSTopic() {
    console.log(chalk.cyan('\n🆕 Creating SNS Topic\n'));
    
    const { topicName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'topicName',
        message: 'Enter topic name:',
        default: 'moony-sms-notifications',
        validate: (input) => {
          const nameRegex = /^[a-zA-Z0-9_-]+$/;
          return nameRegex.test(input) || 'Topic name can only contain letters, numbers, hyphens, and underscores';
        }
      }
    ]);
    
    try {
      console.log(chalk.gray(`Creating topic: ${topicName}`));
      
      const command = new CreateTopicCommand({
        Name: topicName,
        Attributes: {
          'DisplayName': 'Moony SMS Notifications',
          'DeliveryPolicy': JSON.stringify({
            'http': {
              'defaultHealthyRetryPolicy': {
                'numRetries': 3,
                'numNoDelayRetries': 0,
                'minDelayTarget': 20,
                'maxDelayTarget': 20,
                'numMinDelayRetries': 0,
                'numMaxDelayRetries': 0,
                'backoffFunction': 'linear'
              }
            }
          })
        }
      });
      
      const response = await this.snsClient.send(command);
      
      console.log(chalk.green('\n✅ SNS Topic created successfully!'));
      console.log(chalk.cyan('Topic ARN:'), response.TopicArn);
      
      // Update the internal topic ARN
      this.topicArn = response.TopicArn!;
      
      console.log(chalk.yellow('\n📝 Update your .env.local:'));
      console.log(`AWS_SNS_TOPIC_ARN=${response.TopicArn}`);
      
    } catch (error: any) {
      if (error.name === 'TopicLimitExceeded') {
        console.log(chalk.red('\n❌ Topic limit exceeded'));
        console.log(chalk.gray('You have reached the maximum number of SNS topics'));
      } else if (error.message.includes('already exists')) {
        console.log(chalk.yellow('\n⚠️  Topic already exists'));
        
        // Try to find the existing topic
        try {
          const listCommand = new ListTopicsCommand({});
          const listResponse = await this.snsClient.send(listCommand);
          
          const existingTopic = listResponse.Topics?.find(topic => 
            topic.TopicArn?.includes(topicName)
          );
          
          if (existingTopic) {
            console.log(chalk.cyan('Existing Topic ARN:'), existingTopic.TopicArn);
            console.log(chalk.yellow('\n📝 Use this ARN in your .env.local:'));
            console.log(`AWS_SNS_TOPIC_ARN=${existingTopic.TopicArn}`);
          }
        } catch (listError) {
          console.log(chalk.gray('Could not list existing topics'));
        }
      } else {
        console.log(chalk.red('\n❌ Error creating topic:'), error.message);
      }
    }
  }
  
  async addWebhookSubscription() {
    const { environment } = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Select environment:',
        choices: [
          { name: '🏠 Local (ngrok)', value: 'local' },
          { name: '🚂 Staging (Railway)', value: 'staging' },
          { name: '✏️  Custom URL', value: 'custom' }
        ]
      }
    ]);
    
    let webhookUrl: string;
    
    if (environment === 'local') {
      console.log(chalk.yellow('\n📝 For local testing:'));
      console.log(chalk.gray('1. Start your API: npm run api:dev'));
      console.log(chalk.gray('2. In new terminal: ngrok http 3000'));
      console.log(chalk.gray('3. Copy the HTTPS URL\n'));
      
      const { ngrokUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'ngrokUrl',
          message: 'Enter your ngrok URL:',
          validate: (input) => input.startsWith('https://') || 'Must start with https://'
        }
      ]);
      
      webhookUrl = `${ngrokUrl}/api/webhooks/aws/incoming-sms`;
      
    } else if (environment === 'staging') {
      const { railwayUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'railwayUrl',
          message: 'Enter your Railway URL:',
          default: 'https://api-staging.railway.app'
        }
      ]);
      webhookUrl = `${railwayUrl}/api/webhooks/aws/incoming-sms`;
      
    } else {
      const { customUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customUrl',
          message: 'Enter full webhook URL:',
          default: 'https://your-domain.com/api/webhooks/aws/incoming-sms'
        }
      ]);
      webhookUrl = customUrl;
    }
    
    try {
      console.log(chalk.cyan('\n🔗 Creating subscription...'));
      console.log(chalk.gray(`Webhook URL: ${webhookUrl}`));
      
      const command = new SubscribeCommand({
        TopicArn: this.topicArn,
        Protocol: 'https',
        Endpoint: webhookUrl,
        Attributes: {
          'RawMessageDelivery': 'false' // Keep SNS wrapper for signature verification
        }
      });
      
      const response = await this.snsClient.send(command);
      
      console.log(chalk.green('\n✅ Subscription created!'));
      console.log(chalk.cyan('Subscription ARN:'), response.SubscriptionArn || 'Pending Confirmation');
      
      if (response.SubscriptionArn === 'PendingConfirmation') {
        console.log(chalk.yellow('\n⚠️  Subscription requires confirmation'));
        console.log(chalk.gray('Your webhook endpoint will receive a confirmation request'));
        console.log(chalk.gray('The endpoint must handle the SubscriptionConfirmation message'));
      }
      
      // Save to environment
      console.log(chalk.yellow('\n📝 Add this to your .env.local:'));
      console.log(`AWS_WEBHOOK_URL=${webhookUrl}`);
      
    } catch (error: any) {
      console.log(chalk.red('\n❌ Error creating subscription:'), error.message);
    }
  }
  
  async listSubscriptions() {
    try {
      const command = new ListSubscriptionsByTopicCommand({ 
        TopicArn: this.topicArn 
      });
      const response = await this.snsClient.send(command);
      
      if (response.Subscriptions && response.Subscriptions.length > 0) {
        console.log('');
        response.Subscriptions.forEach((sub, index) => {
          const status = sub.SubscriptionArn === 'PendingConfirmation' 
            ? chalk.yellow('⏳ Pending') 
            : chalk.green('✅ Active');
          
          console.log(`${index + 1}. ${status}`);
          console.log(chalk.gray(`   Protocol: ${sub.Protocol}`));
          console.log(chalk.gray(`   Endpoint: ${sub.Endpoint}`));
          if (sub.SubscriptionArn !== 'PendingConfirmation') {
            console.log(chalk.gray(`   ARN: ${sub.SubscriptionArn}`));
          }
          console.log('');
        });
      } else {
        console.log(chalk.gray('No subscriptions found\n'));
      }
    } catch (error: any) {
      console.log(chalk.red('Error listing subscriptions:'), error.message);
    }
  }
  
  async removeSubscription() {
    // First list subscriptions
    const listCommand = new ListSubscriptionsByTopicCommand({ 
      TopicArn: this.topicArn 
    });
    const response = await this.snsClient.send(listCommand);
    
    if (!response.Subscriptions || response.Subscriptions.length === 0) {
      console.log(chalk.gray('\nNo subscriptions to remove'));
      return;
    }
    
    const choices = response.Subscriptions
      .filter(sub => sub.SubscriptionArn !== 'PendingConfirmation')
      .map(sub => ({
        name: `${sub.Protocol}: ${sub.Endpoint}`,
        value: sub.SubscriptionArn
      }));
    
    if (choices.length === 0) {
      console.log(chalk.gray('\nNo active subscriptions to remove'));
      return;
    }
    
    const { subscriptionArn } = await inquirer.prompt([
      {
        type: 'list',
        name: 'subscriptionArn',
        message: 'Select subscription to remove:',
        choices
      }
    ]);
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to remove this subscription?',
        default: false
      }
    ]);
    
    if (confirm) {
      try {
        await this.snsClient.send(new UnsubscribeCommand({
          SubscriptionArn: subscriptionArn
        }));
        console.log(chalk.green('\n✅ Subscription removed'));
      } catch (error: any) {
        console.log(chalk.red('\n❌ Error removing subscription:'), error.message);
      }
    }
  }
  
  async testWebhook() {
    const webhookUrl = process.env.AWS_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.log(chalk.yellow('\n⚠️  AWS_WEBHOOK_URL not configured'));
      console.log(chalk.gray('Add a webhook subscription first'));
      return;
    }
    
    console.log(chalk.cyan('\n🧪 Testing webhook endpoint...'));
    console.log(chalk.gray(`URL: ${webhookUrl}\n`));
    
    try {
      // Test with a simple GET request first to health endpoint
      const healthUrl = webhookUrl.replace('/incoming-sms', '/health');
      console.log(chalk.gray(`Testing health endpoint: ${healthUrl}`));
      
      const response = await axios.get(healthUrl, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log(chalk.green('✅ Webhook endpoint is reachable'));
        console.log(chalk.gray(`Response: ${JSON.stringify(response.data)}`));
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log(chalk.red('❌ Connection refused - is your server running?'));
      } else if (error.code === 'ETIMEDOUT') {
        console.log(chalk.red('❌ Connection timeout - check your URL'));
      } else if (error.response?.status === 404) {
        console.log(chalk.yellow('⚠️  Health endpoint not found - but server is running'));
        console.log(chalk.gray('This is normal if /api/health endpoint is not implemented'));
      } else {
        console.log(chalk.yellow('⚠️  Could not reach webhook'));
        console.log(chalk.gray(error.message));
      }
    }
    
    console.log(chalk.cyan('\n📱 To test incoming messages:'));
    console.log('1. Ensure webhook is subscribed and confirmed');
    console.log('2. Use the test scripts to simulate messages');
    console.log('3. Check your server logs for incoming webhook calls');
    console.log('4. SNS will retry failed deliveries with exponential backoff');
  }
  
  async validateCredentials() {
    try {
      // Test SNS access by listing subscriptions
      const command = new ListSubscriptionsByTopicCommand({ 
        TopicArn: this.topicArn 
      });
      await this.snsClient.send(command);
      return true;
    } catch (error: any) {
      console.log(chalk.yellow('\n⚠️  SNS Topic validation:'));
      console.log(chalk.yellow(`   ${error.message}`));
      
      if (error.name === 'NotFound' || error.message.includes('does not exist')) {
        console.log(chalk.cyan('\n💡 The SNS topic does not exist yet.'));
        console.log(chalk.gray('This is normal for new setups.'));
        console.log(chalk.gray('The topic will be created when needed for incoming SMS.'));
        
        // Test basic SNS access instead
        try {
          const { SNSClient, ListTopicsCommand } = await import('@aws-sdk/client-sns');
          const testClient = new SNSClient({
            region: process.env.AWS_REGION || 'us-west-1',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
          });
          
          await testClient.send(new ListTopicsCommand({}));
          console.log(chalk.green('✅ Basic SNS access confirmed'));
          return true;
        } catch (basicError: any) {
          console.log(chalk.red(`❌ Basic SNS access failed: ${basicError.message}`));
          return false;
        }
      } else {
        console.log(chalk.red(`❌ Unexpected error: ${error.message}`));
        return false;
      }
    }
  }
}

// Validate environment before running
async function validateEnvironment() {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID', 
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SNS_TOPIC_ARN'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    missing.forEach(key => console.error(chalk.red(`  - ${key}`)));
    console.log(chalk.yellow('\nAdd these to your .env.local file'));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⏹️  Shutting down...'));
  process.exit(0);
});

// Run the setup
async function main() {
  await validateEnvironment();
  
  const setup = new SNSWebhookSetup();
  
  // Validate credentials first
  console.log(chalk.gray('Validating AWS credentials...'));
  const credentialsValid = await setup.validateCredentials();
  
  if (!credentialsValid) {
    process.exit(1);
  }
  
  console.log(chalk.green('✅ AWS credentials validated'));
  
  await setup.run();
}

main().catch((error) => {
  console.error(chalk.red('\n❌ Setup failed:'), error.message);
  process.exit(1);
});