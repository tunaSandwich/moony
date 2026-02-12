/**
 * SchedulerService
 *
 * Manages cron jobs:
 * 1. Daily SMS Job: Sends morning spending updates to all active users
 * 2. Webhook Fallback Job: Catches missed Plaid webhooks
 * 3. Monthly Summary Job: Sends end-of-month summaries (last day at 7 PM)
 * 4. Period Rollover Job: Rolls over expired budget periods (before daily SMS)
 */
import cron, { ScheduledTask } from 'node-cron';
import { DailySmsService } from '../../apps/api/src/services/dailySmsService.js';
import { WebhookFallbackService } from '../../apps/api/src/services/WebhookFallbackService.js';
import { MonthlySmsService } from '../../apps/api/src/services/monthlySmsService.js';
import { PeriodRolloverService } from '../../apps/api/src/services/periodRolloverService.js';
import { logger } from '../utils/logger.js';

type ParsedTime = { hours: number; minutes: number };

export class SchedulerService {
  private task: ScheduledTask | null = null;
  private fallbackTask: ScheduledTask | null = null;
  private monthlyTask: ScheduledTask | null = null;
  private rolloverTask: ScheduledTask | null = null;
  private dailySmsService: DailySmsService;
  private webhookFallbackService: WebhookFallbackService;
  private monthlySmsService: MonthlySmsService;
  private periodRolloverService: PeriodRolloverService;
  private lastRunAt: Date | null = null;

  constructor() {
    this.dailySmsService = new DailySmsService();
    this.webhookFallbackService = new WebhookFallbackService();
    this.monthlySmsService = new MonthlySmsService();
    this.periodRolloverService = new PeriodRolloverService();
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

  /**
   * Compute time 30 minutes before the given time (for rollover before daily SMS).
   */
  private subtractMinutes(time: ParsedTime, minutes: number): ParsedTime {
    let totalMinutes = time.hours * 60 + time.minutes - minutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    return {
      hours: Math.floor(totalMinutes / 60) % 24,
      minutes: totalMinutes % 60
    };
  }

  private parseTime(input: string | undefined, fallback: ParsedTime): ParsedTime {
    if (!input) return fallback;
    const trimmed = input.trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (!match) return fallback;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
    return { hours, minutes };
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

  private async runMonthlyJob(): Promise<void> {
    const startedAt = new Date();
    logger.info('[Scheduler] Monthly summary job started');

    try {
      const result = await this.monthlySmsService.sendMonthlySummaries();
      logger.info('[Scheduler] Monthly summary job completed', {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        failureCount: result.failureCount,
        skippedCount: result.skippedCount,
        errorCount: result.errors.length
      });
      if (result.errors.length > 0) {
        logger.warn('[Scheduler] Some users failed to receive monthly summary', {
          failedUserIds: result.errors.map((e) => e.userId),
          errors: result.errors
        });
      }
    } catch (error) {
      const details = (error as Error)?.message ?? error;
      logger.error('[Scheduler] Monthly summary job failed', { error: details });
      throw error;
    } finally {
      const endedAt = new Date();
      logger.info('[Scheduler] Monthly summary job finished', {
        durationMs: endedAt.getTime() - startedAt.getTime()
      });
    }
  }

  private async runRolloverJob(): Promise<void> {
    const startedAt = new Date();
    logger.info('[Scheduler] Period rollover job started');

    try {
      const result = await this.periodRolloverService.rolloverExpiredPeriods();
      logger.info('[Scheduler] Period rollover job completed', {
        processedCount: result.processedCount,
        createdCount: result.createdCount,
        skippedCount: result.skippedCount,
        errorCount: result.errors.length
      });
      if (result.errors.length > 0) {
        logger.warn('[Scheduler] Some users failed rollover', {
          errors: result.errors
        });
      }
    } catch (error) {
      const details = (error as Error)?.message ?? error;
      logger.error('[Scheduler] Period rollover job failed', { error: details });
      throw error;
    } finally {
      const endedAt = new Date();
      logger.info('[Scheduler] Period rollover job finished', {
        durationMs: endedAt.getTime() - startedAt.getTime()
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

    const monthlyTime = this.parseTime(process.env.MONTHLY_SMS_TIME || '19:00', { hours: 19, minutes: 0 });
    const rolloverTime = this.subtractMinutes(parsed, 30);
    const rolloverCronExpr = this.toCronExpression(rolloverTime);

    logger.info('[Scheduler] Scheduling jobs', {
      dailyCron: cronExpr,
      dailyTime: `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`,
      monthlyTime: `${String(monthlyTime.hours).padStart(2, '0')}:${String(monthlyTime.minutes).padStart(2, '0')}`,
      rolloverCron: rolloverCronExpr,
      rolloverTime: `${String(rolloverTime.hours).padStart(2, '0')}:${String(rolloverTime.minutes).padStart(2, '0')}`,
      timezone: tz
    });

    try {
      // Schedule daily job
      this.task = cron.schedule(cronExpr, () => {
        void this.runDailyJob();
      }, { timezone: tz });

      // Schedule monthly summary job (last day of month at 7 PM - runs on days 28-31, service checks isLastDayOfMonth)
      this.monthlyTask = cron.schedule(
        `${monthlyTime.minutes} ${monthlyTime.hours} 28-31 * *`,
        () => {
          void this.runMonthlyJob();
        },
        { timezone: tz }
      );

      // Schedule period rollover job (30 min before daily SMS)
      this.rolloverTask = cron.schedule(rolloverCronExpr, () => {
        void this.runRolloverJob();
      }, { timezone: tz });

      // Schedule webhook fallback job (every minute)
      this.fallbackTask = cron.schedule('* * * * *', () => {
        void this.runWebhookFallbackJob();
      }, { timezone: tz });
    } catch (err) {
      logger.error('[Scheduler] Failed to schedule cron tasks', err);
      throw err;
    }
  }

  stop(): void {
    const tasks: { task: ScheduledTask | null; name: string }[] = [
      { task: this.task, name: 'daily job' },
      { task: this.monthlyTask, name: 'monthly job' },
      { task: this.rolloverTask, name: 'rollover job' },
      { task: this.fallbackTask, name: 'webhook fallback job' }
    ];
    for (const { task, name } of tasks) {
      if (task) {
        try {
          task.stop();
          logger.info(`[Scheduler] ${name} stopped`);
        } catch (err) {
          logger.error(`[Scheduler] Error while stopping ${name}`, err);
        }
      }
    }
    this.task = null;
    this.monthlyTask = null;
    this.rolloverTask = null;
    this.fallbackTask = null;
  }

  getLastRunAt(): Date | null {
    return this.lastRunAt;
  }
}


