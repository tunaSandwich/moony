import { PrismaClient } from '@prisma/client';
import { PlaidAnalyticsService } from './plaidAnalyticsService.js';
import { logger } from '@logger';

interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_code: string;
    error_message: string;
  } | null;
  new_transactions?: number;
  removed_transactions?: string[];
}

interface WebhookProcessingResult {
  success: boolean;
  message: string;
  shouldRetry?: boolean;
}

export class PlaidWebhookService {
  private prisma: PrismaClient;
  private analyticsService: PlaidAnalyticsService;

  constructor() {
    this.prisma = new PrismaClient();
    this.analyticsService = new PlaidAnalyticsService();
  }

  /**
   * Main entry point for handling Plaid webhooks
   */
  public async handleWebhook(
    payload: PlaidWebhookPayload,
    signature: string,
    rawBody: string
  ): Promise<WebhookProcessingResult> {
    try {
      logger.info('Plaid webhook received', {
        webhook_type: payload.webhook_type,
        webhook_code: payload.webhook_code,
        item_id: payload.item_id,
        hasError: !!payload.error
      });

      // Verify webhook signature for security
      if (!this.verifySignature(rawBody, signature)) {
        logger.error('Plaid webhook signature verification failed', {
          item_id: payload.item_id
        });
        return {
          success: false,
          message: 'Invalid webhook signature'
        };
      }

      // Handle webhook errors
      if (payload.error) {
        logger.error('Plaid webhook contains error', {
          item_id: payload.item_id,
          error_code: payload.error.error_code,
          error_message: payload.error.error_message
        });
        return {
          success: true, // Return success to prevent retries for permanent errors
          message: `Webhook error: ${payload.error.error_code}`
        };
      }

      // Route to appropriate handler based on webhook type and code
      if (payload.webhook_type === 'TRANSACTIONS') {
        return await this.handleTransactionWebhook(payload);
      }

      logger.info('Unsupported webhook type received', {
        webhook_type: payload.webhook_type,
        webhook_code: payload.webhook_code,
        item_id: payload.item_id
      });

      return {
        success: true,
        message: 'Webhook received but not processed (unsupported type)'
      };

    } catch (error: any) {
      logger.error('Failed to process Plaid webhook', {
        error: error.message,
        item_id: payload.item_id,
        webhook_type: payload.webhook_type,
        webhook_code: payload.webhook_code
      });

      return {
        success: false,
        message: `Webhook processing failed: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * Handle TRANSACTIONS webhooks (HISTORICAL_UPDATE, DEFAULT_UPDATE, etc.)
   */
  private async handleTransactionWebhook(payload: PlaidWebhookPayload): Promise<WebhookProcessingResult> {
    const { webhook_code, item_id } = payload;

    try {
      // Find user by Plaid item ID
      const user = await this.findUserByItemId(item_id);
      if (!user) {
        logger.error('User not found for Plaid item', { item_id });
        return {
          success: true, // Don't retry for unknown items
          message: 'User not found for item_id'
        };
      }

      logger.info('Processing transaction webhook', {
        webhook_code,
        item_id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      });

      switch (webhook_code) {
        case 'HISTORICAL_UPDATE':
          return await this.processHistoricalUpdate(user.id, item_id);
        
        case 'DEFAULT_UPDATE':
          logger.info('DEFAULT_UPDATE received - triggering analytics refresh', {
            userId: user.id,
            item_id,
            new_transactions: payload.new_transactions || 0
          });
          
          // Trigger analytics refresh to update currentMonthSpending
          await this.analyticsService.processUserAnalytics(user.id);
          
          logger.info('Analytics refreshed successfully for DEFAULT_UPDATE', {
            userId: user.id,
            item_id
          });
          
          return {
            success: true,
            message: 'DEFAULT_UPDATE processed - analytics refreshed'
          };

        default:
          logger.info('Unhandled transaction webhook code', {
            webhook_code,
            userId: user.id,
            item_id
          });
          return {
            success: true,
            message: `Transaction webhook ${webhook_code} acknowledged`
          };
      }

    } catch (error: any) {
      logger.error('Failed to handle transaction webhook', {
        error: error.message,
        webhook_code,
        item_id
      });

      return {
        success: false,
        message: `Transaction webhook failed: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * Process HISTORICAL_UPDATE webhook - triggers analytics and welcome message
   */
  private async processHistoricalUpdate(userId: string, itemId: string): Promise<WebhookProcessingResult> {
    try {
      logger.info('Processing historical update - triggering analytics', {
        userId,
        itemId
      });

      // Trigger analytics calculation
      await this.analyticsService.processUserAnalytics(userId);

      logger.info('Analytics completed successfully for historical update', {
        userId,
        itemId
      });

      // Note: Welcome SMS is now sent immediately after phone verification
      // Analytics update silently in background

      return {
        success: true,
        message: 'Historical update processed successfully'
      };

    } catch (error: any) {
      logger.error('Failed to process historical update', {
        userId,
        itemId,
        error: error.message
      });

      return {
        success: false,
        message: `Historical update failed: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * Find user by Plaid item ID
   */
  private async findUserByItemId(itemId: string): Promise<{ id: string; firstName: string; lastName: string } | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { plaidItemId: itemId },
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      });

      return user;
    } catch (error: any) {
      logger.error('Failed to find user by item ID', {
        itemId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify Plaid webhook signature for security
   */
  // DONT DEPLOY TO PRODUCTION UNTIL WE HAVE JWT VERIFICATION
  private verifySignature(_rawBody: string, _signature: string): boolean {
    // TODO: Implement JWT verification before production scale
    // Temporarily disabled for MVP launch to allow webhook processing
    logger.warn('Webhook signature verification temporarily disabled for MVP launch');
    return true;

    // Original implementation commented out for reference:
    /*
    try {
      const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.error('PLAID_WEBHOOK_SECRET not configured');
        return false;
      }

      // Plaid sends signature in format: t=timestamp,v1=signature
      const signatureParts = signature.split(',');
      const timestampPart = signatureParts.find(part => part.startsWith('t='));
      const signaturePart = signatureParts.find(part => part.startsWith('v1='));

      if (!timestampPart || !signaturePart) {
        logger.error('Invalid signature format', { signature });
        return false;
      }

      const timestamp = timestampPart.split('=')[1];
      const providedSignature = signaturePart.split('=')[1];

      // Create expected signature
      const payload = timestamp + '.' + rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        logger.error('Webhook signature verification failed', {
          expected: expectedSignature.substring(0, 10) + '...',
          provided: providedSignature.substring(0, 10) + '...'
        });
      }

      return isValid;

    } catch (error: any) {
      logger.error('Error verifying webhook signature', {
        error: error.message
      });
      return false;
    }
    */
  }

  /**
   * Find users who need analytics processing (fallback mechanism)
   * Called by scheduled job to handle webhook delivery failures
   */
  public async findUsersNeedingAnalytics(): Promise<string[]> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const users = await this.prisma.user.findMany({
        where: {
          plaidConnectedAt: {
            lt: fiveMinutesAgo // Connected more than 5 minutes ago
          },
          plaidItemId: {
            not: null // Has Plaid connection
          },
          spendingAnalytics: null // No analytics yet
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          plaidConnectedAt: true
        }
      });

      if (users.length > 0) {
        logger.info('Found users needing analytics fallback processing', {
          count: users.length,
          users: users.map(u => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            connectedAt: u.plaidConnectedAt
          }))
        });
      }

      return users.map(user => user.id);

    } catch (error: any) {
      logger.error('Failed to find users needing analytics', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Process analytics for a user (fallback mechanism)
   */
  public async processFallbackAnalytics(userId: string): Promise<void> {
    try {
      logger.info('Processing fallback analytics for user', { userId });

      // Process analytics
      await this.analyticsService.processUserAnalytics(userId);

      // Note: Welcome SMS is sent immediately after phone verification
      // Fallback analytics update silently in background

      logger.info('Fallback analytics processing completed', { userId });

    } catch (error: any) {
      logger.error('Failed to process fallback analytics', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cleanup method for closing connections
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await this.analyticsService.disconnect();
  }
}
