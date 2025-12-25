import { z } from 'zod';
import { logger } from '@logger';
import twilio from 'twilio';

const twilioConfigSchema = z.object({
  accountSid: z.string(),
  authToken: z.string(),
  verifyServiceSid: z.string(),
  phoneNumber: z.string().default('+16267623406'),
  messagingServiceSid: z.string().optional(),
  sandboxMode: z.boolean().default(false),
  environment: z.enum(['local', 'staging', 'production']),
});

class TwilioConfig {
  private config: z.infer<typeof twilioConfigSchema>;
  private twilioClient: twilio.Twilio;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
    this.twilioClient = twilio(this.config.accountSid, this.config.authToken);
  }

  private loadConfig() {
    // Determine environment from NODE_ENV, mapping 'development' to 'local'
    const nodeEnv = process.env.NODE_ENV || 'local';
    const environment = nodeEnv === 'development' ? 'local' : nodeEnv as 'local' | 'staging' | 'production';
    
    // Parse and validate using zod
    return twilioConfigSchema.parse({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+16267623406',
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      sandboxMode: process.env.TWILIO_SANDBOX_MODE === 'true',
      environment,
    });
  }

  private validateConfig() {
    // Log configuration
    logger.info('[TwilioConfig] Twilio SMS configuration loaded', {
      environment: this.config.environment,
      phoneNumber: this.config.phoneNumber,
      hasMessagingServiceSid: !!this.config.messagingServiceSid,
      sandboxMode: this.config.sandboxMode
    });

    // Warn if using sandbox mode in production
    if (this.config.environment === 'production' && this.config.sandboxMode) {
      logger.warn('⚠️ Twilio SMS running in SANDBOX mode for production environment');
    }
  }

  // Getters for configuration values
  get credentials() {
    return {
      accountSid: this.config.accountSid,
      authToken: this.config.authToken,
    };
  }

  get client(): twilio.Twilio {
    return this.twilioClient;
  }

  get verifyServiceSid() {
    return this.config.verifyServiceSid;
  }

  get phoneNumber() {
    return this.config.phoneNumber;
  }

  get messagingServiceSid() {
    return this.config.messagingServiceSid;
  }

  get isSandbox() {
    return this.config.sandboxMode;
  }

  get environment() {
    return this.config.environment;
  }
}

export const twilioConfig = new TwilioConfig();

// Export legacy client for backward compatibility with existing phone verification
export const twilioClient = twilioConfig.client;