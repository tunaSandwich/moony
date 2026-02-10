import { Response } from 'express';
import { prisma } from '../../src/db.js';
import { logger } from '@logger';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

export class AuthController {
  /**
   * GET /api/auth/session
   * Returns current user profile + onboarding state.
   * Used by the frontend to determine where to route after login.
   */
  public getSession = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    try {
      logger.info('Getting session for user', { userId });

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
              lastCalculatedAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check for an active spending goal
      const activeGoal = await prisma.spendingGoal.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        hasConnectedBank: !!user.plaidAccessToken,
        twilioStatus: user.phoneVerified ? 'verified' as const : 'unverified' as const,
        analytics: user.spendingAnalytics
          ? {
              averageMonthlySpending: user.spendingAnalytics.averageMonthlySpending?.toString(),
              lastMonthSpending: user.spendingAnalytics.lastMonthSpending?.toString(),
              currentMonthSpending: user.spendingAnalytics.currentMonthSpending?.toString(),
              lastCalculatedAt: user.spendingAnalytics.lastCalculatedAt,
            }
          : null,
      };

      const onboarding = {
        hasConnectedBank: !!user.plaidAccessToken,
        phoneVerified: user.phoneVerified,
        hasSpendingGoal: !!activeGoal,
      };

      const response: ApiResponse<{ user: typeof userData; onboarding: typeof onboarding }> = {
        success: true,
        data: { user: userData, onboarding },
        message: 'Session retrieved successfully',
      };

      logger.info('Session retrieved successfully', { userId });
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Failed to get session', {
        userId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to retrieve session', 500);
    }
  });

  /**
   * POST /api/auth/logout
   * Clears the session_token cookie.
   */
  public logout = asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.clearCookie('session_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Logged out successfully',
    };

    res.status(200).json(response);
  });
}
