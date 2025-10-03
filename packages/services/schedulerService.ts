/**
 * SchedulerService
 * 
 * Manages two cron jobs:
 * 1. Daily SMS Job: Sends morning spending updates to all active users
 *    - Runs once per day at configured time (default 8:00 AM)
 *    - Uses DailySmsService to process all verified users
 * 
 * 2. Webhook Fallback Job: Catches missed Plaid webhooks
 *    - Runs every minute
 *    - Processes users whose analytics weren't calculated after bank connection
 */
import cron, { ScheduledTask } from 'node-cron';
import { DailySmsService } from '../../apps/api/src/services/dailySmsService.js';
import { WebhookFallbackService } from '../../apps/api/src/services/WebhookFallbackService.js';
import { logger } from '../utils/logger.js';

type ParsedTime = { hours: number; minutes: number };

export class SchedulerService {
  private task: ScheduledTask | null = null;
  private fallbackTask: ScheduledTask | null = null;
  private dailySmsService: DailySmsService;
  private webhookFallbackService: WebhookFallbackService;
  private lastRunAt: Date | null = null;

  constructor() {
    this.dailySmsService = new DailySmsService();
    this.webhookFallbackService = new WebhookFallbackService();
  }

  private parseDailyTime(input: string | undefined): ParsedTime {
    const fallback: ParsedTime = { hours: 8, minutes: 0 };
    if (!input) return fallback;
    const trimmed = input.trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (!match) {
      logger.warn(`Invalid DAILY_SMS_TIME '${input}', expected HH:mm. Falling back to 08:00.`);
      return fallback;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      logger.warn(`Out-of-range DAILY_SMS_TIME '${input}'. Falling back to 08:00.`);
      return fallback;
    }
    return { hours, minutes };
  }

  private toCronExpression(time: ParsedTime): string {
    return `${time.minutes} ${time.hours} * * *`;
  }

  async runDailyJob(): Promise<void> {
    const startedAt = new Date();
    logger.info('[Scheduler] Daily SMS job started');
    
    try {
      const result = await this.dailySmsService.sendDailyMessages();
      
      this.lastRunAt = new Date();
      
      logger.info('[Scheduler] Daily SMS job completed successfully', {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        failureCount: result.failureCount,
        skippedCount: result.skippedCount,
        errorCount: result.errors.length
      });
      
      // Log any errors that occurred
      if (result.errors.length > 0) {
        logger.warn('[Scheduler] Some users failed to receive daily SMS', {
          failedUserIds: result.errors.map(e => e.userId),
          errors: result.errors
        });
      }
      
    } catch (error) {
      const details = (error as any)?.response?.data ?? error;
      logger.error('[Scheduler] Daily SMS job failed', details);
      throw error; // Re-throw so monitoring can catch critical failures
    } finally {
      const endedAt = new Date();
      logger.info('[Scheduler] Daily SMS job finished', {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs: endedAt.getTime() - startedAt.getTime(),
      });
    }
  }

  private async runWebhookFallbackJob(): Promise<void> {
    const startedAt = new Date();
    logger.info('[Scheduler] Webhook fallback job started');

    try {
      await this.webhookFallbackService.processAnalyticsFallbacks();
      logger.info('[Scheduler] Webhook fallback job completed successfully');
    } catch (error) {
      const details = (error as any)?.response?.data ?? error;
      logger.error('[Scheduler] Webhook fallback job failed', details);
    } finally {
      const endedAt = new Date();
      logger.debug('[Scheduler] Webhook fallback job finished', {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs: endedAt.getTime() - startedAt.getTime(),
      });
    }
  }

  start(): void {
    const enabledRaw = (process.env.SCHEDULER_ENABLED ?? 'true').toLowerCase();
    const enabled = enabledRaw !== 'false' && enabledRaw !== '0' && enabledRaw !== 'no';
    if (!enabled) {
      logger.warn('[Scheduler] Disabled via SCHEDULER_ENABLED env var');
      return;
    }

    if (this.task) {
      logger.warn('[Scheduler] Already started');
      return;
    }

    const parsed = this.parseDailyTime(process.env.DAILY_SMS_TIME || '08:00');
    const cronExpr = this.toCronExpression(parsed);
    const tz = process.env.TZ || process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    logger.info('[Scheduler] Scheduling daily job', {
      cronExpr,
      time: `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`,
      timezone: tz,
    });

    try {
      // Schedule daily job
      this.task = cron.schedule(cronExpr, () => {
        // Fire and forget; errors are handled inside runDailyJob
        void this.runDailyJob();
      }, { timezone: tz });

      // Schedule webhook fallback job (every minute)
      logger.info('[Scheduler] Scheduling webhook fallback job', {
        cronExpr: '* * * * *', // Every minute
        timezone: tz,
      });

      this.fallbackTask = cron.schedule('* * * * *', () => {
        // Fire and forget; errors are handled inside runWebhookFallbackJob
        void this.runWebhookFallbackJob();
      }, { timezone: tz });

    } catch (err) {
      logger.error('[Scheduler] Failed to schedule cron tasks', err);
      throw err;
    }
  }

  stop(): void {
    if (this.task) {
      try {
        this.task.stop();
        logger.info('[Scheduler] Daily job stopped');
      } catch (err) {
        logger.error('[Scheduler] Error while stopping daily job', err);
      } finally {
        this.task = null;
      }
    }

    if (this.fallbackTask) {
      try {
        this.fallbackTask.stop();
        logger.info('[Scheduler] Webhook fallback job stopped');
      } catch (err) {
        logger.error('[Scheduler] Error while stopping fallback job', err);
      } finally {
        this.fallbackTask = null;
      }
    }
  }

  getLastRunAt(): Date | null {
    return this.lastRunAt;
  }
}


