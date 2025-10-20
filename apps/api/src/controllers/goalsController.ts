import { Response } from 'express';
import { prisma } from '../../src/db.js';
import { logger } from '@logger';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

// Use shared Prisma client

export class GoalsController {
  public setSpendingGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { monthlyLimit } = req.body;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Validate monthlyLimit
    if (!monthlyLimit || typeof monthlyLimit !== 'number' || monthlyLimit < 100 || monthlyLimit > 20000) {
      throw new AppError('Monthly limit must be a number between 100 and 20000', 400);
    }

    try {
      logger.info('Setting spending goal for user', { userId, monthlyLimit });

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Calculate period dates (current month)
      const now = new Date();
      const monthStartDay = 1; // Default to 1st of month
      const periodStart = new Date(now.getFullYear(), now.getMonth(), monthStartDay);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, monthStartDay - 1);

      // Use database transaction to ensure data consistency
      const spendingGoal = await prisma.$transaction(async (tx) => {
        // Deactivate any existing active goals for this user
        await tx.spendingGoal.updateMany({
          where: { 
            userId,
            isActive: true 
          },
          data: { isActive: false }
        });

        // Create new spending goal
        const newGoal = await tx.spendingGoal.create({
          data: {
            userId,
            monthlyLimit,
            monthStartDay,
            periodStart,
            periodEnd,
            isActive: true
          }
        });

        logger.info('Spending goal created successfully', { 
          userId,
          goalId: newGoal.id,
          monthlyLimit 
        });

        return newGoal;
      });

      const response: ApiResponse<{
        goalId: string;
        monthlyLimit: number;
        periodStart: Date;
        periodEnd: Date;
      }> = {
        success: true,
        data: {
          goalId: spendingGoal.id,
          monthlyLimit: spendingGoal.monthlyLimit.toNumber(),
          periodStart: spendingGoal.periodStart,
          periodEnd: spendingGoal.periodEnd
        },
        message: 'Spending goal set successfully'
      };

      logger.info('Spending goal response sent', { userId, goalId: spendingGoal.id });
      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Failed to set spending goal', { 
        userId, 
        monthlyLimit,
        error: error.message 
      });

      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to set spending goal', 500);
    }
  });

  public getCurrentGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    try {
      logger.info('Getting current spending goal for user', { userId });

      const currentGoal = await prisma.spendingGoal.findFirst({
        where: { 
          userId,
          isActive: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!currentGoal) {
        const response: ApiResponse<null> = {
          success: true,
          data: null,
          message: 'No active spending goal found'
        };
        res.status(200).json(response);
        return;
      }

      const response: ApiResponse<{
        goalId: string;
        monthlyLimit: number;
        periodStart: Date;
        periodEnd: Date;
        monthStartDay: number;
      }> = {
        success: true,
        data: {
          goalId: currentGoal.id,
          monthlyLimit: currentGoal.monthlyLimit.toNumber(),
          periodStart: currentGoal.periodStart,
          periodEnd: currentGoal.periodEnd,
          monthStartDay: currentGoal.monthStartDay
        },
        message: 'Current spending goal retrieved successfully'
      };

      logger.info('Current spending goal retrieved', { userId, goalId: currentGoal.id });
      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Failed to get current spending goal', { 
        userId, 
        error: error.message 
      });

      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve spending goal', 500);
    }
  });
}
