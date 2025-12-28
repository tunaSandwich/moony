import twilio from 'twilio';
import { logger } from '@logger';
import { prisma } from '../../db.js';
import { metricsLogger } from '../../utils/metricsLogger.js';
import { twilioConfig } from '../../config/twilio.js';

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
  cost?: number;
  optedOut?: boolean;   // Twilio specific - detect if user opted out
}

export class TwilioSMSService {
  private client: twilio.Twilio;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly sandboxMode: boolean;
  private readonly originationNumber: string;
  private readonly messagingServiceSid?: string;
  
  constructor() {
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    this.client = twilio(accountSid, authToken);
    this.sandboxMode = process.env.TWILIO_SANDBOX_MODE === 'true';
    this.originationNumber = process.env.TWILIO_PHONE_NUMBER || '+16267623406';
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    
    logger.info('[TwilioSMSService] Initialized', {
      originationNumber: this.originationNumber,
      sandboxMode: this.sandboxMode,
      hasMessagingServiceSid: !!this.messagingServiceSid
    });
  }

  async sendMessage(params: SendSMSParams): Promise<SendSMSResult> {
    const startTime = Date.now();
    const { to, body, userId, messageType } = params;

    if (!this.isValidE164(to)) {
      return { success: false, error: 'Invalid phone number format', retryable: false };
    }

    logger.info('[TwilioSMSService] Sending SMS via Twilio', {
      from: this.originationNumber,
      to: this.maskPhoneNumber(to),
      bodyLength: body.length,
      messageType: messageType || 'TRANSACTIONAL',
      sandboxMode: this.sandboxMode,
      userId
    });
    
    try {
      // Prepare message parameters
      const messageParams: any = {
        to,
        body,
        // Use Messaging Service SID if available (10DLC), otherwise use phone number
        ...(this.messagingServiceSid 
          ? { messagingServiceSid: this.messagingServiceSid }
          : { from: this.originationNumber }
        ),
        // Add status callback for delivery tracking
        statusCallback: process.env.TWILIO_STATUS_WEBHOOK_URL
      };
      
      // Send the message
      const message = await this.client.messages.create(messageParams);
      
      const duration = Date.now() - startTime;
      const messageId = message.sid;
      
      // Check if user opted out (Twilio returns error code 21610)
      const optedOut = message.errorCode === 21610;
      
      logger.info('[TwilioSMSService] SMS sent successfully', {
        messageId,
        to: this.maskPhoneNumber(to),
        duration,
        sandboxMode: this.sandboxMode,
        status: message.status,
        optedOut,
        userId
      });
      
      // Log metrics for successful delivery
      if (messageId) {
        metricsLogger.logDeliverySuccess(messageId, 'sms');
      }
      
      // Send to SMS simulator in development mode
      if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') && 
          process.env.SMS_SIMULATOR === 'true') {
        try {
          const { addSimulatorMessage } = await import('../../routes/dev/simulatorRoutes.js');
          addSimulatorMessage(to, body, this.originationNumber);
        } catch (simulatorError: any) {
          logger.debug('Failed to send message to simulator', {
            error: simulatorError.message,
            messageId
          });
        }
      }
      
      // Update DB tracking on success when userId present
      if (userId && messageId) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              lastSmsMessageId: messageId,
              lastSmsSentAt: new Date(),
            } as any,
          });
          
          // If user opted out, update their status
          if (optedOut) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                optOutStatus: 'opted_out'
              } as any,
            });
          }
        } catch (e: any) {
          logger.error('[TwilioSMSService] Failed to update user SMS tracking fields', {
            userId,
            error: e.message,
          });
        }
      }
      
      return {
        success: true,
        messageId,
        retryable: false,
        optedOut,
        cost: this.estimateCost(to)
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('[TwilioSMSService] Failed to send SMS', {
        to: this.maskPhoneNumber(to),
        error: error.message,
        errorCode: error.code,
        duration,
        sandboxMode: this.sandboxMode,
        userId
      });
      
      // Log metrics for delivery failure
      metricsLogger.logDeliveryFailure(error.message, 'sms');
      metricsLogger.logProcessingError('sms_send', error.message);
      
      // Handle Twilio-specific error codes
      if (error.code === 21610) {
        // User has opted out
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { optOutStatus: 'opted_out' } as any,
          }).catch(e => logger.error('Failed to update opt-out status', { userId, error: e.message }));
        }
        return {
          success: false,
          error: 'User has opted out of SMS messages',
          retryable: false,
          optedOut: true
        };
      }
      
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryableTwilioError(error.code)
      };
    }
  }

  async sendBulkMessages(messages: SendSMSParams[]): Promise<SendSMSResult[]> {
    const results: SendSMSResult[] = [];
    const spacingMs = this.sandboxMode ? 100 : 50;

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

  private isRetryableTwilioError(code?: number): boolean {
    if (!code) return false;
    // Twilio error codes that are retryable
    const retryables = new Set([
      20003, // Permission denied (temporary)
      20429, // Too many requests
      30001, // Queue overflow
      30002, // Account suspended (temporary)
      30003, // Unreachable destination
      30004, // Message blocked (temporary)
      30005, // Unknown destination
      30006, // Landline or unreachable carrier
      30007, // Carrier violation (temporary)
      30008, // Unknown error
      30009, // Missing segment
      30010, // Message price exceeds max price
    ]);
    return retryables.has(code);
  }

  private estimateCost(phoneNumber: string): number {
    // Rough cost estimates for SMS (in USD)
    // These are approximate and should be updated based on actual Twilio pricing
    if (phoneNumber.startsWith('+1')) {
      return 0.0079; // US/Canada
    } else if (phoneNumber.startsWith('+44')) {
      return 0.04;   // UK
    } else if (phoneNumber.startsWith('+61')) {
      return 0.055;  // Australia
    } else {
      return 0.05;   // International average
    }
  }

  /**
   * Get delivery status from Twilio
   * This can be called from a webhook to update message status
   */
  async getMessageStatus(messageSid: string): Promise<string | null> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error: any) {
      logger.error('[TwilioSMSService] Failed to get message status', {
        messageSid,
        error: error.message
      });
      return null;
    }
  }
}