import { PrismaClient, User, SpendingGoal, UserSpendingAnalytics } from '@prisma/client';
import { prisma } from '../../src/db.js';
import { format as formatDate } from 'date-fns';
import { CalculationService } from '../../../../packages/services/calculationService.js';
import { AWSSMSService } from './aws/smsService.js';
import { logger } from '@logger';
import { metricsLogger } from '../utils/metricsLogger.js';

interface DailySmsResult {
  totalUsers: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: Array<{ userId: string; error: string }>;
}


export class DailySmsService {
  private prisma: PrismaClient;
  private calculationService: CalculationService;
  private smsService: AWSSMSService;

  constructor() {
    this.prisma = prisma;
    this.calculationService = new CalculationService();
    this.smsService = new AWSSMSService();
    logger.info('[DailySmsService] Using AWS SMS provider');
  }

  async sendDailyMessages(): Promise<DailySmsResult> {
    const result: DailySmsResult = {
      totalUsers: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: []
    };

    try {
      // Fetch all eligible users with their active goals and analytics
      const users = await this.prisma.user.findMany({
        where: {
          phoneVerified: true,
          isActive: true
        },
        include: {
          spendingGoals: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          spendingAnalytics: true
        }
      });

      result.totalUsers = users.length;

      logger.info('[DailySmsService] Starting daily message job', {
        totalUsers: result.totalUsers,
        smsProvider: 'AWS'
      });

      // Process each user
      for (const user of users) {
        try {
          const activeGoal = user.spendingGoals[0] || null;
          const analytics = user.spendingAnalytics;

          // Skip if no active goal
          if (!activeGoal) {
            logger.debug('[DailySmsService] Skipping user - no active goal', {
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`
            });
            result.skippedCount++;
            continue;
          }

          // Skip if no analytics data yet
          if (!analytics?.currentMonthSpending) {
            logger.debug('[DailySmsService] Skipping user - no analytics data', {
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`
            });
            result.skippedCount++;
            continue;
          }

          // Process this user
          await this.processUser(user, activeGoal, analytics);
          result.successCount++;
          
          // Log metrics for daily SMS
          metricsLogger.logDailySms('daily');

          // Rate limiting for AWS SMS (to stay within AWS limits)
          await this.delay(100); // 100ms delay between messages

        } catch (error: any) {
          result.failureCount++;
          result.errors.push({
            userId: user.id,
            error: error.message
          });
          
          logger.error('[DailySmsService] Failed to process user', {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            error: error.message
          });
          // Continue to next user instead of crashing entire job
        }
      }

      logger.info('[DailySmsService] Daily message job completed', {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        failureCount: result.failureCount,
        skippedCount: result.skippedCount,
        errorCount: result.errors.length
      });

      return result;

    } catch (error: any) {
      logger.error('[DailySmsService] Fatal error in daily message job', {
        error: error.message
      });
      throw error;
    }
  }

  private async processUser(
    user: User,
    goal: SpendingGoal,
    analytics: UserSpendingAnalytics
  ): Promise<void> {
    logger.debug('[DailySmsService] Processing user', {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      goalAmount: goal.monthlyLimit,
      currentSpending: analytics.currentMonthSpending
    });

    // Calculate today's target
    const goalAmount = Number(goal.monthlyLimit);
    const currentSpending = Number(analytics.currentMonthSpending);
    
    const todaysTarget = this.calculationService.calculatePeriodAwareDailyTarget(
      goalAmount,
      currentSpending,
      goal.periodStart,
      goal.periodEnd
    );

    // Format the message
    const message = this.formatDailyMessage({
      firstName: user.firstName,
      todaysTarget,
      monthToDateSpending: currentSpending,
      monthlyGoal: goalAmount
    });

    // Send the message
    const sendParams = {
      to: user.phoneNumber,
      body: message,
      userId: user.id,
      messageType: 'TRANSACTIONAL' as const
    };
    
    const result = await this.smsService.sendMessage(sendParams);

    if (result.success) {
      const logData: any = {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        provider: 'AWS',
        todaysTarget,
        messageId: (result as any).messageId
      };

      logger.info('[DailySmsService] Message sent successfully', logData);
    } else {
      throw new Error(`Message send failed: ${result.error}`);
    }
  }

  private formatDailyMessage(data: {
    firstName: string;
    todaysTarget: number;
    monthToDateSpending: number;
    monthlyGoal: number;
  }): string {
    const { firstName, todaysTarget, monthToDateSpending, monthlyGoal } = data;
    
    // Get current month name
    const monthName = formatDate(new Date(), 'MMMM');
    
    // Format currency without cents
    const formattedTarget = this.formatCurrency(todaysTarget);
    const formattedSpending = this.formatCurrency(monthToDateSpending);
    const formattedGoal = this.formatCurrency(monthlyGoal);

    return `moony

☀️ Good Morning ${firstName}!

🎯 Today's spending target: ${formattedTarget}
Progress ${monthName}: ${formattedSpending} spent of ${formattedGoal}

Recent purchases may take a day to show

Reply STOP to opt out`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
