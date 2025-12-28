#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { prisma } from '../src/db.js';
import { IncomingMessageHandler } from '../src/services/aws/incomingMessageHandler.js';
import { AWSSMSService } from '../src/services/aws/smsService.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

config({ path: resolve(process.cwd(), '.env.local') });

class TwoWaySMSTester {
  private messageHandler: IncomingMessageHandler;
  private smsService: AWSSMSService;
  
  constructor() {
    this.messageHandler = new IncomingMessageHandler();
    this.smsService = new AWSSMSService();
  }
  
  async run() {
    console.log(chalk.blue.bold('\n📱 Two-Way SMS Testing Suite\n'));
    
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select test mode:',
        choices: [
          { name: '💬 Simulate incoming message', value: 'simulate' },
          { name: '🧪 Test budget parsing', value: 'parse' },
          { name: '📊 Test full flow', value: 'full' },
          { name: '🔍 Check user budgets', value: 'check' },
          { name: '⚙️  Test webhook locally', value: 'webhook' }
        ]
      }
    ]);
    
    switch (mode) {
      case 'simulate':
        await this.simulateIncoming();
        break;
      case 'parse':
        await this.testParsing();
        break;
      case 'full':
        await this.testFullFlow();
        break;
      case 'check':
        await this.checkBudgets();
        break;
      case 'webhook':
        await this.testWebhook();
        break;
    }
  }
  
  async simulateIncoming() {
    console.log(chalk.cyan('\n💬 Simulate Incoming Message\n'));
    
    // Get or create test user
    const testPhoneNumber = '+14155552222';
    let user = await prisma.user.findFirst({
      where: { phoneNumber: testPhoneNumber }
    });
    
    if (!user) {
      console.log(chalk.gray('Creating test user...'));
      user = await prisma.user.create({
        data: {
          phoneNumber: testPhoneNumber,
          firstName: 'Test',
          lastName: 'User',
          inviteCode: 'TEST-2WAY',
          phoneVerified: true
        }
      });
      console.log(chalk.green(`✅ Created test user: ${user.firstName} ${user.lastName}`));
    } else {
      console.log(chalk.green(`✅ Using existing test user: ${user.firstName} ${user.lastName}`));
    }
    
    const { messageBody } = await inquirer.prompt([
      {
        type: 'input',
        name: 'messageBody',
        message: 'Enter message body:',
        default: '2000'
      }
    ]);
    
    console.log(chalk.cyan('\n📥 Simulating incoming message...'));
    console.log(chalk.gray(`From: ${this.maskPhone(testPhoneNumber)}`));
    console.log(chalk.gray(`Message: "${messageBody}"`));
    
    // Simulate incoming message
    const incomingMessage = {
      originationNumber: testPhoneNumber,
      destinationNumber: process.env.AWS_PHONE_NUMBER || '+12065559457',
      messageBody,
      inboundMessageId: `test-${Date.now()}`,
      messageKeyword: this.extractKeyword(messageBody)
    };
    
    try {
      await this.messageHandler.processIncomingMessage(incomingMessage);
      console.log(chalk.green('\n✅ Message processed successfully'));
      
      // Check for budget update
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          spendingGoals: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      if (updatedUser?.spendingGoals[0]) {
        console.log(chalk.green(`✅ Budget set to: $${updatedUser.spendingGoals[0].monthlyLimit}`));
        console.log(chalk.gray(`   Period: ${updatedUser.spendingGoals[0].periodStart.toDateString()} - ${updatedUser.spendingGoals[0].periodEnd.toDateString()}`));
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error processing message: ${error.message}`));
    }
  }
  
  async testParsing() {
    const testCases = [
      '2000',
      '$2000',
      '2,000',
      'two thousand',
      'My budget is 3500',
      'set it to 4000',
      'budget 2500',
      'I want 1800',
      'STOP',
      'HELP',
      'random text',
      '50', // Too low
      '500000' // Too high
    ];
    
    console.log(chalk.cyan('\n🧪 Testing Budget Parsing\n'));
    
    for (const testCase of testCases) {
      const result = (this.messageHandler as any).parseBudgetMessage(testCase);
      
      if (result.isValid) {
        if (result.command) {
          console.log(chalk.yellow(`"${testCase.padEnd(20)}" → Command: ${result.command}`));
        } else {
          console.log(chalk.green(`"${testCase.padEnd(20)}" → $${result.amount}`));
        }
      } else {
        console.log(chalk.red(`"${testCase.padEnd(20)}" → Invalid`));
      }
    }
    
    console.log(chalk.cyan('\n📊 Parsing Results:'));
    const validCount = testCases.filter(tc => (this.messageHandler as any).parseBudgetMessage(tc).isValid).length;
    console.log(chalk.gray(`${validCount}/${testCases.length} test cases parsed successfully`));
  }
  
  async testFullFlow() {
    console.log(chalk.cyan('\n🔄 Testing Full Two-Way Flow\n'));
    
    const testPhoneNumber = '+14155553333';
    
    try {
      // 1. Create or get test user
      console.log('1️⃣  Creating test user...');
      const user = await prisma.user.upsert({
        where: { phoneNumber: testPhoneNumber },
        update: { 
          phoneVerified: true,
          isActive: true
        },
        create: {
          phoneNumber: testPhoneNumber,
          firstName: 'Flow',
          lastName: 'Test',
          inviteCode: `FLOW-${Date.now()}`,
          phoneVerified: true
        }
      });
      console.log(chalk.green(`   ✅ User ready: ${user.firstName} ${user.lastName}`));
      
      // 2. Send welcome message
      console.log('2️⃣  Sending welcome message...');
      const welcomeResult = await this.smsService.sendMessage({
        to: user.phoneNumber,
        body: 'Welcome to moony! Reply with your monthly budget (ex: 2000)',
        messageType: 'TRANSACTIONAL'
      });
      
      if (welcomeResult.success) {
        console.log(chalk.green('   ✅ Welcome sent'));
        if (welcomeResult.messageId) {
          console.log(chalk.gray(`   Message ID: ${welcomeResult.messageId}`));
        }
      } else {
        console.log(chalk.red(`   ❌ Welcome failed: ${welcomeResult.error}`));
      }
      
      // 3. Simulate budget reply
      console.log('3️⃣  Simulating budget reply: "3000"...');
      await this.messageHandler.processIncomingMessage({
        originationNumber: user.phoneNumber,
        destinationNumber: process.env.AWS_PHONE_NUMBER!,
        messageBody: '3000',
        inboundMessageId: `test-${Date.now()}`,
      });
      
      // 4. Check budget was set
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          spendingGoals: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      if (updatedUser?.spendingGoals[0]) {
        console.log(chalk.green(`   ✅ Budget set to: $${updatedUser.spendingGoals[0].monthlyLimit}`));
        
        // Calculate some stats
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - now.getDate() + 1;
        const dailyTarget = Math.round(Number(updatedUser.spendingGoals[0].monthlyLimit) / daysRemaining);
        
        console.log(chalk.gray(`   Daily target: $${dailyTarget} (${daysRemaining} days remaining)`));
      } else {
        console.log(chalk.red('   ❌ Budget was not set'));
      }
      
      // 5. Test HELP command
      console.log('4️⃣  Testing HELP command...');
      await this.messageHandler.processIncomingMessage({
        originationNumber: user.phoneNumber,
        destinationNumber: process.env.AWS_PHONE_NUMBER!,
        messageBody: 'HELP',
        inboundMessageId: `test-help-${Date.now()}`,
      });
      console.log(chalk.green('   ✅ HELP command processed'));
      
      console.log(chalk.green('\n✅ Full flow completed successfully!'));
      
    } catch (error: any) {
      console.log(chalk.red(`❌ Full flow failed: ${error.message}`));
    }
  }
  
  async checkBudgets() {
    console.log(chalk.cyan('\n📊 Active User Budgets\n'));
    
    const users = await prisma.user.findMany({
      where: {
        spendingGoals: {
          some: { isActive: true }
        }
      },
      include: {
        spendingGoals: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 10
    });
    
    if (users.length === 0) {
      console.log(chalk.gray('No users with active budgets found'));
      console.log(chalk.yellow('\nTo create test data, run:'));
      console.log(chalk.gray('npm run test:2way → Test full flow'));
    } else {
      console.log(chalk.green(`Found ${users.length} users with active budgets:\n`));
      
      users.forEach((user, index) => {
        const budget = user.spendingGoals[0];
        console.log(`${index + 1}. ${chalk.cyan(user.firstName + ' ' + user.lastName)}`);
        console.log(`   💰 Budget: $${budget.monthlyLimit}`);
        console.log(`   📱 Phone: ${this.maskPhone(user.phoneNumber)}`);
        console.log(`   📅 Set: ${budget.createdAt.toLocaleDateString()}`);
        console.log(`   📊 Period: ${budget.periodStart.toDateString()} → ${budget.periodEnd.toDateString()}`);
        console.log();
      });
      
      // Show total budgets
      const totalBudget = users.reduce((sum, user) => 
        sum + Number(user.spendingGoals[0].monthlyLimit), 0
      );
      console.log(chalk.cyan(`💡 Total monthly budgets: $${totalBudget.toLocaleString()}`));
    }
  }
  
  async testWebhook() {
    console.log(chalk.cyan('\n⚙️  Webhook Testing Guide\n'));
    
    const webhookUrl = process.env.AWS_WEBHOOK_URL;
    
    if (webhookUrl) {
      console.log(chalk.green(`✅ Webhook URL configured: ${webhookUrl}`));
    } else {
      console.log(chalk.yellow('⚠️  No webhook URL configured in AWS_WEBHOOK_URL'));
    }
    
    console.log(chalk.cyan('\nTo test the webhook locally:\n'));
    
    console.log('1. 🚀 Start your API server:');
    console.log(chalk.gray('   npm run api:dev'));
    console.log();
    
    console.log('2. 🌐 Start ngrok tunnel:');
    console.log(chalk.gray('   ngrok http 3000'));
    console.log();
    
    console.log('3. 📋 Copy the HTTPS URL from ngrok');
    console.log(chalk.gray('   Example: https://abc123.ngrok.io'));
    console.log();
    
    console.log('4. 🔧 Setup webhook subscription:');
    console.log(chalk.gray('   npm run setup:webhook'));
    console.log(chalk.gray('   → Choose "Add webhook subscription"'));
    console.log(chalk.gray('   → Choose "Local (ngrok)"'));
    console.log(chalk.gray('   → Enter your ngrok URL'));
    console.log();
    
    console.log('5. ✅ Test the webhook:');
    console.log(chalk.gray('   Your webhook URL will be:'));
    console.log(chalk.green('   https://YOUR-NGROK-ID.ngrok.io/api/webhooks/aws/incoming-sms'));
    console.log();
    
    console.log('6. 📱 Test with this script:');
    console.log(chalk.gray('   npm run test:2way → Simulate incoming message'));
    console.log();
    
    console.log(chalk.cyan('Current Environment:\n'));
    console.log(`   AWS_PHONE_NUMBER: ${process.env.AWS_PHONE_NUMBER || 'Not set'}`);
    console.log(`   AWS_SIMULATOR_DESTINATION: ${process.env.AWS_SIMULATOR_DESTINATION || 'Not set'}`);
    console.log(`   AWS_USE_SIMULATOR_OVERRIDE: ${process.env.AWS_USE_SIMULATOR_OVERRIDE || 'Not set'}`);
    console.log(`   SKIP_SNS_VERIFICATION: ${process.env.SKIP_SNS_VERIFICATION || 'Not set'}`);
    
    console.log(chalk.yellow('\n💡 Pro tip: Use the "Simulate incoming message" option to test without SNS'));
  }
  
  private extractKeyword(message: string): string | undefined {
    const keywords = ['STOP', 'START', 'HELP', 'BUDGET'];
    const upperMessage = message.toUpperCase().trim();
    return keywords.find(k => upperMessage.startsWith(k));
  }
  
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return `****${phone.slice(-4)}`;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⏹️  Shutting down...'));
  await prisma.$disconnect();
  process.exit(0);
});

// Run the tester
const tester = new TwoWaySMSTester();
tester.run().catch((error) => {
  console.error(chalk.red('\n❌ Test failed:'), error.message);
}).finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});