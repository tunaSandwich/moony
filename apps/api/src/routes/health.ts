import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';
import { generalRateLimit } from '../middleware/security.js';

const router = Router();
const healthController = new HealthController();

// Health check endpoint - used by load balancers and monitoring
router.get('/health', generalRateLimit, healthController.getHealth);

// Readiness check - used by container orchestrators
router.get('/ready', generalRateLimit, healthController.getReadiness);

export default router;