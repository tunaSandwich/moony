#!/usr/bin/env node
/**
 * Test script for MonthlySmsService.
 * Run: NODE_ENV=local npx tsx apps/api/scripts/test-monthly-summary.ts
 *
 * Prerequisites:
 * - Database migrated
 * - Today is the LAST day of the month (otherwise the service returns early with 0 users)
 * - Users with active goals whose periodEnd is today
 *
 * To test on non-last days: temporarily comment out the isLastDayOfMonth check
 * in monthlySmsService.ts, or run on the 28th/29th/30th/31st of a month.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { isLastDayOfMonth } from 'date-fns';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  console.log(chalk.blue.bold('\n📊 Monthly Summary Service Test\n'));

  const today = new Date();
  if (!isLastDayOfMonth(today)) {
    console.log(chalk.yellow(`   Today (${today.toISOString().split('T')[0]}) is not the last day of the month.`));
    console.log(chalk.yellow('   MonthlySmsService only sends on the last day of each month.'));
    console.log(chalk.gray('   Run this script on the last day to test, or modify the service to bypass the check.\n'));
    return;
  }

  try {
    const { MonthlySmsService } = await import('../src/services/monthlySmsService.js');
    const service = new MonthlySmsService();

    console.log('1️⃣  Sending monthly summaries...\n');
    const result = await service.sendMonthlySummaries();

    console.log(chalk.green('   Result:'));
    console.log(`   - Total users: ${result.totalUsers}`);
    console.log(`   - Success:     ${result.successCount}`);
    console.log(`   - Failed:     ${result.failureCount}`);
    console.log(`   - Skipped:    ${result.skippedCount}`);
    if (result.errors.length > 0) {
      console.log(chalk.red(`   - Errors:    ${result.errors.length}`));
      result.errors.forEach((e) => console.log(chalk.red(`     • ${e.userId}: ${e.error}`)));
    }
    console.log(chalk.green('\n✅ Monthly summary test complete.\n'));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n❌ Test failed: ${msg}\n`));
    console.error(error);
    process.exit(1);
  }
}

main();
