import { Router } from 'express';
import { GoalsController } from '../controllers/goalsController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const goalsController = new GoalsController();

// All goals routes require authentication
router.use(authenticateJWT);

// POST /api/goals/set - Set spending goal
router.post('/set', goalsController.setSpendingGoal);

// GET /api/goals/current - Get current active goal
router.get('/current', goalsController.getCurrentGoal);

export default router;