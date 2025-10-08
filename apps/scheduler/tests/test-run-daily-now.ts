// apps/scheduler/tests/test-run-daily-now.ts
import dotenv from 'dotenv';
import { SchedulerService } from '@services/schedulerService';
import { logger } from '@logger';

// Load environment-specific configuration (same pattern as scheduler/index.ts)
const nodeEnv = process.env.NODE_ENV;
logger.info('[TestRun] Loading environment', { nodeEnv });
dotenv.config({ path: `.env.${nodeEnv}` });

async function main() {
  const scheduler = new SchedulerService();
  await scheduler.runDailyJob();
  logger.info('[TestRun] Done');
}

main().catch((err) => {
  logger.error('[TestRun] Failed', err);
  process.exit(1);
});
