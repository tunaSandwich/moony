import { SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { logger } from 'packages/utils/logger.js';
import { AWSClients } from './clients/awsClients.js';
import { awsConfig } from '../../config/aws.js';
import { prisma } from '../../db.js';

export interface SendSMSParams {
  to: string;           // E.164 format from database
  body: string;
  messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
  userId?: string;      // For tracking
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable: boolean;
  sandboxSkipped?: boolean;
}

export class AWSSMSService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  async sendMessage(params: SendSMSParams): Promise<SendSMSResult> {
    const { to, body, userId } = params;

    if (!this.isValidE164(to)) {
      return { success: false, error: 'Invalid phone number format', retryable: false };
    }

    // Sandbox behavior: skip unverified recipients
    if (awsConfig.isSandbox) {
      const verified = await this.isNumberVerifiedInSandbox(to);
      if (!verified) {
        logger.info('[AWSSMSService] Sandbox: skipping unverified recipient', { to: this.maskPhoneNumber(to) });
        return { success: true, retryable: false, sandboxSkipped: true };
      }
    }

    const result = await this.sendWithRetry({ ...params, messageType: params.messageType || 'TRANSACTIONAL' });

    // Update DB tracking on success when userId present
    if (result.success && userId && result.messageId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastSmsMessageId: result.messageId,
            lastSmsSentAt: new Date(),
          } as any,
        });
      } catch (e: any) {
        logger.error('[AWSSMSService] Failed to update user SMS tracking fields', {
          userId,
          error: e.message,
        });
      }
    }

    return result;
  }

  private async isNumberVerifiedInSandbox(phoneNumber: string): Promise<boolean> {
    try {
      // Find user by phone number
      const user = await prisma.user.findUnique({ where: { phoneNumber: phoneNumber } });
      if (!user) return false;

      if (awsConfig.environment === 'local') {
        return user.phoneVerified;
      }
      if (awsConfig.environment === 'staging') {
        return Boolean((user as any).sandboxVerified ?? false);
      }
      // In production, sandbox mode should be false; default to true to avoid blocking
      return true;
    } catch (e: any) {
      logger.error('[AWSSMSService] Sandbox verification lookup failed', { error: e.message });
      return false;
    }
  }

  private async sendWithRetry(params: SendSMSParams, attempt = 1): Promise<SendSMSResult> {
    const maskedTo = this.maskPhoneNumber(params.to);
    try {
      const client = AWSClients.getSMSClient();
      const command = new SendTextMessageCommand({
        DestinationPhoneNumber: params.to,
        MessageBody: params.body,
        MessageType: params.messageType || 'TRANSACTIONAL',
        // CallerId is optional; do not set phone number from env here
      });

      logger.info('[AWSSMSService] Sending SMS', {
        to: maskedTo,
        type: params.messageType || 'TRANSACTIONAL',
      });

      const response = await client.send(command);

      const messageId = response?.MessageId;

      logger.info('[AWSSMSService] SMS sent', { to: maskedTo, messageId });

      return { success: true, messageId, retryable: false };
    } catch (error: any) {
      const code: string | undefined = error?.name || error?.Code || error?.code;
      const retryable = this.isRetryableAWSError(code);

      logger.error('[AWSSMSService] SMS send failed', {
        to: maskedTo,
        error: error?.message || String(error),
        code,
        attempt,
        retryable,
      });

      if (retryable && attempt < this.maxRetries) {
        const delayMs = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delayMs));
        return this.sendWithRetry(params, attempt + 1);
      }

      return { success: false, error: error?.message || 'Failed to send SMS', retryable };
    }
  }

  async sendBulkMessages(messages: SendSMSParams[]): Promise<SendSMSResult[]> {
    const results: SendSMSResult[] = [];
    const spacingMs = awsConfig.isSandbox ? 100 : 50;

    for (let i = 0; i < messages.length; i++) {
      const res = await this.sendMessage(messages[i]);
      results.push(res);
      if (i < messages.length - 1) {
        await new Promise((r) => setTimeout(r, spacingMs));
      }
    }

    return results;
  }

  // Helper methods
  private isValidE164(phoneNumber: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }

  private maskPhoneNumber(phoneNumber: string): string {
    return phoneNumber.substring(0, 7) + '****';
  }

  private isRetryableAWSError(code?: string): boolean {
    if (!code) return false;
    const retryables = new Set(['ThrottlingException', 'ServiceUnavailable', 'InternalServiceError']);
    return retryables.has(code);
  }
}


