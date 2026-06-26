import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import AuditLogService from "../services/AuditLogService";
import logger from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const authResponse = await AuthService.login({ email, password }, rememberMe);
      res.json(authResponse);
    } catch (error: any) {
      logger.error(error, "Login error:");
      res.status(401).json({ error: error.message || "Login failed" });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res
          .status(400)
          .json({ error: "Current and new password are required" });
        return;
      }

      if (newPassword.length < 8) {
        res
          .status(400)
          .json({ error: "New password must be at least 8 characters" });
        return;
      }

      await AuthService.changePassword(userId, {
        currentPassword,
        newPassword,
      });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      logger.error(error, "Change password error:");
      res
        .status(400)
        .json({ error: error.message || "Failed to change password" });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, confirmPassword } = req.body;

      if (!email || !password || !confirmPassword) {
        res.status(400).json({ error: "Email, password, and confirm password are required" });
        return;
      }

      const authResponse = await AuthService.register({ email, password, confirmPassword });
      res.status(201).json(authResponse);
    } catch (error: any) {
      logger.error(error, "Registration error:");
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const genericMessage =
      "If an account exists with this email, you will receive a password reset link shortly.";
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const lang = req.headers["accept-language"]?.split(",")[0]?.trim();
      await AuthService.forgotPassword(email, lang);
      res.json({ message: genericMessage });
    } catch (error: any) {
      // Always return same generic message to prevent user enumeration
      logger.error(error, "Forgot password error:");
      res.json({ message: genericMessage });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        res
          .status(400)
          .json({ error: "Token, new password, and confirm password are required" });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: "Passwords do not match" });
        return;
      }

      const lang = req.headers["accept-language"]?.split(",")[0]?.trim();
      await AuthService.resetPassword(token, newPassword, lang);
      res.json({ message: "Password has been reset successfully." });
    } catch (error: any) {
      logger.error(error, "Reset password error:");
      res
        .status(400)
        .json({ error: error.message || "Failed to reset password" });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: "Refresh token is required" });
        return;
      }

      const authResponse = await AuthService.refreshAccessToken(refreshToken);
      res.json(authResponse);
    } catch (error: any) {
      logger.error(error, "Token refresh error:");
      res.status(401).json({ error: error.message || "Token refresh failed" });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await AuthService.revokeRefreshToken(refreshToken);
      }

      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      // Always return success for logout (best-effort)
      logger.error(error, "Logout error:");
      res.json({ message: "Logged out successfully" });
    }
  }

  async checkEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const result = await AuthService.checkEmailEligibility(email);
      res.json(result);
    } catch (error: any) {
      logger.error(error, "Check email error:");
      res.status(500).json({ error: error.message || "Failed to check email" });
    }
  }

  async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { emailNotifications } = req.body;
      if (typeof emailNotifications !== 'boolean') {
        res.status(400).json({ error: "emailNotifications must be a boolean" });
        return;
      }
      await AuthService.updateNotificationPreferences(userId, emailNotifications);
      res.json({ message: "Notification preferences updated" });
    } catch (error: any) {
      logger.error(error, "Update notification preferences error:");
      res.status(500).json({ error: error.message || "Failed to update preferences" });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOTP / 2FA HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /** GET /auth/2fa/setup — generate QR code + secret (not yet persisted) */
  async setupTotp(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await AuthService.setupTotp(userId);
      res.json(result);
    } catch (error: any) {
      logger.error(error, "TOTP setup error:");
      res.status(500).json({ error: error.message || "Failed to setup 2FA" });
    }
  }

  /** POST /auth/2fa/enable — verify first code + persist secret + return backup codes */
  async enableTotp(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { secret, token } = req.body;

      if (!secret || !token) {
        res.status(400).json({ error: "secret and token are required" });
        return;
      }

      const backupCodes = await AuthService.enableTotp(userId, secret, token);
      res.json({ message: "Two-factor authentication enabled", backupCodes });
    } catch (error: any) {
      logger.error(error, "TOTP enable error:");
      res.status(400).json({ error: error.message || "Failed to enable 2FA" });
    }
  }

  /** POST /auth/2fa/disable — self-service disable (requires password) */
  async disableTotp(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: "password is required" });
        return;
      }

      await AuthService.disableTotp(userId, password);
      res.json({ message: "Two-factor authentication disabled" });
    } catch (error: any) {
      logger.error(error, "TOTP disable error:");
      res.status(400).json({ error: error.message || "Failed to disable 2FA" });
    }
  }

  /** POST /auth/2fa/admin-reset — HR_ADMIN emergency reset for any user */
  async adminResetTotp(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      const actor = (req as any).user;

      if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
      }

      await AuthService.adminDisableTotp(userId);

      // Audit trail: an admin disabling another user's 2FA is a sensitive,
      // security-relevant action and must be attributable to the actor.
      AuditLogService.create({
        userId: actor?.userId ?? null,
        userEmail: actor?.email ?? null,
        action: "TOTP_ADMIN_RESET",
        resource: `user:${userId}`,
        method: req.method,
        path: req.path,
        ip: req.ip ?? "",
        userAgent: req.headers["user-agent"] ?? "",
        success: true,
        details: { targetUserId: userId },
      });

      res.json({ message: "Two-factor authentication has been reset for the user" });
    } catch (error: any) {
      logger.error(error, "TOTP admin reset error:");
      res.status(400).json({ error: error.message || "Failed to reset 2FA" });
    }
  }

  /** POST /auth/2fa/verify — public, rate-limited: complete TOTP login */
  async verifyTotpLogin(req: Request, res: Response): Promise<void> {
    try {
      const { pending_token, code, rememberMe } = req.body;

      if (!pending_token || !code) {
        res.status(400).json({ error: "pending_token and code are required" });
        return;
      }

      const authResponse = await AuthService.verifyTotpLogin(pending_token, code, rememberMe);
      res.json(authResponse);
    } catch (error: any) {
      logger.error(error, "TOTP verify login error:");
      res.status(401).json({ error: error.message || "Verification failed" });
    }
  }

  /** GET /auth/2fa/status — get 2FA status + backup code count */
  async getTotpStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await AuthService.getTotpStatus(userId);
      res.json(status);
    } catch (error: any) {
      logger.error(error, "TOTP status error:");
      res.status(500).json({ error: error.message || "Failed to get 2FA status" });
    }
  }

  /** POST /auth/2fa/backup-codes — regenerate backup codes (requires active TOTP code) */
  async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: "token is required" });
        return;
      }

      const backupCodes = await AuthService.regenerateBackupCodes(userId, token);
      res.json({ message: "Backup codes regenerated", backupCodes });
    } catch (error: any) {
      logger.error(error, "TOTP backup codes error:");
      res.status(400).json({ error: error.message || "Failed to regenerate backup codes" });
    }
  }
}

export default new AuthController();
