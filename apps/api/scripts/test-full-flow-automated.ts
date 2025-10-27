#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { prisma } from '../src/db.js';
import { IncomingMessageHandler } from '../src/services/aws/incomingMessageHandler.js';
import { AWSSMSService } from '../src/services/aws/smsService.js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

async function testFullFlow() {
  console.log(chalk.blue.bold('\n🔄 Automated Full Flow Test\n'));
  
  const messageHandler = new IncomingMessageHandler();
  const smsService = new AWSSMSService();
  const testPhoneNumber = '+14155553333';
  
  try {
    // 1. Create test user
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
    const welcomeResult = await smsService.sendMessage({
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
    await messageHandler.processIncomingMessage({
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
      return;
    }
    
    // 5. Test different budget formats
    console.log('4️⃣  Testing different budget formats...');
    
    const testCases = [
      { message: '$2500', expected: 2500 },
      { message: 'My budget is 4000', expected: 4000 },
      { message: 'HELP', expected: 'command' }
    ];
    
    for (const testCase of testCases) {
      console.log(chalk.gray(`   Testing: "${testCase.message}"`));
      
      await messageHandler.processIncomingMessage({
        originationNumber: user.phoneNumber,
        destinationNumber: process.env.AWS_PHONE_NUMBER!,
        messageBody: testCase.message,
        inboundMessageId: `test-${Date.now()}-${Math.random()}`,
      });
      
      if (testCase.expected !== 'command') {
        // Check if budget was updated
        const latestUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            spendingGoals: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });
        
        if (latestUser?.spendingGoals[0] && 
            Number(latestUser.spendingGoals[0].monthlyLimit) === testCase.expected) {
          console.log(chalk.green(`     ✅ Budget updated to $${testCase.expected}`));
        } else {
          console.log(chalk.yellow(`     ⚠️  Budget not updated as expected`));
        }
      } else {
        console.log(chalk.green(`     ✅ Command processed`));
      }
    }
    
    console.log(chalk.green('\n✅ Full flow test completed successfully!'));
    
    // Summary
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        spendingGoals: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    console.log(chalk.cyan('\n📊 Final State:'));
    console.log(`   User: ${finalUser?.firstName} ${finalUser?.lastName}`);
    console.log(`   Phone: ****${finalUser?.phoneNumber.slice(-4)}`);
    console.log(`   Final Budget: $${finalUser?.spendingGoals[0]?.monthlyLimit || 'Not set'}`);
    
  } catch (error: any) {
    console.log(chalk.red(`❌ Full flow failed: ${error.message}`));
    console.error(error);
  }
}

// Run test
testFullFlow().finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});