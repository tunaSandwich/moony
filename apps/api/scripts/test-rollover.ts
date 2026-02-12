#!/usr/bin/env node
/**
 * Test script for PeriodRolloverService.
 * Run: NODE_ENV=local npx tsx apps/api/scripts/test-rollover.ts
 *
 * Prerequisites:
 * - Database migrated (source column exists)
 * - At least one user with an active goal whose periodEnd is in the past
 *
 * To create test data: set a goal's periodEnd to yesterday via DB or seed.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  console.log(chalk.blue.bold('\n🔄 Period Rollover Service Test\n'));

  try {
    const { PeriodRolloverService } = await import('../src/services/periodRolloverService.js');
    const service = new PeriodRolloverService();

    console.log('1️⃣  Checking for expired goals...\n');
    const expiredGoals = await service.getExpiredGoals();

    if (expiredGoals.length === 0) {
      console.log(chalk.yellow('   No expired goals found (periodEnd < today).'));
      console.log(chalk.gray('   To test: create a goal with periodEnd in the past, or wait for a period to end.\n'));
      return;
    }

    console.log(chalk.cyan(`   Found ${expiredGoals.length} expired goal(s):`));
    expiredGoals.forEach((g, i) => {
      console.log(`   ${i + 1}. userId=${g.userId} monthlyLimit=${g.monthlyLimit} periodEnd=${g.periodEnd.toISOString().split('T')[0]}`);
    });
    console.log();

    console.log('2️⃣  Running rollover...\n');
    const result = await service.rolloverExpiredPeriods();

    console.log(chalk.green('   Result:'));
    console.log(`   - Processed: ${result.processedCount}`);
    console.log(`   - Created:   ${result.createdCount}`);
    console.log(`   - Skipped:   ${result.skippedCount}`);
    if (result.errors.length > 0) {
      console.log(chalk.red(`   - Errors:    ${result.errors.length}`));
      result.errors.forEach((e) => console.log(chalk.red(`     • ${e.userId}: ${e.error}`)));
    }
    console.log(chalk.green('\n✅ Rollover test complete.\n'));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n❌ Test failed: ${msg}\n`));
    console.error(error);
    process.exit(1);
  }
}

main();
