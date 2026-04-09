import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../db";
import {
  User,
  LoginCredentials,
  AuthResponse,
  ChangePasswordRequest,
  RegisterRequest,
} from "../models/User";
import NotificationService from "./NotificationService";
import EmailService from "./EmailService";

// Security: Fail fast if JWT_SECRET is not set or too weak
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

// Password complexity requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/**
 * Validates password complexity
 */
function validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
    };
  }
  return { valid: true };
}

export class AuthService {
  /**
   * Generate an access + refresh token pair.
   * Access token: short-lived JWT (15 min).
   * Refresh token: opaque random bytes stored as SHA-256 hash in DB.
   */
  private async generateTokenPair(
    payload: { userId: string; email: string; role: string; employeeId: string | null },
    rememberMe?: boolean,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Short-lived access token
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

    // Opaque refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000); // 30d or 7d

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [payload.userId, tokenHash, expiresAt.toISOString()],
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async login(credentials: LoginCredentials, rememberMe?: boolean): Promise<AuthResponse> {
    const { email, password } = credentials;

    // 1. Find User in users table
    const userResult = await query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rows.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = userResult.rows[0];

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // 3. Get Employee Info (for frontend convenience)
    const empResult = await query(
      "SELECT id, name, role, department, avatar, bio, phone FROM employees WHERE user_id = $1",
      [user.id],
    );
    const employee = empResult.rows[0] || {};

    // 4. Generate token pair
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee.id || null,
    };
    const { accessToken, refreshToken } = await this.generateTokenPair(jwtPayload, rememberMe);

    // Return user info (without password)
    const userResponse: User = {
      userId: user.id,
      employeeId: employee.id || user.id,
      email: user.email,
      name: employee.name || email,
      role: user.role,
      avatar:
        employee.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || email)}&background=random`,
      jobTitle: employee.role,
      department: employee.department,
      bio: employee.bio,
      phone: employee.phone,
      emailNotifications: user.email_notifications ?? true,
    };

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  async changePassword(
    userId: string,
    passwordData: ChangePasswordRequest,
  ): Promise<void> {
    const { currentPassword, newPassword } = passwordData;

    // Validate new password complexity
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Get current user from users table
    const result = await query("SELECT * FROM users WHERE id = $1", [userId]);

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in users table
    await query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, userId],
    );
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  /**
   * Self-registration for @aiya.ai employees
   * Creates employee record if not exists
   */
  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { email, password, confirmPassword } = registerData;

    // 1. Validate email domain
    if (!email.endsWith("@aiya.ai")) {
      throw new Error("Only @aiya.ai email addresses are allowed.");
    }

    // 2. Validate passwords match
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    // 3. Validate password complexity
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // 4. Check if user account already exists
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Account already registered. Please login instead.");
    }

    // 5. Check if employee exists, if not create one
    let employeeResult = await query(
      "SELECT * FROM employees WHERE email = $1",
      [email]
    );

    let employee;
    if (employeeResult.rows.length === 0) {
      // Create new employee record
      const name = email.split("@")[0].replace(/[._]/g, " ").split(" ")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      employeeResult = await query(
        `INSERT INTO employees (name, email, status, join_date)
         VALUES ($1, $2, 'Active', CURRENT_DATE)
         RETURNING *`,
        [name, email]
      );
      employee = employeeResult.rows[0];
    } else {
      employee = employeeResult.rows[0];
    }

    // 6. Create user account
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, hashedPassword, "EMPLOYEE"]
    );

    const newUser = userResult.rows[0];

    // 7. Link employee to user
    await query(
      "UPDATE employees SET user_id = $1 WHERE id = $2",
      [newUser.id, employee.id]
    );

    // 8. Create welcome notification for new user
    try {
      await NotificationService.create({
        user_id: newUser.id,
        title: "Welcome to the team!",
        message: `Hi ${employee.name}, your account has been set up successfully. Explore the HR portal to get started.`,
        type: "success",
        link: "/",
      });

      // 9. Notify HR admins about the new registration
      await NotificationService.notifyAdmins({
        title: "New Employee Registered",
        message: `${employee.name} (${email}) has completed their account registration.`,
        type: "employee",
        link: `/employees/${employee.id}`,
      });
    } catch (notifError) {
      // Don't fail registration if notification fails
      console.error("Failed to create notifications:", notifError);
    }

    // 10. Generate token pair and return
    const jwtPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      employeeId: employee.id,
    };
    const { accessToken, refreshToken } = await this.generateTokenPair(jwtPayload);

    const userResponse: User = {
      userId: newUser.id,
      employeeId: employee.id,
      email: newUser.email,
      name: employee.name,
      role: newUser.role,
      avatar: employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random`,
      jobTitle: employee.role,
      department: employee.department,
      bio: employee.bio,
      phone: employee.phone,
    };

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  /**
   * Forgot password — generate reset token and send email.
   * Always returns silently to prevent user enumeration.
   */
  async forgotPassword(email: string, lang?: string): Promise<void> {
    // Look up user + employee name
    const result = await query(
      `SELECT u.id AS user_id, e.name
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      // No user found — return silently (no enumeration)
      return;
    }

    const { user_id, name } = result.rows[0];

    // Invalidate existing unused tokens for this user
    await query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [user_id],
    );

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user_id, tokenHash, expiresAt.toISOString()],
    );

    // Send email (silent fail — don't expose errors)
    try {
      await EmailService.sendPasswordResetEmail(email, token, name || undefined, lang);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string, lang?: string): Promise<void> {
    // Validate password complexity
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Hash incoming token and look up
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const result = await query(
      `SELECT prt.id AS token_id, prt.user_id, prt.used, prt.expires_at,
              u.password_hash, u.email, e.name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE prt.token_hash = $1`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid or expired reset link. Please request a new one.");
    }

    const row = result.rows[0];

    if (row.used) {
      throw new Error("This reset link has already been used. Please request a new one.");
    }

    if (new Date(row.expires_at) < new Date()) {
      throw new Error("This reset link has expired. Please request a new one.");
    }

    // Prevent same password reuse
    const isSamePassword = await bcrypt.compare(newPassword, row.password_hash);
    if (isSamePassword) {
      throw new Error("New password must be different from your current password.");
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hashedPassword, row.user_id],
    );

    // Mark token as used + invalidate all remaining tokens for this user
    await query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [row.user_id],
    );

    // Send confirmation email (non-blocking)
    EmailService.sendPasswordResetConfirmation(row.email, row.name || undefined, lang).catch(
      (err) => console.error("Failed to send reset confirmation email:", err),
    );
  }

  /**
   * Check if email can register (must be @aiya.ai domain)
   */
  async checkEmailEligibility(email: string): Promise<{ eligible: boolean; message: string; employeeName?: string }> {
    // Check if email is from @aiya.ai domain
    if (!email.endsWith("@aiya.ai")) {
      return {
        eligible: false,
        message: "Only @aiya.ai email addresses are allowed."
      };
    }

    // Check if already registered
    const userResult = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length > 0) {
      return {
        eligible: false,
        message: "Account already registered. Please login."
      };
    }

    // Check if employee exists (optional, for name display)
    const employeeResult = await query(
      "SELECT name FROM employees WHERE email = $1",
      [email]
    );

    return {
      eligible: true,
      message: "Email eligible for registration",
      employeeName: employeeResult.rows.length > 0 ? employeeResult.rows[0].name : undefined
    };
  }
  /**
   * Refresh access token using a valid refresh token.
   * Implements token rotation: old token is revoked, new pair is issued.
   * If a revoked token is reused, ALL user tokens are revoked (theft detection).
   */
  async refreshAccessToken(rawRefreshToken: string): Promise<AuthResponse> {
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    const result = await query(
      `SELECT rt.id, rt.user_id, rt.revoked, rt.expires_at,
              u.email, u.role, u.email_notifications
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid refresh token");
    }

    const row = result.rows[0];

    // Theft detection: if a revoked token is reused, revoke ALL tokens for this user
    if (row.revoked) {
      await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [row.user_id]);
      throw new Error("Refresh token reuse detected — all sessions revoked");
    }

    if (new Date(row.expires_at) < new Date()) {
      throw new Error("Refresh token expired");
    }

    // Revoke the old token (rotation)
    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [row.id]);

    // Look up employee info for the new token payload + response
    const empResult = await query(
      "SELECT id, name, role, department, avatar, bio, phone FROM employees WHERE user_id = $1",
      [row.user_id],
    );
    const employee = empResult.rows[0] || {};

    const jwtPayload = {
      userId: row.user_id,
      email: row.email,
      role: row.role,
      employeeId: employee.id || null,
    };

    const { accessToken, refreshToken } = await this.generateTokenPair(jwtPayload);

    const userResponse: User = {
      userId: row.user_id,
      employeeId: employee.id || row.user_id,
      email: row.email,
      name: employee.name || row.email,
      role: row.role,
      avatar:
        employee.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || row.email)}&background=random`,
      jobTitle: employee.role,
      department: employee.department,
      bio: employee.bio,
      phone: employee.phone,
      emailNotifications: row.email_notifications ?? true,
    };

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  async updateNotificationPreferences(userId: string, emailNotifications: boolean): Promise<void> {
    await query(
      "UPDATE users SET email_notifications = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [emailNotifications, userId],
    );
  }

  /**
   * Revoke a refresh token (used during logout).
   */
  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [tokenHash]);
  }
}

export default new AuthService();
