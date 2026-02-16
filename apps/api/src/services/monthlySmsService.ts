/**
 * MonthlySmsService
 *
 * Sends end-of-month summary SMS to users with active goals whose period ends today.
 * Uses simplified templates from the monthly spec. Prompts users to reply with a new
 * goal or keep the current one (handled by rollover).
 */
import { PrismaClient, User, SpendingGoal, UserSpendingAnalytics } from '@prisma/client';
import { prisma } from '../db.js';
import { addMonths, format, isLastDayOfMonth, startOfDay } from 'date-fns';
import { TemplateService } from './templateService.js';
import { MONTHLY_TEMPLATES } from '../templates/smsTemplates.js';
import { TwilioSMSService } from './twilio/smsService.js';
import { logger } from '@logger';
import { metricsLogger } from '../utils/metricsLogger.js';

type MonthlyPerformance = 'crushed_it' | 'close_call' | 'small_miss' | 'significant_miss';

export interface MonthlySmsResult {
  totalUsers: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export class MonthlySmsService {
  private prisma: PrismaClient;
  private smsService: TwilioSMSService;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
    this.smsService = new TwilioSMSService();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private categorizePerformance(
    totalSpent: number,
    budgetGoal: number
  ): MonthlyPerformance {
    if (budgetGoal <= 0) return 'significant_miss';
    const variance = totalSpent / budgetGoal;

    if (variance <= 0.85) return 'crushed_it';
    if (variance <= 1.0) return 'close_call';
    if (variance <= 1.1) return 'small_miss';
    return 'significant_miss';
  }

  private calculateSuggestedGoal(totalSpent: number, performance: MonthlyPerformance): number {
    switch (performance) {
      case 'crushed_it':
        return Math.round(totalSpent * 1.05 / 10) * 10;
      case 'close_call':
        return Math.round(totalSpent / 10) * 10;
      case 'small_miss':
        return Math.round(totalSpent * 0.95 / 10) * 10;
      case 'significant_miss':
        return Math.round(totalSpent * 0.9 / 10) * 10;
    }
  }

  /**
   * Send monthly summaries to users whose active goal period ends today.
   * Should only be called on the last day of the month.
   */
  async sendMonthlySummaries(): Promise<MonthlySmsResult> {
    const result: MonthlySmsResult = {
      totalUsers: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: []
    };

    const today = new Date();
    if (!isLastDayOfMonth(today)) {
      logger.info('[MonthlySmsService] Not last day of month, skipping monthly summaries');
      return result;
    }

    // Match goals whose period ends on the last day of current month (date-only comparison)
    const lastDayOfMonth = startOfDay(
      new Date(today.getFullYear(), today.getMonth() + 1, 0)
    );

    try {
      const users = await this.prisma.user.findMany({
        where: {
          phoneVerified: true,
          isActive: true
        },
        include: {
          spendingGoals: {
            where: {
              isActive: true,
              periodEnd: lastDayOfMonth
            },
            take: 1
          },
          spendingAnalytics: true
        }
      });

      const eligibleUsers = users.filter(
        (u) => u.spendingGoals.length > 0 && u.spendingAnalytics
      );

      result.totalUsers = eligibleUsers.length;

      logger.info('[MonthlySmsService] Starting monthly summaries', {
        totalUsers: result.totalUsers
      });

      for (const user of eligibleUsers) {
        const goal = user.spendingGoals[0];
        const analytics = user.spendingAnalytics!;
        if (!goal) continue;

        try {
          await this.processUser(user, goal, analytics);
          result.successCount++;
          metricsLogger.logDailySms('monthly');
          await this.delay(100);
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({ userId: user.id, error: errMsg });
          logger.error('[MonthlySmsService] Failed to process user', {
            userId: user.id,
            error: errMsg
          });
        }
      }

      result.skippedCount = result.totalUsers - result.successCount - result.errors.length;

      logger.info('[MonthlySmsService] Monthly summaries completed', {
        ...result
      });

      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[MonthlySmsService] Fatal error', { error: errMsg });
      throw error;
    }
  }

  private async processUser(
    user: User,
    goal: SpendingGoal,
    analytics: UserSpendingAnalytics
  ): Promise<void> {
    const totalSpent = Number(analytics.currentMonthSpending);
    const budgetGoal = Number(goal.monthlyLimit);
    const currentGoalFormatted = this.formatCurrency(budgetGoal);

    const performance = this.categorizePerformance(totalSpent, budgetGoal);

    const monthName = format(goal.periodEnd, 'MMMM');
    const nextMonthDate = addMonths(goal.periodEnd, 1);
    const nextMonthName = format(nextMonthDate, 'MMMM');

    const amountSaved = Math.max(0, budgetGoal - totalSpent);
    const amountOver = Math.max(0, totalSpent - budgetGoal);
    const percentOver =
      budgetGoal > 0 ? Math.round((amountOver / budgetGoal) * 100) : 0;

    const suggestedGoal = this.calculateSuggestedGoal(totalSpent, performance);
    const suggestedGoalFormatted = this.formatCurrency(suggestedGoal);

    const variables: Record<string, string | number> = {
      firstName: user.firstName,
      monthName,
      nextMonthName,
      totalSpent: this.formatCurrency(totalSpent),
      budgetGoal: this.formatCurrency(budgetGoal),
      currentGoal: currentGoalFormatted,
      amountSaved: this.formatCurrency(amountSaved),
      amountOver: this.formatCurrency(amountOver),
      percentOver,
      suggestedGoal: suggestedGoalFormatted
    };

    let templateKey: keyof typeof MONTHLY_TEMPLATES;
    switch (performance) {
      case 'crushed_it':
        templateKey = 'CRUSHED_IT';
        break;
      case 'close_call':
        templateKey = 'CLOSE_CALL';
        break;
      case 'small_miss':
        templateKey = 'SMALL_MISS';
        break;
      default:
        templateKey = 'SIGNIFICANT_MISS';
    }

    const template = MONTHLY_TEMPLATES[templateKey];
    const message = TemplateService.render(template.template, variables);

    const sendParams = {
      to: user.phoneNumber,
      body: message,
      userId: user.id,
      messageType: 'TRANSACTIONAL' as const
    };

    const sendResult = await this.smsService.sendMessage(sendParams);

    if (!sendResult.success) {
      throw new Error(sendResult.error ?? 'Message send failed');
    }

    logger.info('[MonthlySmsService] Monthly summary sent', {
      userId: user.id,
      performance,
      templateId: template.id
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
