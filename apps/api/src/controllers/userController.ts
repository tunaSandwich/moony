import { Response } from 'express';
import { prisma } from '../../src/db.js';
import { logger } from '@logger';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

// Use shared Prisma client

export class UserController {
  public getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    try {
      logger.info('Getting current user profile', { userId });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          phoneVerified: true,
          plaidAccessToken: true,
          currency: true,
          createdAt: true,
          spendingAnalytics: {
            select: {
              averageMonthlySpending: true,
              lastMonthSpending: true,
              currentMonthSpending: true,
              lastCalculatedAt: true
            }
          }
        }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Transform data for frontend
      const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        hasConnectedBank: !!user.plaidAccessToken,
        twilioStatus: user.phoneVerified ? 'verified' as const : 'unverified' as const,
        analytics: user.spendingAnalytics ? {
          averageMonthlySpending: user.spendingAnalytics.averageMonthlySpending?.toString(),
          lastMonthSpending: user.spendingAnalytics.lastMonthSpending?.toString(),
          currentMonthSpending: user.spendingAnalytics.currentMonthSpending?.toString(),
          lastCalculatedAt: user.spendingAnalytics.lastCalculatedAt
        } : null
      };

      const response: ApiResponse<typeof userData> = {
        success: true,
        data: userData,
        message: 'User profile retrieved successfully'
      };

      logger.info('User profile retrieved successfully', { userId });
      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Failed to get user profile', { 
        userId, 
        error: error.message 
      });

      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve user profile', 500);
    }
  });
}
