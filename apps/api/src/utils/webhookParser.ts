/**
 * Webhook Parser Utility
 * 
 * Extracts webhook parsing functionality from MessagingService
 * to handle incoming SMS/WhatsApp messages without dependencies on Twilio SMS sending
 */

export interface ParsedIncomingMessage {
  phoneNumber: string;
  messageBody: string;
  channel: 'sms' | 'whatsapp';
  messageSid: string;
}

/**
 * Parse incoming webhook messages (keeping only what's needed for processing)
 * Extracted from MessagingService to maintain webhook functionality without SMS sending
 */
export class WebhookParser {
  /**
   * Parse incoming webhook message to extract channel info
   * Originally from MessagingService.parseIncomingMessage()
   */
  public static parseIncomingMessage(webhookBody: any): ParsedIncomingMessage {
    const isWhatsApp = webhookBody.From?.startsWith('whatsapp:');
    const phoneNumber = this.cleanPhoneNumber(webhookBody.From || '');
    
    return {
      phoneNumber,
      messageBody: webhookBody.Body || '',
      channel: isWhatsApp ? 'whatsapp' : 'sms',
      messageSid: webhookBody.MessageSid || ''
    };
  }
  
  /**
   * Clean phone number format
   * Extracted from MessagingService.cleanPhoneNumber()
   */
  private static cleanPhoneNumber(phoneNumber: string): string {
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
   * Extracted from MessagingService.maskPhoneNumber()
   */
  public static maskPhoneNumber(phoneNumber: string): string {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, -4).replace(/./g, '*')}${cleaned.slice(-4)}`;
  }
  
  /**
   * Validate required webhook fields
   */
  public static validateWebhookData(parsedMessage: ParsedIncomingMessage): boolean {
    return !!(parsedMessage.phoneNumber && parsedMessage.messageSid);
  }
}