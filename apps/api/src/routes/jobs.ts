import { Router } from 'express';
import { JobController } from '../controllers/jobController.js';
import { jobRateLimit } from '../middleware/security.js';

const router = Router();
const jobController = new JobController();

// Trigger daily job manually (for testing and manual execution)
router.post('/run-now', jobRateLimit, jobController.triggerDailyJob);

export default router;