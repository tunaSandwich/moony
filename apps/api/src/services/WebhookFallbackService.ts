import { prisma } from '../db.js';
import { PlaidWebhookService } from './PlaidWebhookService.js';
import { logger } from '@logger';

/**
 * Fallback service to handle missed Plaid webhooks
 * Runs as a scheduled job to ensure users get analytics processing
 * even if webhook delivery fails
 */
export class WebhookFallbackService {
  private prisma = prisma;
  private plaidWebhookService: PlaidWebhookService;

  constructor() {
    this.plaidWebhookService = new PlaidWebhookService();
  }

  /**
   * Main entry point - checks for users needing analytics and processes them
   * Should be called every minute by a scheduled job
   */
  public async processAnalyticsFallbacks(): Promise<void> {
    try {
      logger.info('Starting webhook fallback check');

      // Find users who need analytics processing
      const userIds = await this.plaidWebhookService.findUsersNeedingAnalytics();

      if (userIds.length === 0) {
        logger.debug('No users need analytics fallback processing');
        return;
      }

      logger.info('Processing analytics fallbacks', { 
        userCount: userIds.length,
        userIds 
      });

      // Process each user's analytics
      let successCount = 0;
      let errorCount = 0;

      for (const userId of userIds) {
        try {
          await this.plaidWebhookService.processFallbackAnalytics(userId);
          successCount++;
          
          logger.info('Fallback analytics completed', { userId });

        } catch (error: any) {
          errorCount++;
          
          logger.error('Fallback analytics failed', {
            userId,
            error: error.message
          });

          // Continue processing other users even if one fails
        }
      }

      logger.info('Webhook fallback processing completed', {
        totalUsers: userIds.length,
        successful: successCount,
        failed: errorCount
      });

    } catch (error: any) {
      logger.error('Failed to process webhook fallbacks', {
        error: error.message
      });
    }
  }

  /**
   * Health check for the fallback service
   */
  public async healthCheck(): Promise<{ 
    status: string; 
    usersNeedingAnalytics: number; 
    oldestPendingConnection?: Date 
  }> {
    try {
      const userIds = await this.plaidWebhookService.findUsersNeedingAnalytics();
      
      // Find the oldest pending connection
      let oldestConnection: Date | undefined;
      if (userIds.length > 0) {
        const oldestUser = await this.prisma.user.findFirst({
          where: {
            id: { in: userIds }
          },
          select: {
            plaidConnectedAt: true
          },
          orderBy: {
            plaidConnectedAt: 'asc'
          }
        });

        oldestConnection = oldestUser?.plaidConnectedAt || undefined;
      }

      return {
        status: 'healthy',
        usersNeedingAnalytics: userIds.length,
        oldestPendingConnection: oldestConnection
      };

    } catch (error: any) {
      logger.error('Fallback service health check failed', {
        error: error.message
      });

      return {
        status: 'unhealthy',
        usersNeedingAnalytics: 0
      };
    }
  }

  /**
   * Cleanup method for closing connections
   */
  public async disconnect(): Promise<void> {
    await this.plaidWebhookService.disconnect();
  }
}
