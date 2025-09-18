import { Router } from 'express';
import { InviteController } from '../controllers/inviteController.js';
import { validateRequestBody, validateInviteCodeRequest } from '../middleware/validation.js';

const router = Router();
const inviteController = new InviteController();

// POST /api/invite-codes/validate
router.post(
  '/validate',
  validateRequestBody,
  validateInviteCodeRequest,
  inviteController.validateInviteCode
);

export default router;