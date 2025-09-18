import { Router } from 'express';
import { PlaidController } from '../controllers/plaidController.js';
import { plaidRateLimit } from '../middleware/security.js';
import { authenticateJWT } from '../middleware/auth.js';
import { 
  validateRequestBody, 
  validateLinkTokenRequest, 
  validateExchangeTokenRequest 
} from '../middleware/validation.js';

const router = Router();
const plaidController = new PlaidController();

// Create link token for Plaid Link initialization
router.post(
  '/create_link_token',
  plaidRateLimit,
  validateRequestBody,
  validateLinkTokenRequest,
  plaidController.createLinkToken
);

// Exchange public token for access token
router.post(
  '/exchange_public_token',
  plaidRateLimit,
  validateRequestBody,
  validateExchangeTokenRequest,
  plaidController.exchangePublicToken
);

// Connect bank account with JWT authentication
router.post(
  '/connect',
  plaidRateLimit,
  validateRequestBody,
  authenticateJWT,
  plaidController.connectBank
);

export default router;