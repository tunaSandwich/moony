import { Router } from 'express';
import healthRoutes from './health.js';
import plaidRoutes from './plaid.js';
import jobRoutes from './jobs.js';
import inviteRoutes from './invite.js';
import twilioRoutes from './twilio.js';
import webhookRoutes from './webhooks.js';
import awsWebhooksRoutes from './aws-webhooks.js';
import userRoutes from './user.js';
import goalsRoutes from './goals.js';
import simulatorRoutes from './dev/simulatorRoutes.js';

const router = Router();

// Mount route modules
router.use('/', healthRoutes);
router.use('/api/plaid', plaidRoutes);
router.use('/api/twilio', twilioRoutes);
router.use('/api/webhooks', webhookRoutes);
router.use('/api/webhooks/aws', awsWebhooksRoutes);
router.use('/api/user', userRoutes);
router.use('/api/goals', goalsRoutes);
router.use('/api', jobRoutes);
router.use('/api/invite-codes', inviteRoutes);

// Development-only routes
if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
  router.use('/api/dev/simulator', simulatorRoutes);
}

export default router;