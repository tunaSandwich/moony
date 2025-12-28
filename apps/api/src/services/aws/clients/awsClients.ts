import { SNSClient } from '@aws-sdk/client-sns';
import { PinpointSMSVoiceV2Client } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { awsConfig } from '../../../config/aws.js'; // Note .js extension

export class AWSClients {
  private static snsClient: SNSClient | null = null;
  private static smsClient: PinpointSMSVoiceV2Client | null = null;

  static getSNSClient(): SNSClient {
    if (!this.snsClient) {
      this.snsClient = new SNSClient({
        region: awsConfig.region,
        credentials: awsConfig.credentials,
      });
    }
    return this.snsClient;
  }

  static getSMSClient(): PinpointSMSVoiceV2Client {
    if (!this.smsClient) {
      this.smsClient = new PinpointSMSVoiceV2Client({
        region: awsConfig.region,
        credentials: awsConfig.credentials,
      });
    }
    return this.smsClient;
  }

  // For testing purposes
  static reset(): void {
    this.snsClient = null;
    this.smsClient = null;
  }
}


