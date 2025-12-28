import { Router } from 'express';
import { PhoneVerificationController } from '../controllers/phoneVerificationController.js';
import { plaidRateLimit } from '../middleware/security.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validateRequestBody } from '../middleware/validation.js';

const router = Router();
const phoneVerificationController = new PhoneVerificationController();

// Send verification code to user's phone number
router.post(
  '/send-code',
  plaidRateLimit, // Reuse existing rate limiter for SMS endpoints
  validateRequestBody,
  authenticateJWT,
  phoneVerificationController.sendVerificationCode
);

// Verify phone number with verification code
router.post(
  '/verify-number',
  plaidRateLimit, // Reuse existing rate limiter for SMS endpoints
  validateRequestBody,
  authenticateJWT,
  phoneVerificationController.verifyNumber
);

// Resend welcome message for verified users
router.post(
  '/resend-welcome',
  plaidRateLimit, // Reuse existing rate limiter for SMS endpoints
  authenticateJWT,
  phoneVerificationController.resendWelcomeMessage
);

export default router;