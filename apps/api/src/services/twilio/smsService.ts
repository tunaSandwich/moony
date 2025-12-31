import twilio from 'twilio';
import { logger } from '@logger';
import { prisma } from '../../db.js';
import { metricsLogger } from '../../utils/metricsLogger.js';
import { twilioConfig } from '../../config/twilio.js';

// Message channel: 'sms' or 'whatsapp'
// Set MESSAGE_CHANNEL=whatsapp in .env while waiting for 10DLC approval
// Switch to MESSAGE_CHANNEL=sms once 10DLC is approved
type MessageChannel = 'sms' | 'whatsapp';

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
  channel?: MessageChannel;
}

export class TwilioSMSService {
  private client: twilio.Twilio;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly sandboxMode: boolean;
  private readonly originationNumber: string;
  private readonly messagingServiceSid?: string;
  private readonly channel: MessageChannel;
  private readonly whatsappFromNumber: string;
  
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
    
    // Message channel configuration
    // Use 'whatsapp' while waiting for 10DLC approval, then switch to 'sms'
    this.channel = (process.env.MESSAGE_CHANNEL as MessageChannel) || 'sms';
    // Twilio WhatsApp Sandbox number (or your approved WhatsApp Business number)
    this.whatsappFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    
    logger.info('[TwilioSMSService] Initialized', {
      originationNumber: this.originationNumber,
      sandboxMode: this.sandboxMode,
      hasMessagingServiceSid: !!this.messagingServiceSid,
      channel: this.channel,
      whatsappNumber: this.channel === 'whatsapp' ? this.whatsappFromNumber : 'N/A'
    });
    
    // Log helpful reminder for WhatsApp setup
    if (this.channel === 'whatsapp') {
      logger.info('[TwilioSMSService] 📱 WhatsApp mode enabled. Users must first opt-in by sending "join <sandbox-code>" to the Twilio WhatsApp number.');
    }
  }

  async sendMessage(params: SendSMSParams): Promise<SendSMSResult> {
    const startTime = Date.now();
    const { to, body, userId, messageType } = params;

    if (!this.isValidE164(to)) {
      return { success: false, error: 'Invalid phone number format', retryable: false };
    }

    const channelLabel = this.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
    
    logger.info(`[TwilioSMSService] Sending ${channelLabel} via Twilio`, {
      from: this.channel === 'whatsapp' ? this.whatsappFromNumber : this.originationNumber,
      to: this.maskPhoneNumber(to),
      bodyLength: body.length,
      messageType: messageType || 'TRANSACTIONAL',
      channel: this.channel,
      userId
    });
    
    try {
      // Prepare message parameters based on channel
      let messageParams: any;
      
      if (this.channel === 'whatsapp') {
        // WhatsApp: prefix numbers with 'whatsapp:'
        messageParams = {
          to: `whatsapp:${to}`,
          from: this.whatsappFromNumber,
          body,
        };
      } else {
        // SMS: Use Messaging Service SID if available (10DLC), otherwise use phone number
        messageParams = {
          to,
          body,
          ...(this.messagingServiceSid 
            ? { messagingServiceSid: this.messagingServiceSid }
            : { from: this.originationNumber }
          ),
          // Add status callback for delivery tracking
          statusCallback: process.env.TWILIO_STATUS_WEBHOOK_URL
        };
      }
      
      // Send the message
      const message = await this.client.messages.create(messageParams);
      
      const duration = Date.now() - startTime;
      const messageId = message.sid;
      
      // Check if user opted out (Twilio returns error code 21610)
      const optedOut = message.errorCode === 21610;
      
      logger.info(`[TwilioSMSService] ${channelLabel} sent successfully`, {
        messageId,
        to: this.maskPhoneNumber(to),
        duration,
        channel: this.channel,
        status: message.status,
        optedOut,
        userId
      });
      
      // Log metrics for successful delivery
      if (messageId) {
        metricsLogger.logDeliverySuccess(messageId, this.channel);
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
        cost: this.estimateCost(to),
        channel: this.channel
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error(`[TwilioSMSService] Failed to send ${channelLabel}`, {
        to: this.maskPhoneNumber(to),
        error: error.message,
        errorCode: error.code,
        duration,
        channel: this.channel,
        userId
      });
      
      // Log metrics for delivery failure
      metricsLogger.logDeliveryFailure(error.message, this.channel);
      metricsLogger.logProcessingError(`${this.channel}_send`, error.message);
      
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
