import { z } from 'zod';
import { logger } from '@logger';

const awsConfigSchema = z.object({
  region: z.string().default('us-west-1'),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  phoneNumber: z.string().optional(), // Will be added after 10DLC approval
  snsTopicArn: z.string(),
  sandboxMode: z.boolean(),
  environment: z.enum(['local', 'staging', 'production']),
});

class AWSConfig {
  private config: z.infer<typeof awsConfigSchema>;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig() {
    // Determine environment from NODE_ENV, mapping 'development' to 'local'
    const nodeEnv = process.env.NODE_ENV || 'local';
    const environment = nodeEnv === 'development' ? 'local' : nodeEnv as 'local' | 'staging' | 'production';
    
    // Parse and validate using zod
    return awsConfigSchema.parse({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      // Intentionally not sourcing phoneNumber from env; it will be retrieved from DB when needed
      snsTopicArn: process.env.AWS_SNS_TOPIC_ARN,
      sandboxMode: process.env.AWS_SANDBOX_MODE === 'true',
      environment,
    });
  }

  private validateConfig() {
    // Log sandbox warning
    if (this.config.sandboxMode) {
      logger.warn(`⚠️  AWS SMS running in SANDBOX mode for ${this.config.environment} environment`);
    }

    // Phone number will be managed in the database once 10DLC is approved.
    // Do not require phoneNumber from environment variables.
  }

  // Add getters for each config value
  get credentials() {
    return {
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    };
  }

  get region() {
    return this.config.region;
  }

  get phoneNumber() {
    return this.config.phoneNumber;
  }

  get snsTopicArn() {
    return this.config.snsTopicArn;
  }

  get isSandbox() {
    return this.config.sandboxMode;
  }

  get environment() {
    return this.config.environment;
  }
}

export const awsConfig = new AWSConfig();


