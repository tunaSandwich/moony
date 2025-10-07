import { Router } from 'express';
import { TwilioController } from '../controllers/twilioController.js';
import { plaidRateLimit } from '../middleware/security.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validateRequestBody } from '../middleware/validation.js';

const router = Router();
const twilioController = new TwilioController();

// Send verification code to user's phone number
router.post(
  '/send-code',
  plaidRateLimit, // Reuse existing rate limiter for SMS endpoints
  validateRequestBody,
  authenticateJWT,
  twilioController.sendVerificationCode
);

// Verify phone number with verification code
router.post(
  '/verify-number',
  plaidRateLimit, // Reuse existing rate limiter for SMS endpoints
  validateRequestBody,
  authenticateJWT,
  twilioController.verifyNumber
);

// Resend welcome message for verified users
router.post(
  '/resend-welcome',
  plaidRateLimit, // Reuse existing rate limiter for SMS endpoints
  authenticateJWT,
  twilioController.resendWelcomeMessage
);

export default router;