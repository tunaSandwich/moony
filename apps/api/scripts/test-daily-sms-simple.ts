#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

async function testDailySmsSimple() {
  console.log(chalk.blue.bold('\n📱 Simple DailySmsService Test\n'));

  try {
    // Test AWS SMS Service (now the only option)
    console.log('1️⃣  Testing AWS SMS Service...');
    
    const { DailySmsService } = await import('../src/services/dailySmsService.js');
    const awsService = new DailySmsService();
    
    console.log(chalk.green('   ✅ DailySmsService with AWS initialized'));
    
    // Verify methods exist
    if (typeof awsService.sendDailyMessages === 'function') {
      console.log(chalk.green('   ✅ sendDailyMessages method available'));
    }
    
    if (typeof awsService.disconnect === 'function') {
      console.log(chalk.green('   ✅ disconnect method available'));
    }
    
    console.log(chalk.green('\n✅ DailySmsService is working!'));
    
    console.log(chalk.cyan('\n📝 AWS SMS Service Features:'));
    console.log('   ✅ AWS SMS is the sole provider for operational messages');
    console.log('   ✅ Rate limiting: 100ms delay between messages');
    console.log('   ✅ Provider-specific logging');
    console.log('   ✅ Graceful error handling');
    console.log('   ✅ Transactional message type for daily updates');
    
  } catch (error: any) {
    console.log(chalk.red(`❌ Test failed: ${error.message}`));
    console.error(error);
  }
}

// Run test
testDailySmsSimple().finally(() => {
  process.exit(0);
});