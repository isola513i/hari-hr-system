import { Request, Response } from "express";
import AuthService from "../services/AuthService";

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
      console.error("Login error:", error);
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
      console.error("Change password error:", error);
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
      console.error("Registration error:", error);
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
      console.error("Forgot password error:", error);
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
      console.error("Reset password error:", error);
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
      console.error("Token refresh error:", error);
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
      console.error("Logout error:", error);
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
      console.error("Check email error:", error);
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
      console.error("Update notification preferences error:", error);
      res.status(500).json({ error: error.message || "Failed to update preferences" });
    }
  }
}

export default new AuthController();
