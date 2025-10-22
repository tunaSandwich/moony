#!/usr/bin/env node
// Load environment FIRST using the project's loadEnv module
import '../src/config/loadEnv.js';

const env = process.env.NODE_ENV || 'local';
console.log(`🧪 Testing AWS SMS Service (${env} environment)`);

// NOW import modules that depend on environment variables
import { AWSSMSService } from '../src/services/aws/smsService.js';
import { prisma } from '../src/db.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    
    const smsService = new AWSSMSService();
    
    let testPhoneNumber: string;
    let testUserId: string | undefined;
    let testFirstName: string;
    
    if (env === 'local') {
      // Local: Use simulator number from env
      testPhoneNumber = process.env.AWS_SIMULATOR_NUMBER || '+12065559457';
      
      // Find or create a test user with simulator number
      const testUser = await prisma.user.findFirst({
        where: { phoneNumber: testPhoneNumber },
      });
      
      if (testUser) {
        testUserId = testUser.id;
        testFirstName = testUser.firstName;
        console.log(`Using existing test user: ${testFirstName}`);
      } else {
        console.log('No user found with simulator number');
        testFirstName = 'Test User';
      }
      
      console.log(`Phone: ${testPhoneNumber} (AWS Simulator)\n`);
      
    } else if (env === 'staging') {
      // Staging: Use your real phone number
      const yourPhoneNumber = '+16268075538';
      
      // Find or update Lucas to have your real number
      const lucas = await prisma.user.findFirst({
        where: { inviteCode: 'LUCAS' },
      });
      
      if (lucas && lucas.phoneNumber !== yourPhoneNumber) {
        // Update Lucas to have your real phone for staging tests
        await prisma.user.update({
          where: { id: lucas.id },
          data: { phoneNumber: yourPhoneNumber },
        });
        console.log(`Updated Lucas's phone to ${yourPhoneNumber} for staging test`);
      }
      
      testPhoneNumber = yourPhoneNumber;
      testUserId = lucas?.id;
      testFirstName = lucas?.firstName || 'Test User';
      
      console.log(`Using real phone for staging: ${testPhoneNumber.substring(0, 7)}****`);
      console.log(`Note: This will fail until 10DLC registration completes\n`);
      
    } else {
      // Production: Would use real verified numbers
      console.log('Production testing not configured yet');
      process.exit(0);
    }
    
    // Temporarily skip interactive prompt for testing
    console.log('Send test SMS? (y/n): y (auto-confirmed for testing)');
    const answer = 'y';

    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled');
      process.exit(0);
    }

    console.log('\n📤 Sending test message...');
    
    const messageBody = env === 'local' 
      ? `Test from moony AWS sandbox (simulator). This is a simulated message.`
      : `Test from moony AWS (${env}). Reply with a number to test two-way messaging.`;
    
    const result = await smsService.sendMessage({
      to: testPhoneNumber,
      body: messageBody,
      messageType: 'TRANSACTIONAL',
      userId: testUserId,
    });

    // Display results
    if (result.success) {
      console.log('✅ Message sent successfully!');
      console.log('Message ID:', result.messageId);
      
      if (env === 'local' && result.messageId?.startsWith('SIM_')) {
        console.log('\n📝 Note: This was a simulated send (no actual SMS delivered)');
        console.log('The message would have said:');
        console.log(`"${messageBody}"`);
      }
      
      if (testUserId) {
        console.log('\n🔍 Check database for tracking:');
        console.log(`SELECT last_sms_message_id, last_sms_sent_at FROM users WHERE id = '${testUserId}'`);
      }
      
    } else {
      console.log('❌ Failed to send message');
      console.log('Error:', result.error);
      console.log('Retryable:', result.retryable);
      
      if (env === 'staging' && result.error?.includes('not verified')) {
        console.log('\n⏳ Expected failure - waiting for 10DLC registration to complete');
        console.log('Current status: US_TEN_DLC_BRAND_REGISTRATION under review');
      }
    }
    
  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();