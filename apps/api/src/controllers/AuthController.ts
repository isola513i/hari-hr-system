import { Request, Response } from "express";
import AuthService from "../services/AuthService";

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const authResponse = await AuthService.login({ email, password });
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
}

export default new AuthController();
