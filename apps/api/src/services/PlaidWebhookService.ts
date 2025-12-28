import { prisma } from '../db.js';
import { PlaidAnalyticsService } from './plaidAnalyticsService.js';
import { logger } from '@logger';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

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
  private prisma = prisma;
  private analyticsService: PlaidAnalyticsService;
  private keyCache: Map<string, { pem: string; expiredAt: string | null }>; // cache Plaid verification keys by kid

  constructor() {
    this.analyticsService = new PlaidAnalyticsService();
    this.keyCache = new Map();
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
      if (!(await this.verifySignature(rawBody, signature))) {
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
  private async verifySignature(rawBody: string, signedJwt: string): Promise<boolean> {
    try {
      if (!signedJwt || typeof signedJwt !== 'string') {
        logger.error('Missing Plaid-Verification JWT');
        return false;
      }

      // Decode JWT header (unverified) to get kid and alg
      const [encodedHeader] = signedJwt.split('.');
      if (!encodedHeader) {
        logger.error('Invalid JWT structure in Plaid-Verification header');
        return false;
      }

      const headerJson = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as { alg?: string; kid?: string };
      const { alg, kid } = headerJson;

      if (alg !== 'ES256') {
        logger.error('Unexpected JWT alg for Plaid webhook', { alg });
        return false;
      }
      if (!kid) {
        logger.error('Missing kid in Plaid webhook JWT header');
        return false;
      }

      // Resolve PEM public key for kid (cached)
      const pem = await this.getPemForKeyId(kid);
      if (!pem) {
        return false; // errors already logged
      }

      // Verify JWT signature and decode claims
      const decoded = jwt.verify(signedJwt, pem, { algorithms: ['ES256'] }) as any;

      // Validate issued-at freshness (within 5 minutes)
      const nowSec = Math.floor(Date.now() / 1000);
      const iat = typeof decoded.iat === 'number' ? decoded.iat : 0;
      const ageSec = nowSec - iat;
      if (ageSec < -300 || ageSec > 300) { // allow small clock skew in both directions
        logger.error('Plaid webhook JWT iat outside acceptable window', { iat, nowSec });
        return false;
      }

      // Validate request_body_sha256
      const claimHash = typeof decoded.request_body_sha256 === 'string' ? decoded.request_body_sha256.toLowerCase() : '';
      const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex').toLowerCase();

      if (claimHash.length !== bodyHash.length) {
        logger.error('Plaid webhook body hash length mismatch');
        return false;
      }

      const equal = crypto.timingSafeEqual(Buffer.from(bodyHash, 'utf8'), Buffer.from(claimHash, 'utf8'));
      if (!equal) {
        logger.error('Plaid webhook body hash mismatch');
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('Plaid webhook JWT verification failed', { error: error.message });
      return false;
    }
  }

  private async getPemForKeyId(kid: string): Promise<string | null> {
    try {
      const cached = this.keyCache.get(kid);
      if (cached) {
        if (!cached.expiredAt) {
          return cached.pem;
        }
        // Expired key -> evict and refresh
        this.keyCache.delete(kid);
      }

      const clientId = process.env.PLAID_CLIENT_ID;
      const secret = process.env.PLAID_SECRET;
      const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
      if (!clientId || !secret) {
        logger.error('PLAID_CLIENT_ID/PLAID_SECRET not configured');
        return null;
      }

      const baseUrl = env === 'production'
        ? 'https://production.plaid.com'
        : env === 'development'
          ? 'https://development.plaid.com'
          : 'https://sandbox.plaid.com';

      const url = `${baseUrl}/webhook_verification_key/get`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          key_id: kid
        })
      });

      if (!response.ok) {
        logger.error('Failed to fetch Plaid verification key', { status: response.status, kid });
        return null;
      }

      const data = await response.json() as { key?: { pem?: string; expired_at?: string | null } };
      const key = data.key;
      if (!key || !key.pem) {
        logger.error('Invalid key response from Plaid', { kid });
        return null;
      }

      if (key.expired_at) {
        logger.error('Received expired Plaid verification key', { kid, expired_at: key.expired_at });
        return null;
      }

      this.keyCache.set(kid, { pem: key.pem, expiredAt: key.expired_at ?? null });
      return key.pem;
    } catch (error: any) {
      logger.error('Failed to resolve Plaid verification key', { error: error.message, kid });
      return null;
    }
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
    await this.analyticsService.disconnect();
  }
}
