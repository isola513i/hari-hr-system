import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authLimiter, validateLogin, validateRequest } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// POST /api/auth/login - User login
router.post('/login', authLimiter, validateLogin, validateRequest, AuthController.login.bind(AuthController));

// POST /api/auth/change-password - Change password (protected)
router.post('/change-password', authenticateToken, AuthController.changePassword.bind(AuthController));

export default router;
