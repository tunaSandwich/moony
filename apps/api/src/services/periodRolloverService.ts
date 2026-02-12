/**
 * PeriodRolloverService
 *
 * Handles automatic rollover of expired budget periods. When a user's spending goal
 * period ends (periodEnd < today), creates a new goal for the current month with
 * the same monthly limit. Used for adoption metrics via the `source` field.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../db.js';
import { startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { logger } from '@logger';

export interface RolloverResult {
  processedCount: number;
  createdCount: number;
  skippedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export class PeriodRolloverService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  /**
   * Find active goals whose period has ended (periodEnd < today).
   * Does not include users who already have a goal for the current month.
   */
  async getExpiredGoals(): Promise<
    Array<{
      id: string;
      userId: string;
      monthlyLimit: Decimal;
      monthStartDay: number;
      periodStart: Date;
      periodEnd: Date;
    }>
  > {
    const today = startOfDay(new Date());
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    const expiredGoals = await this.prisma.spendingGoal.findMany({
      where: {
        isActive: true,
        periodEnd: { lt: today }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        monthlyLimit: true,
        monthStartDay: true,
        periodStart: true,
        periodEnd: true
      }
    });

    // Filter out users who already have an active goal for the current month (e.g. set via SMS/web before rollover ran)
    const result: typeof expiredGoals = [];
    for (const goal of expiredGoals) {
      const existingCurrentMonthGoal = await this.prisma.spendingGoal.findFirst({
        where: {
          userId: goal.userId,
          isActive: true,
          periodStart: currentMonthStart,
          periodEnd: currentMonthEnd
        }
      });
      if (!existingCurrentMonthGoal) {
        result.push(goal);
      }
    }

    return result;
  }

  /**
   * Roll over expired periods: deactivate old goals and create new ones for
   * the current month with the same monthly limit. Creates for current month
   * only even if the goal expired months ago.
   */
  async rolloverExpiredPeriods(): Promise<RolloverResult> {
    const result: RolloverResult = {
      processedCount: 0,
      createdCount: 0,
      skippedCount: 0,
      errors: []
    };

    try {
      const expiredGoals = await this.getExpiredGoals();
      result.processedCount = expiredGoals.length;

      logger.info('[PeriodRolloverService] Starting rollover', {
        expiredCount: expiredGoals.length
      });

      for (const goal of expiredGoals) {
        try {
          const now = new Date();
          const periodStart = startOfMonth(now);
          const periodEnd = endOfMonth(now);
          const monthStartDay = 1;

          await this.prisma.$transaction(async (tx) => {
            await tx.spendingGoal.update({
              where: { id: goal.id },
              data: { isActive: false }
            });

            await tx.spendingGoal.create({
              data: {
                userId: goal.userId,
                monthlyLimit: goal.monthlyLimit,
                monthStartDay,
                periodStart,
                periodEnd,
                isActive: true,
                source: 'rollover'
              } as Prisma.SpendingGoalUncheckedCreateInput
            });
          });

          result.createdCount++;
          logger.info('[PeriodRolloverService] Rolled over period', {
            userId: goal.userId,
            previousGoalId: goal.id,
            monthlyLimit: goal.monthlyLimit.toString(),
            newPeriodStart: periodStart.toISOString(),
            newPeriodEnd: periodEnd.toISOString()
          });
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({ userId: goal.userId, error: errMsg });
          logger.error('[PeriodRolloverService] Rollover failed for user', {
            userId: goal.userId,
            error: errMsg
          });
        }
      }

      result.skippedCount = result.processedCount - result.createdCount - result.errors.length;

      logger.info('[PeriodRolloverService] Rollover completed', {
        ...result
      });

      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[PeriodRolloverService] Fatal rollover error', { error: errMsg });
      throw error;
    }
  }
}
