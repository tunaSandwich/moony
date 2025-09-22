import twilio from 'twilio';
import { logger } from '@logger';

export interface MessageOptions {
  to: string;
  body: string;
  useWhatsApp?: boolean;
  forceChannel?: 'sms' | 'whatsapp';
}

export interface MessageResult {
  success: boolean;
  messageSid?: string;
  channel: 'sms' | 'whatsapp';
  error?: string;
  fallbackUsed?: boolean;
}

export class MessagingService {
  private twilioClient: twilio.Twilio;
  private useWhatsAppForTesting: boolean;
  private testMode: boolean;

  constructor() {
    // Validate required environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) not configured');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.useWhatsAppForTesting = process.env.TWILIO_USE_WHATSAPP_FOR_TESTING === 'true';
    this.testMode = process.env.TWILIO_TEST_MODE === 'true';

    logger.info('MessagingService initialized', {
      useWhatsAppForTesting: this.useWhatsAppForTesting,
      testMode: this.testMode
    });
  }

  /**
   * Send a message via SMS or WhatsApp with intelligent fallback
   */
  public async sendMessage(options: MessageOptions): Promise<MessageResult> {
    const { to, body, useWhatsApp, forceChannel } = options;

    // Determine which channel to use
    let useWhatsAppChannel = false;
    
    if (forceChannel === 'whatsapp') {
      useWhatsAppChannel = true;
    } else if (forceChannel === 'sms') {
      useWhatsAppChannel = false;
    } else if (useWhatsApp !== undefined) {
      useWhatsAppChannel = useWhatsApp;
    } else {
      // Default behavior based on environment
      useWhatsAppChannel = this.useWhatsAppForTesting;
    }

    const channel = useWhatsAppChannel ? 'whatsapp' : 'sms';

    try {
      const result = await this.sendViaChannel(to, body, channel);
      return result;
    } catch (error: any) {
      logger.error('Primary message send failed', {
        channel,
        to: this.maskPhoneNumber(to),
        error: error.message,
        errorCode: error.code
      });

      // Try fallback in test mode if primary channel fails
      if (this.testMode && !forceChannel) {
        const fallbackChannel = channel === 'sms' ? 'whatsapp' : 'sms';
        
        try {
          logger.info('Attempting fallback channel', {
            originalChannel: channel,
            fallbackChannel,
            to: this.maskPhoneNumber(to)
          });

          const fallbackResult = await this.sendViaChannel(to, body, fallbackChannel);
          return {
            ...fallbackResult,
            fallbackUsed: true
          };
        } catch (fallbackError: any) {
          logger.error('Fallback message send also failed', {
            fallbackChannel,
            to: this.maskPhoneNumber(to),
            error: fallbackError.message,
            errorCode: fallbackError.code
          });
        }
      }

      // Return error result
      return {
        success: false,
        channel,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Send message via specific channel
   */
  private async sendViaChannel(to: string, body: string, channel: 'sms' | 'whatsapp'): Promise<MessageResult> {
    const isWhatsApp = channel === 'whatsapp';
    
    // Format recipient and sender based on channel
    const formattedTo = isWhatsApp ? `whatsapp:${this.cleanPhoneNumber(to)}` : this.cleanPhoneNumber(to);
    const fromNumber = isWhatsApp 
      ? process.env.TWILIO_WHATSAPP_FROM 
      : process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      const envVar = isWhatsApp ? 'TWILIO_WHATSAPP_FROM' : 'TWILIO_PHONE_NUMBER';
      throw new Error(`${envVar} not configured`);
    }

    logger.info('Sending message', {
      channel,
      to: this.maskPhoneNumber(formattedTo),
      from: fromNumber,
      bodyLength: body.length
    });

    const message = await this.twilioClient.messages.create({
      body,
      from: fromNumber,
      to: formattedTo
    });

    logger.info('Message sent successfully', {
      channel,
      messageSid: message.sid,
      to: this.maskPhoneNumber(formattedTo),
      status: message.status
    });

    return {
      success: true,
      messageSid: message.sid,
      channel
    };
  }

  /**
   * Clean phone number format
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove whatsapp: prefix if present
    const cleaned = phoneNumber.replace(/^whatsapp:/, '');
    
    // Ensure + prefix for international format
    if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Mask phone number for logging (show only last 4 digits)
   */
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, -4).replace(/./g, '*')}${cleaned.slice(-4)}`;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    // Map common Twilio error codes to user-friendly messages
    const errorMappings: Record<string, string> = {
      '30034': 'SMS delivery temporarily unavailable. Please try again later.',
      '21211': 'Invalid phone number format.',
      '21614': 'WhatsApp message could not be delivered.',
      '21408': 'Permission denied for this phone number.',
      '21610': 'Message contains forbidden content.',
      '30003': 'Message delivery failed due to network issues.',
      '30005': 'Phone number is unreachable.',
      '30008': 'Message blocked by carrier filters.'
    };

    if (error.code && errorMappings[error.code]) {
      return errorMappings[error.code];
    }

    // Generic fallback message
    return 'Message delivery failed. Please try again later.';
  }

  /**
   * Check if error indicates SMS is blocked/unavailable
   */
  public isSMSBlocked(error: any): boolean {
    const smsBlockedCodes = ['30034', '21408', '30008', '21610'];
    return error.code && smsBlockedCodes.includes(error.code);
  }

  /**
   * Parse incoming webhook message to extract channel info
   */
  public parseIncomingMessage(webhookBody: any): {
    phoneNumber: string;
    messageBody: string;
    channel: 'sms' | 'whatsapp';
    messageSid: string;
  } {
    const isWhatsApp = webhookBody.From?.startsWith('whatsapp:');
    const phoneNumber = this.cleanPhoneNumber(webhookBody.From || '');
    
    return {
      phoneNumber,
      messageBody: webhookBody.Body || '',
      channel: isWhatsApp ? 'whatsapp' : 'sms',
      messageSid: webhookBody.MessageSid || ''
    };
  }
}