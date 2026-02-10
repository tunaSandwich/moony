import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const authController = new AuthController();

// GET /api/auth/session - Get current session + onboarding state
router.get('/session', authenticateJWT, authController.getSession);

// POST /api/auth/logout - Clear session cookie
router.post('/logout', authController.logout);

export default router;
