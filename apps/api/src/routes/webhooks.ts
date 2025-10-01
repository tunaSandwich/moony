import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController.js';
import { plaidRateLimit } from '../middleware/security.js';

const router = Router();
const webhookController = new WebhookController();

// Handle incoming SMS messages from Twilio
router.post(
  '/twilio/incoming-message',
  plaidRateLimit, // Apply rate limiting to prevent abuse
  webhookController.handleIncomingMessage
);

// Handle Plaid webhooks (HISTORICAL_UPDATE, etc.)
router.post(
  '/plaid',
  plaidRateLimit, // Apply rate limiting to prevent abuse
  webhookController.handlePlaidWebhook
);

export default router;