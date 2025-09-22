import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const userController = new UserController();

// All user routes require authentication
router.use(authenticateJWT);

// User profile routes
router.get('/profile', userController.getCurrentUser);

export default router;