#!/usr/bin/env node
import { config } from 'dotenv';
import readline from 'readline';
import { AWSSMSService } from '../src/services/aws/smsService.js';
import { prisma } from '../src/db.js';

// Load environment based on NODE_ENV
const env = process.env.NODE_ENV || 'local';
config({ path: `.env.${env}` });

console.log(`🧪 Testing AWS SMS Service (${env} environment)\n`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    const smsService = new AWSSMSService();
    
    // Get a test user from database
    const testUser = await prisma.user.findFirst({
      where: { phoneVerified: true },
    });

    if (!testUser) {
      console.log('❌ No verified users found in database');
      process.exit(1);
    }

    console.log(`Found user: ${testUser.firstName}`);
    console.log(`Phone: ${testUser.phoneNumber.substring(0, 7)}****\n`);
    
    const answer = await new Promise<string>(resolve => {
      rl.question('Send test SMS? (y/n): ', resolve);
    });

    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled');
      process.exit(0);
    }

    console.log('\n📤 Sending test message...');
    
    const result = await smsService.sendMessage({
      to: testUser.phoneNumber,
      body: `Test from moony AWS (${env}). Reply with a number to test two-way messaging.`,
      messageType: 'TRANSACTIONAL',
      userId: testUser.id,
    });

    // Display results based on what happened
    if (result.success) {
      if (result.sandboxSkipped) {
        console.log('⚠️  Message skipped (sandbox mode, number not verified)');
        console.log('\nTo test fully:');
        console.log('1. Go to AWS Console > Amazon Pinpoint > SMS and voice > Sandbox');
        console.log('2. Add this number:', testUser.phoneNumber);
        console.log('3. Complete verification on your phone');
        console.log('4. Run this test again');
      } else {
        console.log('✅ Message sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('\nCheck database:');
        console.log('SELECT last_sms_message_id, last_sms_sent_at FROM users WHERE id =', testUser.id);
      }
    } else {
      console.log('❌ Failed to send message');
      console.log('Error:', result.error);
      console.log('Retryable:', result.retryable);
    }
  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();


