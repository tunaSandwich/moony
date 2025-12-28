import { Request, Response } from 'express';
import axios from 'axios';
import { IncomingMessageHandler } from '../services/aws/incomingMessageHandler.js';
import { logger } from 'packages/utils/logger.js';
import crypto from 'crypto';

export class SMSWebhookController {
  private messageHandler: IncomingMessageHandler;
  
  constructor() {
    this.messageHandler = new IncomingMessageHandler();
  }
  
  /**
   * Handle incoming webhook from AWS SNS
   */
  async handleIncomingSMS(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Received SNS webhook', {
        messageType: req.headers['x-amz-sns-message-type'],
        topicArn: req.headers['x-amz-sns-topic-arn'],
        userAgent: req.headers['user-agent']
      });
      
      // Parse SNS message
      const snsMessage = req.body;
      
      // Verify SNS signature (important for security!)
      const isValid = await this.verifySNSSignature(req);
      if (!isValid) {
        logger.error('Invalid SNS signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      
      // Handle subscription confirmation
      if (snsMessage.Type === 'SubscriptionConfirmation') {
        await this.confirmSubscription(snsMessage);
        res.status(200).json({ message: 'Subscription confirmed' });
        return;
      }
      
      // Handle notification
      if (snsMessage.Type === 'Notification') {
        // Parse the actual SMS message from SNS wrapper
        const smsData = JSON.parse(snsMessage.Message);
        
        logger.info('Incoming SMS data', {
          from: this.maskPhoneNumber(smsData.originationNumber),
          to: this.maskPhoneNumber(smsData.destinationNumber),
          messageKeyword: smsData.messageKeyword,
          bodyPreview: smsData.messageBody?.substring(0, 50) + '...'
        });
        
        // Process the message asynchronously
        this.messageHandler.processIncomingMessage({
          originationNumber: smsData.originationNumber,
          destinationNumber: smsData.destinationNumber,
          messageBody: smsData.messageBody,
          messageKeyword: smsData.messageKeyword,
          inboundMessageId: smsData.inboundMessageId,
          previousPublishedMessageId: smsData.previousPublishedMessageId
        }).catch(error => {
          logger.error('Failed to process message async', { 
            error: error.message,
            messageId: smsData.inboundMessageId 
          });
        });
        
        // Respond immediately to SNS
        res.status(200).json({ message: 'Message received' });
        return;
      }
      
      // Handle unsubscribe confirmation
      if (snsMessage.Type === 'UnsubscribeConfirmation') {
        logger.info('Unsubscribe confirmation received');
        res.status(200).json({ message: 'Unsubscribe confirmed' });
        return;
      }
      
      // Unknown message type
      logger.warn('Unknown SNS message type', { type: snsMessage.Type });
      res.status(200).json({ message: 'Acknowledged' });
      
    } catch (error: any) {
      logger.error('Webhook processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      // Always return 200 to SNS to prevent retries
      res.status(200).json({ error: 'Processing error' });
    }
  }
  
  /**
   * Verify SNS signature for security
   */
  private async verifySNSSignature(req: Request): Promise<boolean> {
    try {
      const snsMessage = req.body;
      
      // Check if SNS signature verification is disabled for development
      if (process.env.NODE_ENV === 'local' && process.env.SKIP_SNS_VERIFICATION === 'true') {
        logger.warn('Skipping SNS signature verification in development');
        return true;
      }
      
      // Validate required fields
      if (!snsMessage.Signature || !snsMessage.SigningCertURL) {
        logger.error('Missing signature or certificate URL');
        return false;
      }
      
      // Build the string to sign
      const fields = [
        'Message',
        'MessageId',
        'Subject',
        'Timestamp',
        'TopicArn',
        'Type'
      ];
      
      let stringToSign = '';
      for (const field of fields) {
        if (snsMessage[field] !== undefined) {
          stringToSign += `${field}\n${snsMessage[field]}\n`;
        }
      }
      
      // Get the certificate
      const certUrl = snsMessage.SigningCertURL;
      if (!certUrl || !certUrl.startsWith('https://sns.')) {
        logger.error('Invalid certificate URL', { certUrl });
        return false;
      }
      
      // Fetch the certificate
      const certResponse = await axios.get(certUrl, { timeout: 5000 });
      const certificate = certResponse.data;
      
      // Verify the signature
      const verifier = crypto.createVerify('RSA-SHA1');
      verifier.update(stringToSign);
      const isValid = verifier.verify(certificate, snsMessage.Signature, 'base64');
      
      if (!isValid) {
        logger.error('SNS signature verification failed', {
          stringToSign: stringToSign.substring(0, 200) + '...'
        });
      }
      
      return isValid;
      
    } catch (error: any) {
      logger.error('Signature verification error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Confirm SNS subscription
   */
  private async confirmSubscription(snsMessage: any): Promise<void> {
    try {
      const subscribeUrl = snsMessage.SubscribeURL;
      
      if (!subscribeUrl) {
        logger.error('No SubscribeURL in confirmation message');
        return;
      }
      
      logger.info('Confirming SNS subscription', {
        topicArn: snsMessage.TopicArn,
        subscribeUrl: subscribeUrl.substring(0, 50) + '...'
      });
      
      // Confirm the subscription
      const response = await axios.get(subscribeUrl, { timeout: 10000 });
      
      logger.info('SNS subscription confirmed successfully', {
        status: response.status,
        subscriptionArn: response.data?.SubscriptionArn || 'Not provided'
      });
      
    } catch (error: any) {
      logger.error('Failed to confirm subscription', {
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }
  
  /**
   * Health check endpoint for webhook
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({ 
      status: 'ok', 
      service: 'aws-webhook',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
  
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length <= 4) return phoneNumber || '';
    return `****${phoneNumber.slice(-4)}`;
  }
}