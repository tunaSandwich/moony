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
  cost?: number;
}

export class AWSSMSService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly sandboxMode: boolean;
  private readonly useSimulatorOverride: boolean;
  private readonly simulatorDestination: string;
  private readonly originationNumber: string;
  
  constructor() {
    this.sandboxMode = process.env.AWS_SANDBOX_MODE !== 'false';
    this.useSimulatorOverride = process.env.AWS_USE_SIMULATOR_OVERRIDE === 'true';
    this.simulatorDestination = process.env.AWS_SIMULATOR_DESTINATION || '+14254147755';
    this.originationNumber = process.env.AWS_PHONE_NUMBER || '+12065559457';
    
    if (this.sandboxMode && this.useSimulatorOverride) {
      logger.info('[AWSSMSService] Initialized in simulator-to-simulator mode', {
        origination: this.originationNumber,
        destination: this.simulatorDestination,
        sandboxMode: this.sandboxMode,
        useOverride: this.useSimulatorOverride
      });
    }
  }

  async sendMessage(params: SendSMSParams): Promise<SendSMSResult> {
    const startTime = Date.now();
    const { body, userId } = params;
    let { to } = params;

    if (!this.isValidE164(to)) {
      return { success: false, error: 'Invalid phone number format', retryable: false };
    }

    // Override destination number in local development
    let destinationNumber = to;
    
    if (this.sandboxMode && this.useSimulatorOverride) {
      // In local dev, ALWAYS use simulator destination
      logger.info('[AWSSMSService] Overriding destination with simulator number', {
        original: this.maskPhoneNumber(to),
        override: this.simulatorDestination,
        userId
      });
      destinationNumber = this.simulatorDestination;
    }
    
    // Validate simulator-to-simulator in sandbox
    if (this.sandboxMode) {
      const isSimulatorOrigination = this.isSimulatorNumber(this.originationNumber);
      const isSimulatorDestination = this.isSimulatorNumber(destinationNumber);
      
      if (!isSimulatorOrigination || !isSimulatorDestination) {
        logger.warn('[AWSSMSService] Non-simulator numbers detected in sandbox mode', {
          origination: { number: this.maskPhoneNumber(this.originationNumber), isSimulator: isSimulatorOrigination },
          destination: { number: this.maskPhoneNumber(destinationNumber), isSimulator: isSimulatorDestination }
        });
        
        // Still attempt to send but log warning
        if (!isSimulatorDestination && !this.useSimulatorOverride) {
          return {
            success: false,
            error: 'Cannot send to real numbers in sandbox mode without 10DLC',
            retryable: false
          };
        }
      }
    }
    
    logger.info('[AWSSMSService] Sending SMS via AWS', {
      from: this.originationNumber,
      to: this.maskPhoneNumber(destinationNumber),
      bodyLength: body.length,
      messageType: params.messageType || 'TRANSACTIONAL',
      sandboxMode: this.sandboxMode,
      simulatorOverride: this.useSimulatorOverride,
      userId
    });
    
    try {
      // Prepare AWS command
      const client = AWSClients.getSMSClient();
      const command = new SendTextMessageCommand({
        DestinationPhoneNumber: destinationNumber,
        OriginationIdentity: this.originationNumber,
        MessageBody: body,
        MessageType: params.messageType || 'TRANSACTIONAL',
      });
      
      // Send the message
      const response = await client.send(command);
      
      const duration = Date.now() - startTime;
      const messageId = response.MessageId;
      
      logger.info('[AWSSMSService] SMS sent successfully', {
        messageId,
        to: this.maskPhoneNumber(destinationNumber),
        duration,
        sandboxMode: this.sandboxMode,
        wasSimulator: this.isSimulatorNumber(destinationNumber),
        userId
      });
      
      // Log the actual message content in development for debugging
      if (this.sandboxMode && this.useSimulatorOverride) {
        logger.debug('[AWSSMSService] Simulator message content', {
          messageId,
          body: body.substring(0, 100) + (body.length > 100 ? '...' : '') // Log first 100 chars
        });
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
        } catch (e: any) {
          logger.error('[AWSSMSService] Failed to update user SMS tracking fields', {
            userId,
            error: e.message,
          });
        }
      }
      
      return {
        success: true,
        messageId,
        retryable: false,
        cost: this.isSimulatorNumber(destinationNumber) ? 0.00 : undefined // Simulator messages are free
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('[AWSSMSService] Failed to send SMS', {
        to: this.maskPhoneNumber(destinationNumber),
        error: error.message,
        errorCode: error.code,
        duration,
        sandboxMode: this.sandboxMode,
        userId
      });
      
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryableAWSError(error.code)
      };
    }
  }

  /**
   * Check if a phone number is a simulator number
   */
  private isSimulatorNumber(phoneNumber: string): boolean {
    const simulatorNumbers = [
      // Origination simulators
      '+12065559457',
      '+12065559453', 
      // Destination simulators
      '+14254147755',
      '+14254147156',
      '+14254147266',
      '+14254147489',
      '+14254147499',
      '+14254147511',
      '+14254147600',
      '+14254147633',
      '+14254147654',
      '+14254147688'
    ];
    
    return simulatorNumbers.includes(phoneNumber);
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


