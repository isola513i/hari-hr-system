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

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change the authenticated user's password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/auth/change-password - Change password (protected)
router.post(
  "/change-password",
  authenticateToken,
  AuthController.changePassword.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Self-register an employee account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 *       429: { description: Too many attempts }
 */
// POST /api/auth/register - Self-registration for employees
router.post(
  "/register",
  authLimiter,
  AuthController.register.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 *       400: { description: Validation error }
 *       429: { description: Too many attempts }
 */
// POST /api/auth/forgot-password - Request password reset
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateForgotPassword,
  validateRequest,
  AuthController.forgotPassword.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a one-time token from email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400: { description: Validation error or invalid token }
 *       429: { description: Too many attempts }
 */
// POST /api/auth/reset-password - Reset password with token
router.post(
  "/reset-password",
  authLimiter,
  validateResetPassword,
  validateRequest,
  AuthController.resetPassword.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh an access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token issued
 *       401: { description: Invalid or expired refresh token }
 *       429: { description: Too many attempts }
 */
// POST /api/auth/refresh - Refresh access token (no auth required — token is expired)
router.post(
  "/refresh",
  authLimiter,
  AuthController.refresh.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Revoke a refresh token to log out
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400: { description: Missing refresh token }
 */
// POST /api/auth/logout - Revoke refresh token (no auth required — token may be expired)
router.post(
  "/logout",
  AuthController.logout.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/check-email:
 *   get:
 *     summary: Check if an email is eligible for self-registration
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema: { type: string, format: email }
 *         description: Email address to check
 *     responses:
 *       200:
 *         description: Eligibility status returned
 *       400: { description: Missing or invalid email }
 *       429: { description: Too many attempts }
 */
// GET /api/auth/check-email - Check if email is eligible for registration
router.get(
  "/check-email",
  authLimiter,
  AuthController.checkEmail.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/notification-preferences:
 *   patch:
 *     summary: Update the authenticated user's notification preferences
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications: { type: boolean }
 *               pushNotifications: { type: boolean }
 *               smsNotifications: { type: boolean }
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// PATCH /api/auth/notification-preferences - Update notification preferences (protected)
router.patch(
  "/notification-preferences",
  authenticateToken,
  AuthController.updateNotificationPreferences.bind(AuthController),
);

// ── 2FA / TOTP Routes ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   get:
 *     summary: Generate a TOTP QR code and secret (not yet persisted)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP secret and QR code URI returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret: { type: string }
 *                 otpauthUrl: { type: string }
 *                 qrCodeDataUrl: { type: string }
 *       401: { description: Unauthorized }
 */
// GET  /api/auth/2fa/setup — generate QR code + secret (not yet persisted)
router.get(
  "/2fa/setup",
  authenticateToken,
  AuthController.setupTotp.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/2fa/enable:
 *   post:
 *     summary: Verify first TOTP code, persist secret, and return backup codes
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [secret, code]
 *             properties:
 *               secret: { type: string, description: Secret from /2fa/setup }
 *               code: { type: string, description: 6-digit TOTP code }
 *     responses:
 *       200:
 *         description: 2FA enabled; backup codes returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backupCodes: { type: array, items: { type: string } }
 *       400: { description: Invalid TOTP code }
 *       401: { description: Unauthorized }
 */
// POST /api/auth/2fa/enable — verify first code + persist secret + return backup codes
router.post(
  "/2fa/enable",
  authenticateToken,
  AuthController.enableTotp.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA for the authenticated user (requires current password)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400: { description: Incorrect password }
 *       401: { description: Unauthorized }
 */
// POST /api/auth/2fa/disable — self-service disable (requires current password)
router.post(
  "/2fa/disable",
  authenticateToken,
  AuthController.disableTotp.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/2fa/status:
 *   get:
 *     summary: Get 2FA enabled status and remaining backup code count
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled: { type: boolean }
 *                 backupCodesRemaining: { type: number }
 *       401: { description: Unauthorized }
 */
// GET  /api/auth/2fa/status — get 2FA enabled status + backup code count
router.get(
  "/2fa/status",
  authenticateToken,
  AuthController.getTotpStatus.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/2fa/backup-codes:
 *   post:
 *     summary: Regenerate backup codes (requires a valid active TOTP code)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, description: Current 6-digit TOTP code }
 *     responses:
 *       200:
 *         description: New backup codes returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backupCodes: { type: array, items: { type: string } }
 *       400: { description: Invalid TOTP code }
 *       401: { description: Unauthorized }
 *       429: { description: Too many attempts }
 */
// POST /api/auth/2fa/backup-codes — regenerate backup codes (requires active TOTP code)
router.post(
  "/2fa/backup-codes",
  authenticateToken,
  backupCodeLimiter,
  AuthController.regenerateBackupCodes.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Complete the TOTP login step with a one-time code or backup code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [totpSessionToken, code]
 *             properties:
 *               totpSessionToken: { type: string, description: Temporary token from login challenge }
 *               code: { type: string, description: 6-digit TOTP code or backup code }
 *     responses:
 *       200:
 *         description: Login completed; access and refresh tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401: { description: Invalid or expired code }
 *       429: { description: Too many attempts }
 */
// POST /api/auth/2fa/verify — public, rate-limited: complete the TOTP login step
router.post(
  "/2fa/verify",
  authLimiter,
  AuthController.verifyTotpLogin.bind(AuthController),
);

/**
 * @swagger
 * /api/auth/2fa/admin-reset:
 *   post:
 *     summary: Emergency 2FA reset for any user (HR_ADMIN only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 2FA reset for the target user
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — HR_ADMIN role required }
 *       404: { description: User not found }
 */
// POST /api/auth/2fa/admin-reset — HR_ADMIN only: emergency 2FA reset for any user
router.post(
  "/2fa/admin-reset",
  authenticateToken,
  requireRole("HR_ADMIN"),
  AuthController.adminResetTotp.bind(AuthController),
);

export default router;
