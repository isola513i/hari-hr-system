import { Router } from "express";
import AuthController from "../controllers/AuthController";
import {
  authLimiter,
  forgotPasswordLimiter,
  backupCodeLimiter,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateRequest,
} from "../middlewares/security";
import { authenticateToken, requireRole } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate and receive a JWT (or a TOTP challenge)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Login success (token) or TOTP required }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many attempts }
 */
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

// POST /api/auth/forgot-password - Request password reset
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateForgotPassword,
  validateRequest,
  AuthController.forgotPassword.bind(AuthController),
);

// POST /api/auth/reset-password - Reset password with token
router.post(
  "/reset-password",
  authLimiter,
  validateResetPassword,
  validateRequest,
  AuthController.resetPassword.bind(AuthController),
);

// POST /api/auth/refresh - Refresh access token (no auth required — token is expired)
router.post(
  "/refresh",
  authLimiter,
  AuthController.refresh.bind(AuthController),
);

// POST /api/auth/logout - Revoke refresh token (no auth required — token may be expired)
router.post(
  "/logout",
  AuthController.logout.bind(AuthController),
);

// GET /api/auth/check-email - Check if email is eligible for registration
router.get(
  "/check-email",
  authLimiter,
  AuthController.checkEmail.bind(AuthController),
);

// PATCH /api/auth/notification-preferences - Update notification preferences (protected)
router.patch(
  "/notification-preferences",
  authenticateToken,
  AuthController.updateNotificationPreferences.bind(AuthController),
);

// ── 2FA / TOTP Routes ───────────────────────────────────────────────────────

// GET  /api/auth/2fa/setup — generate QR code + secret (not yet persisted)
router.get(
  "/2fa/setup",
  authenticateToken,
  AuthController.setupTotp.bind(AuthController),
);

// POST /api/auth/2fa/enable — verify first code + persist secret + return backup codes
router.post(
  "/2fa/enable",
  authenticateToken,
  AuthController.enableTotp.bind(AuthController),
);

// POST /api/auth/2fa/disable — self-service disable (requires current password)
router.post(
  "/2fa/disable",
  authenticateToken,
  AuthController.disableTotp.bind(AuthController),
);

// GET  /api/auth/2fa/status — get 2FA enabled status + backup code count
router.get(
  "/2fa/status",
  authenticateToken,
  AuthController.getTotpStatus.bind(AuthController),
);

// POST /api/auth/2fa/backup-codes — regenerate backup codes (requires active TOTP code)
router.post(
  "/2fa/backup-codes",
  authenticateToken,
  backupCodeLimiter,
  AuthController.regenerateBackupCodes.bind(AuthController),
);

// POST /api/auth/2fa/verify — public, rate-limited: complete the TOTP login step
router.post(
  "/2fa/verify",
  authLimiter,
  AuthController.verifyTotpLogin.bind(AuthController),
);

// POST /api/auth/2fa/admin-reset — HR_ADMIN only: emergency 2FA reset for any user
router.post(
  "/2fa/admin-reset",
  authenticateToken,
  requireRole("HR_ADMIN"),
  AuthController.adminResetTotp.bind(AuthController),
);

export default router;
