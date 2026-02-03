import { Router } from "express";
import AuthController from "../controllers/AuthController";
import {
  authLimiter,
  validateLogin,
  validateRequest,
} from "../middlewares/security";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// POST /api/auth/login - User login
router.post(
  "/login",
  authLimiter,
  validateLogin,
  validateRequest,
  AuthController.login.bind(AuthController),
);

// POST /api/auth/change-password - Change password (protected)
router.post(
  "/change-password",
  authenticateToken,
  AuthController.changePassword.bind(AuthController),
);

// POST /api/auth/register - Self-registration for employees
router.post(
  "/register",
  authLimiter,
  AuthController.register.bind(AuthController),
);

// GET /api/auth/check-email - Check if email is eligible for registration
router.get(
  "/check-email",
  authLimiter,
  AuthController.checkEmail.bind(AuthController),
);

export default router;
