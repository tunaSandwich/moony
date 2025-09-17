import { Router } from 'express';
import healthRoutes from './health.js';
import plaidRoutes from './plaid.js';
import jobRoutes from './jobs.js';

const router = Router();

// Mount route modules
router.use('/', healthRoutes);
router.use('/api', plaidRoutes);
router.use('/api', jobRoutes);

export default router;