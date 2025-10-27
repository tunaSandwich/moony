import { Router } from 'express';
import { SMSWebhookController } from '../controllers/smsWebhookController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const controller = new SMSWebhookController();

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for AWS user agents
  skip: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    return userAgent.includes('Amazon Simple Notification Service Agent');
  }
});

// Middleware to parse SNS messages (they come as text, not JSON)
const parseSNSMessage = (req: any, res: any, next: any) => {
  // SNS sends messages as text/plain, but we need to parse them as JSON
  if (req.headers['x-amz-sns-message-type']) {
    // Body should already be parsed by express.json() middleware
    next();
  } else {
    next();
  }
};

// Incoming SMS webhook endpoint
router.post(
  '/incoming-sms',
  webhookLimiter,
  parseSNSMessage,
  asyncHandler(controller.handleIncomingSMS.bind(controller))
);

// Health check for webhook
router.get('/health', asyncHandler(controller.healthCheck.bind(controller)));

// Test endpoint for development
router.post('/test', (req, res) => {
  if (process.env.NODE_ENV === 'local') {
    res.json({ 
      message: 'Test endpoint active',
      headers: req.headers,
      body: req.body
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;