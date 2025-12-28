#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { prisma } from '../src/db.js';
import { WelcomeMessageService } from '../src/services/aws/welcomeMessageService.js';
import { AWSSMSService } from '../src/services/aws/smsService.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { format } from 'date-fns';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const TEST_USERS = {
  SIMULATOR: {
    phoneNumber: '+12065559457',
    firstName: 'Test',
    lastName: 'User',
    inviteCode: 'TEST-SIMULATOR',
    email: 'test-simulator@example.com'
  },
  REAL: {
    phoneNumber: process.env.TEST_PHONE_NUMBER || '',
    firstName: 'Real',
    lastName: 'Test',
    inviteCode: 'TEST-REAL',
    email: 'test-real@example.com'
  }
};

class WelcomeMessageTester {
  private welcomeService: WelcomeMessageService;
  private smsService: AWSSMSService;
  
  constructor() {
    this.welcomeService = new WelcomeMessageService();
    this.smsService = new AWSSMSService();
  }
  
  async run() {
    console.log(chalk.blue.bold('\n🧪 Welcome Message Testing Suite\n'));
    
    // Check sandbox mode
    const isSandbox = process.env.AWS_SANDBOX_MODE !== 'false';
    if (isSandbox) {
      console.log(chalk.yellow('⚠️  Running in SANDBOX mode'));
      console.log(chalk.yellow('   Only verified numbers will receive messages\n'));
    }
    
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select testing mode:',
        choices: [
          { name: '🤖 Automated - Test all scenarios with simulator', value: 'auto' },
          { name: '📱 Interactive - Test with real phone number', value: 'interactive' },
          { name: '🔍 Check User - View existing user data', value: 'check' },
          { name: '🧹 Cleanup - Remove test users', value: 'cleanup' }
        ]
      }
    ]);
    
    switch (mode) {
      case 'auto':
        await this.runAutomatedTests();
        break;
      case 'interactive':
        await this.runInteractiveTest();
        break;
      case 'check':
        await this.checkUserData();
        break;
      case 'cleanup':
        await this.cleanup();
        break;
    }
  }
  
  async runAutomatedTests() {
    console.log(chalk.blue('\n📋 Running automated tests...\n'));
    
    // Create or get test user
    let user = await this.createOrGetTestUser(TEST_USERS.SIMULATOR);
    
    // Test Scenario A: Full data
    console.log(chalk.cyan('\n1️⃣  Testing Scenario A: Full analytics data'));
    await this.setupScenarioA(user.id);
    await this.testWelcomeMessage(user.id, 'A');
    
    // Test Scenario B: Partial data
    console.log(chalk.cyan('\n2️⃣  Testing Scenario B: Current month only'));
    await this.setupScenarioB(user.id);
    await this.testWelcomeMessage(user.id, 'B');
    
    // Test Scenario C: No data
    console.log(chalk.cyan('\n3️⃣  Testing Scenario C: No analytics'));
    await this.setupScenarioC(user.id);
    await this.testWelcomeMessage(user.id, 'C');
    
    // Test Reconnection
    console.log(chalk.cyan('\n4️⃣  Testing Reconnection message'));
    await this.testReconnection(user.id);
    
    // Test Resend
    console.log(chalk.cyan('\n5️⃣  Testing Resend welcome'));
    await this.testResend(user.id);
    
    // Test Budget Confirmation
    console.log(chalk.cyan('\n6️⃣  Testing Budget confirmation'));
    await this.testBudgetConfirmation(user.id);
    
    // Test Budget Update
    console.log(chalk.cyan('\n7️⃣  Testing Budget update confirmation'));
    await this.testBudgetUpdate(user.id);
    
    // Test Data Error
    console.log(chalk.cyan('\n8️⃣  Testing Data error message'));
    await this.testDataError(user.id);
    
    console.log(chalk.green.bold('\n✅ All automated tests completed!\n'));
  }
  
  async runInteractiveTest() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'phoneNumber',
        message: 'Enter phone number (E.164 format):',
        default: TEST_USERS.REAL.phoneNumber || '+1'
      },
      {
        type: 'confirm',
        name: 'isVerified',
        message: 'Is this number verified in AWS sandbox?',
        default: false
      },
      {
        type: 'list',
        name: 'scenario',
        message: 'Which scenario to test?',
        choices: [
          { name: 'Scenario A - Full analytics', value: 'A' },
          { name: 'Scenario B - Current month only', value: 'B' },
          { name: 'Scenario C - No data', value: 'C' },
          { name: 'Reconnection message', value: 'reconnection' },
          { name: 'Budget confirmation', value: 'budget' },
          { name: 'Budget update', value: 'budget-update' },
          { name: 'Data error message', value: 'error' }
        ]
      }
    ]) as {
      phoneNumber: string;
      isVerified: boolean;
      scenario: 'A' | 'B' | 'C' | 'reconnection' | 'budget' | 'budget-update' | 'error';
    };
    
    // Create test user
    const user = await this.createOrGetTestUser({
      ...TEST_USERS.REAL,
      phoneNumber: answers.phoneNumber
    });
    
    // Run selected test
    switch (answers.scenario) {
      case 'A':
      case 'B':
      case 'C': {
        const setupMap: Record<'A' | 'B' | 'C', (userId: string) => Promise<void>> = {
          A: this.setupScenarioA.bind(this),
          B: this.setupScenarioB.bind(this),
          C: this.setupScenarioC.bind(this)
        };
        await setupMap[answers.scenario](user.id);
        await this.testWelcomeMessage(user.id, answers.scenario);
        break;
      }
      case 'reconnection':
        await this.testReconnection(user.id);
        break;
      case 'budget':
        const { budget } = await inquirer.prompt([{
          type: 'number',
          name: 'budget',
          message: 'Enter budget amount:',
          default: 2000
        }]);
        await this.testBudgetConfirmation(user.id, budget);
        break;
      case 'budget-update':
        const { newBudget } = await inquirer.prompt([{
          type: 'number',
          name: 'newBudget',
          message: 'Enter new budget amount:',
          default: 2500
        }]);
        await this.testBudgetUpdate(user.id, newBudget);
        break;
      case 'error':
        await this.testDataError(user.id);
        break;
    }
    
    console.log(chalk.green('\n✅ Test completed!\n'));
  }
  
  async createOrGetTestUser(userData: any) {
    let user = await prisma.user.findFirst({
      where: { phoneNumber: userData.phoneNumber }
    });
    
    if (!user) {
      console.log(chalk.gray('Creating test user...'));
      user = await prisma.user.create({
        data: {
          ...userData,
          phoneVerified: true
        }
      });
    }
    
    return user;
  }
  
  async setupScenarioA(userId: string) {
    // Create full analytics data
    await prisma.userSpendingAnalytics.upsert({
      where: { userId },
      create: {
        userId,
        averageMonthlySpending: 3500,
        twoMonthsAgoSpending: 4200,
        lastMonthSpending: 3800,
        currentMonthSpending: 1250,
        lastCalculatedAt: new Date()
      },
      update: {
        averageMonthlySpending: 3500,
        twoMonthsAgoSpending: 4200,
        lastMonthSpending: 3800,
        currentMonthSpending: 1250,
        lastCalculatedAt: new Date()
      }
    });
  }
  
  async setupScenarioB(userId: string) {
    // Only current month data
    await prisma.userSpendingAnalytics.upsert({
      where: { userId },
      create: {
        userId,
        currentMonthSpending: 850,
        lastCalculatedAt: new Date()
      },
      update: {
        averageMonthlySpending: null,
        twoMonthsAgoSpending: null,
        lastMonthSpending: null,
        currentMonthSpending: 850,
        lastCalculatedAt: new Date()
      }
    });
  }
  
  async setupScenarioC(userId: string) {
    // No analytics data
    await prisma.userSpendingAnalytics.deleteMany({
      where: { userId }
    });
  }
  
  async testWelcomeMessage(userId: string, expectedScenario: string) {
    const result = await this.welcomeService.sendWelcomeMessage(userId, {
      triggerAnalytics: false // Don't trigger for testing
    });
    
    this.displayResult('Welcome Message', result, expectedScenario);
  }
  
  async testReconnection(userId: string) {
    const result = await this.welcomeService.sendWelcomeMessage(userId, {
      isReconnection: true
    });
    
    this.displayResult('Reconnection', result, 'reconnection');
  }
  
  async testResend(userId: string) {
    const result = await this.welcomeService.resendWelcomeMessage(userId);
    this.displayResult('Resend Welcome', result);
  }
  
  async testBudgetConfirmation(userId: string, budget: number = 2000) {
    const result = await this.welcomeService.sendBudgetConfirmation(userId, budget);
    this.displayResult('Budget Confirmation', result);
  }
  
  async testBudgetUpdate(userId: string, budget: number = 2500) {
    const result = await this.welcomeService.sendBudgetUpdateConfirmation(userId, budget);
    this.displayResult('Budget Update', result);
  }
  
  async testDataError(userId: string) {
    const result = await this.welcomeService.sendDataErrorMessage(userId);
    this.displayResult('Data Error', result);
  }
  
  displayResult(testName: string, result: any, expectedScenario?: string) {
    console.log(chalk.gray(`\n${testName} Result:`));
    
    if (result.success) {
      console.log(chalk.green(`  ✓ Success`));
      console.log(chalk.gray(`    Message ID: ${result.messageId}`));
      console.log(chalk.gray(`    Scenario: ${result.scenario}`));
      
      if (expectedScenario && result.scenario !== expectedScenario) {
        console.log(chalk.yellow(`  ⚠️  Expected scenario ${expectedScenario}, got ${result.scenario}`));
      }
      
      if (result.sandboxLimited) {
        console.log(chalk.yellow(`    Note: Sandbox mode - message simulated`));
      }
    } else {
      console.log(chalk.red(`  ✗ Failed`));
      console.log(chalk.red(`    Error: ${result.error}`));
      
      if (result.sandboxLimited) {
        console.log(chalk.yellow(`    Note: Sandbox verification required`));
      }
    }
  }
  
  async checkUserData() {
    const { phoneNumber } = await inquirer.prompt([{
      type: 'input',
      name: 'phoneNumber',
      message: 'Enter phone number to check:',
      default: '+12065559457'
    }]);
    
    const user = await prisma.user.findFirst({
      where: { phoneNumber },
      include: {
        spendingAnalytics: true,
        spendingGoals: {
          where: { isActive: true }
        }
      }
    });
    
    if (user) {
      console.log(chalk.green('\nUser found:'));
      console.log(chalk.gray(JSON.stringify({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        plaidConnected: !!user.plaidItemId,
        analytics: user.spendingAnalytics,
        activeGoals: user.spendingGoals.length,
        createdAt: user.createdAt
      }, null, 2)));
    } else {
      console.log(chalk.red('\nUser not found'));
    }
  }
  
  async cleanup() {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Delete all test users?',
      default: false
    }]);
    
    if (confirm) {
      const deleted = await prisma.user.deleteMany({
        where: {
          inviteCode: {
            startsWith: 'TEST-'
          }
        }
      });
      
      console.log(chalk.green(`\n✅ Deleted ${deleted.count} test users\n`));
    }
  }
  
  async displayWelcomeMessages() {
    console.log(chalk.blue('\n📋 Available Welcome Message Templates:\n'));
    
    const scenarios = [
      {
        name: 'Scenario A - Full Data',
        description: 'User has 2+ months of spending history',
        variables: { 
          firstName: 'Alice', 
          twoMonthsAgoName: 'August', 
          twoMonthsAgoAmount: '4,200',
          lastMonthName: 'September', 
          lastMonthAmount: '3,800',
          currentMonthName: 'October',
          currentMonthAmount: '1,250'
        }
      },
      {
        name: 'Scenario B - Partial Data',
        description: 'User has current month spending only',
        variables: { 
          firstName: 'Bob', 
          currentMonthName: 'October',
          currentMonthAmount: '850'
        }
      },
      {
        name: 'Scenario C - No Data',
        description: 'New user with no spending history',
        variables: { 
          firstName: 'Charlie', 
          currentMonthName: 'October'
        }
      },
      {
        name: 'Reconnection',
        description: 'User reconnecting their bank account',
        variables: { 
          currentMonthName: 'October',
          currentMonthAmount: '1,500'
        }
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(chalk.cyan(`${scenario.name}:`));
      console.log(chalk.gray(`  ${scenario.description}`));
      console.log(chalk.white(`  Variables: ${JSON.stringify(scenario.variables)}\n`));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⏹️  Shutting down...'));
  await prisma.$disconnect();
  process.exit(0);
});

// Run the tester
const tester = new WelcomeMessageTester();
tester.run().catch((error) => {
  console.error(chalk.red('\n❌ Error running tests:'), error);
}).finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});
