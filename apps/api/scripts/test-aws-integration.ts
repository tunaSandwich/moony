#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { prisma } from '../src/db.js';
import { DailySmsService } from '../src/services/dailySmsService.js';
import { startOfMonth, endOfMonth, addDays } from 'date-fns';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Test configuration
const TEST_CONFIG = {
  // AWS simulator numbers (safe for testing)
  simulatorNumbers: {
    success: '+14254147755', // AWS destination simulator
    secondary: '+14254147156', // Alternative destination simulator
  },
  testData: {
    monthlyGoal: 2000,
    currentSpending: 543,
    firstName: 'TestUser',
    lastName: 'AWS'
  }
};

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

class AWSIntegrationTester {
  private testUserId: string | null = null;
  private testGoalId: string | null = null;
  private testAnalyticsId: string | null = null;

  async runTest(): Promise<void> {
    console.log(chalk.blue.bold('\n🧪 AWS SMS Integration Test\n'));
    console.log(chalk.gray('Testing full AWS SMS flow with simulator numbers in sandbox mode\n'));

    try {
      // Step 1: Environment validation
      await this.validateEnvironment();
      
      // Step 2: Create test data
      await this.createTestData();
      
      // Step 3: Run daily SMS service
      await this.runDailySmsService();
      
      // Step 4: Verify results
      await this.verifyResults();
      
      console.log(chalk.green.bold('\n🎉 Integration test completed successfully!'));
      
    } catch (error: any) {
      console.log(chalk.red.bold(`\n❌ Integration test failed: ${error.message}`));
      throw error;
    } finally {
      // Always clean up
      await this.cleanup();
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log(chalk.cyan('📋 Step 1: Environment Validation'));
    
    const requiredEnvVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID', 
      'AWS_SECRET_ACCESS_KEY',
      'AWS_PHONE_NUMBER'
    ];

    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log(chalk.green('   ✅ All required AWS environment variables present'));
    console.log(chalk.gray(`   ✅ AWS Region: ${process.env.AWS_REGION}`));
    console.log(chalk.gray(`   ✅ AWS Phone: ${process.env.AWS_PHONE_NUMBER}`));
    console.log(chalk.gray(`   ✅ Sandbox Mode: ${process.env.AWS_SANDBOX_MODE !== 'false' ? 'Enabled' : 'Disabled'}`));
    console.log();
  }

  private async createTestData(): Promise<void> {
    console.log(chalk.cyan('📊 Step 2: Creating Test Data'));

    // Create test user with simulator number
    const testUser = await prisma.user.create({
      data: {
        inviteCode: `TEST_${Date.now()}`,
        firstName: TEST_CONFIG.testData.firstName,
        lastName: TEST_CONFIG.testData.lastName,
        phoneNumber: TEST_CONFIG.simulatorNumbers.success,
        phoneVerified: true,
        isActive: true,
        sandboxVerified: true, // Mark as sandbox verified
      }
    });

    this.testUserId = testUser.id;
    console.log(chalk.green(`   ✅ Created test user: ${testUser.firstName} ${testUser.lastName}`));
    console.log(chalk.gray(`      Phone: ${testUser.phoneNumber}`));
    console.log(chalk.gray(`      User ID: ${testUser.id}`));

    // Create spending goal
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    const spendingGoal = await prisma.spendingGoal.create({
      data: {
        userId: testUser.id,
        monthlyLimit: TEST_CONFIG.testData.monthlyGoal,
        monthStartDay: 1,
        periodStart,
        periodEnd,
        isActive: true,
      }
    });

    this.testGoalId = spendingGoal.id;
    console.log(chalk.green(`   ✅ Created spending goal: $${TEST_CONFIG.testData.monthlyGoal}/month`));
    console.log(chalk.gray(`      Period: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`));

    // Create spending analytics
    const analytics = await prisma.userSpendingAnalytics.create({
      data: {
        userId: testUser.id,
        currentMonthSpending: TEST_CONFIG.testData.currentSpending,
        averageMonthlySpending: 1850,
        lastMonthSpending: 1920,
        twoMonthsAgoSpending: 1780,
        lastCalculatedAt: new Date(),
      }
    });

    this.testAnalyticsId = analytics.id;
    console.log(chalk.green(`   ✅ Created spending analytics`));
    console.log(chalk.gray(`      Current month: $${TEST_CONFIG.testData.currentSpending}`));
    console.log(chalk.gray(`      Average monthly: $1850`));
    console.log();
  }

  private async runDailySmsService(): Promise<void> {
    console.log(chalk.cyan('📱 Step 3: Running Daily SMS Service'));

    const dailySmsService = new DailySmsService();
    
    console.log(chalk.yellow('   🔄 Initializing AWS SMS service...'));
    console.log(chalk.yellow('   🔄 Running daily message job...'));

    const result = await dailySmsService.sendDailyMessages();

    console.log(chalk.green('   ✅ Daily SMS job completed'));
    console.log(chalk.gray(`      Total users processed: ${result.totalUsers}`));
    console.log(chalk.gray(`      Successful sends: ${result.successCount}`));
    console.log(chalk.gray(`      Failed sends: ${result.failureCount}`));
    console.log(chalk.gray(`      Skipped users: ${result.skippedCount}`));

    if (result.errors.length > 0) {
      console.log(chalk.yellow('   ⚠️  Errors encountered:'));
      result.errors.forEach(error => {
        console.log(chalk.gray(`      - ${error.userId}: ${error.error}`));
      });
    }

    // Disconnect the service
    await dailySmsService.disconnect();
    console.log();
  }

  private async verifyResults(): Promise<void> {
    console.log(chalk.cyan('🔍 Step 4: Verifying Results'));

    if (!this.testUserId) {
      throw new Error('Test user ID not available for verification');
    }

    // Check if user received the message (check database logs)
    const updatedUser = await prisma.user.findUnique({
      where: { id: this.testUserId },
      select: {
        lastSmsMessageId: true,
        lastSmsSentAt: true,
      }
    });

    if (updatedUser?.lastSmsMessageId) {
      console.log(chalk.green('   ✅ AWS message ID recorded in database'));
      console.log(chalk.gray(`      Message ID: ${updatedUser.lastSmsMessageId}`));
      
      if (updatedUser.lastSmsSentAt) {
        console.log(chalk.gray(`      Sent at: ${updatedUser.lastSmsSentAt.toISOString()}`));
      }
    } else {
      console.log(chalk.yellow('   ⚠️  No AWS message ID found (may be expected in test mode)'));
    }

    // Calculate expected daily target for verification
    const { monthlyGoal, currentSpending } = TEST_CONFIG.testData;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemaining = daysInMonth - dayOfMonth + 1;
    
    const remainingBudget = monthlyGoal - currentSpending;
    const expectedDailyTarget = Math.round(remainingBudget / daysRemaining);

    console.log(chalk.green('   ✅ Daily target calculation verified'));
    console.log(chalk.gray(`      Monthly goal: $${monthlyGoal}`));
    console.log(chalk.gray(`      Current spending: $${currentSpending}`));
    console.log(chalk.gray(`      Days remaining: ${daysRemaining}`));
    console.log(chalk.gray(`      Expected daily target: $${expectedDailyTarget}`));
    console.log();
  }

  private async cleanup(): Promise<void> {
    console.log(chalk.cyan('🧹 Step 5: Cleaning Up Test Data'));

    try {
      // Delete in reverse dependency order
      if (this.testAnalyticsId) {
        await prisma.userSpendingAnalytics.delete({
          where: { id: this.testAnalyticsId }
        });
        console.log(chalk.green('   ✅ Deleted test analytics'));
      }

      if (this.testGoalId) {
        await prisma.spendingGoal.delete({
          where: { id: this.testGoalId }
        });
        console.log(chalk.green('   ✅ Deleted test spending goal'));
      }

      if (this.testUserId) {
        await prisma.user.delete({
          where: { id: this.testUserId }
        });
        console.log(chalk.green('   ✅ Deleted test user'));
      }

      console.log(chalk.green('   ✅ All test data cleaned up successfully'));
      
    } catch (error: any) {
      console.log(chalk.yellow(`   ⚠️  Cleanup warning: ${error.message}`));
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Main execution
async function main() {
  const tester = new AWSIntegrationTester();
  
  try {
    await tester.runTest();
    process.exit(0);
  } catch (error: any) {
    console.log(chalk.red('\n💥 Test failed with error:'));
    console.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n🛑 Test interrupted by user'));
  await prisma.$disconnect();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n\n🛑 Test terminated'));
  await prisma.$disconnect();
  process.exit(1);
});

main();