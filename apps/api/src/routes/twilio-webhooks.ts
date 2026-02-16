import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { TwilioIncomingMessageHandler, TwilioIncomingSMSMessage } from '../services/twilio/incomingMessageHandler.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '@logger';
import rateLimit from 'express-rate-limit';

const router = Router();
const messageHandler = new TwilioIncomingMessageHandler();

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute (higher than AWS because Twilio sends more frequent status updates)
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for Twilio user agents
  skip: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    return userAgent.includes('TwilioProxy') || userAgent.includes('Twilio');
  }
});

/**
 * Verify Twilio webhook signature for security
 * Uses the official Twilio SDK validateRequest for reliability.
 * This prevents unauthorized access to the webhook endpoint.
 */
function verifyTwilioSignature(req: Request): boolean {
  try {
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioSignature || !authToken) {
      logger.error('Missing Twilio signature or auth token', {
        hasSignature: !!twilioSignature,
        hasAuthToken: !!authToken
      });
      return false;
    }
    
    // Skip verification in development mode if configured
    if (process.env.NODE_ENV === 'local' && process.env.SKIP_TWILIO_VERIFICATION === 'true') {
      logger.warn('Skipping Twilio signature verification in development');
      return true;
    }
    
    // Build URL for signature validation.
    // Use req.hostname (strips port) rather than req.get('host') or req.headers.host
    // to avoid mismatches behind Railway/proxy where Host header may include :443.
    // req.protocol already respects the "trust proxy" setting (uses X-Forwarded-Proto).
    const url = `${req.protocol}://${req.hostname}${req.originalUrl}`;
    
    // Use the official Twilio SDK for signature validation
    const isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
    
    if (!isValid) {
      logger.warn('Twilio signature verification failed', {
        reconstructedUrl: url,
        protocol: req.protocol,
        hostname: req.hostname,
        hostHeader: req.get('host'),
        originalUrl: req.originalUrl,
        xForwardedProto: req.headers['x-forwarded-proto'],
        xForwardedHost: req.headers['x-forwarded-host'],
        bodyKeys: Object.keys(req.body || {}).join(', ')
      });
    }
    
    return isValid;
    
  } catch (error: any) {
    logger.error('Twilio signature verification error', { error: error.message });
    return false;
  }
}

/**
 * Middleware to verify Twilio webhook signatures
 */
const verifyTwilioWebhook = (req: Request, res: Response, next: any) => {
  if (!verifyTwilioSignature(req)) {
    logger.warn('Twilio webhook signature verification failed', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.originalUrl
    });
    return res.status(403).json({ error: 'Forbidden - Invalid signature' });
  }
  next();
};

/**
 * Handle incoming SMS webhook from Twilio
 * Twilio sends POST requests with form data for incoming messages
 */
router.post(
  '/incoming-sms',
  webhookLimiter,
  verifyTwilioWebhook,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Received Twilio SMS webhook', {
        from: req.body.From ? req.body.From.substring(0, 7) + '****' : 'unknown',
        to: req.body.To ? req.body.To.substring(0, 7) + '****' : 'unknown',
        messageSid: req.body.MessageSid,
        smsStatus: req.body.SmsStatus,
        userAgent: req.headers['user-agent']
      });
      
      // Parse Twilio webhook payload
      const twilioMessage: TwilioIncomingSMSMessage = {
        From: req.body.From,
        To: req.body.To,
        Body: req.body.Body || '',
        MessageSid: req.body.MessageSid,
        AccountSid: req.body.AccountSid,
        NumSegments: req.body.NumSegments || '1',
        SmsStatus: req.body.SmsStatus,
        NumMedia: req.body.NumMedia || '0'
      };
      
      // Validate required fields
      if (!twilioMessage.From || !twilioMessage.Body || !twilioMessage.MessageSid) {
        logger.error('Invalid Twilio webhook payload - missing required fields', {
          hasFrom: !!twilioMessage.From,
          hasBody: !!twilioMessage.Body,
          hasMessageSid: !!twilioMessage.MessageSid
        });
        res.status(400).json({ error: 'Invalid webhook payload' });
        return;
      }
      
      // Skip media messages (we only handle text for budget updates)
      if (twilioMessage.NumMedia && parseInt(twilioMessage.NumMedia) > 0) {
        logger.info('Skipping media message', {
          messageSid: twilioMessage.MessageSid,
          numMedia: twilioMessage.NumMedia
        });
        res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }
      
      // Process the message asynchronously
      messageHandler.processIncomingMessage(twilioMessage).catch(error => {
        logger.error('Failed to process Twilio message async', { 
          error: error.message,
          messageSid: twilioMessage.MessageSid 
        });
      });
      
      // Respond to Twilio immediately with empty TwiML (no auto-reply)
      res.set('Content-Type', 'text/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      
    } catch (error: any) {
      logger.error('Twilio webhook processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      // Always return 200 to Twilio to prevent retries for processing errors
      res.set('Content-Type', 'text/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  })
);

/**
 * Handle delivery status webhooks from Twilio
 * This is called when Twilio updates the delivery status of messages we sent
 */
router.post(
  '/status',
  webhookLimiter,
  verifyTwilioWebhook,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Received Twilio status webhook', {
        messageSid: req.body.MessageSid,
        messageStatus: req.body.MessageStatus,
        errorCode: req.body.ErrorCode
      });
      
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      
      if (MessageSid) {
        // Log delivery status for metrics
        if (MessageStatus === 'delivered') {
          logger.info('Message delivered successfully', {
            messageSid: MessageSid
          });
        } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
          logger.warn('Message delivery failed', {
            messageSid: MessageSid,
            errorCode: ErrorCode,
            errorMessage: ErrorMessage
          });
        }
        
        // Future enhancement: Update database with delivery status for analytics
      }
      
      // Respond to Twilio
      res.status(200).json({ message: 'Status received' });
      
    } catch (error: any) {
      logger.error('Twilio status webhook processing error', {
        error: error.message,
        body: req.body
      });
      
      // Always return 200 to prevent retries
      res.status(200).json({ error: 'Processing error' });
    }
  })
);

/**
 * Health check endpoint for Twilio webhooks
 */
router.get('/health', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.json({ 
    status: 'ok', 
    service: 'twilio-webhook',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}));

/**
 * Test endpoint for development - allows testing webhook processing locally
 */
router.post('/test', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'local') {
    res.json({ 
      message: 'Twilio webhook test endpoint active',
      headers: req.headers,
      body: req.body,
      signatureValid: verifyTwilioSignature(req)
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
