import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  generateSecret as totpGenerateSecret,
  generateSync as totpGenerateSync,
  verifySync as totpVerifySync,
  generateURI as totpGenerateURI,
} from "otplib";
import QRCode from "qrcode";
import { query } from "../db";
import {
  User,
  LoginCredentials,
  AuthResponse,
  LoginResult,
  ChangePasswordRequest,
  RegisterRequest,
} from "../models/User";
import NotificationService from "./NotificationService";
import EmailService from "./EmailService";
import { encrypt, decrypt } from "../utils/encryption";

// ── TOTP Configuration ────────────────────────────────────────────────────────
// Clock-drift tolerance (±1 step = ±30 s) is passed directly to verifySync().

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

// Password complexity requirements.
// Lookaheads require at least one lowercase, uppercase, digit, and special char
// from the recognised set; the trailing `.+$` makes the pattern span the WHOLE
// string. The previous pattern ended in an unquantified, unanchored character
// class, so it only checked the FIRST character — letting it both accept
// passwords that should fail and reject valid ones starting with an unlisted
// character. Minimum length is enforced separately by PASSWORD_MIN_LENGTH.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/;

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

  async login(credentials: LoginCredentials, rememberMe?: boolean): Promise<LoginResult> {
    const { email, password } = credentials;

    // 1. Find User in users table
    const userResult = await query("SELECT id, email, password_hash, role, email_notifications, totp_enabled, totp_secret FROM users WHERE email = $1", [
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

    // 3. If 2FA is enabled, do NOT issue the full token pair yet.
    //    Return a short-lived "pending" JWT so the frontend can submit the
    //    TOTP code via POST /auth/2fa/verify to complete authentication.
    if (user.totp_enabled) {
      // The pending token deliberately carries ONLY userId + totp_pending — no
      // role/email — so authenticateToken's claim validation rejects it on any
      // protected route even if its explicit totp_pending guard were removed.
      const pendingToken = jwt.sign(
        { userId: user.id, totp_pending: true },
        JWT_SECRET,
        { expiresIn: "5m" },
      );
      // Returned as a distinct TotpPendingResponse (not cast to AuthResponse):
      // the frontend detects `totp_required` and completes 2FA before any real
      // token is issued.
      return { totp_required: true, pending_token: pendingToken };
    }

    // 4. Get Employee Info (for frontend convenience)
    const empResult = await query(
      "SELECT id, name, role, department, avatar, bio, phone FROM employees WHERE user_id = $1",
      [user.id],
    );
    const employee = empResult.rows[0] || {};

    // 5. Generate token pair
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
    const result = await query("SELECT id, email, password_hash, role, email_notifications, totp_enabled, totp_secret FROM users WHERE id = $1", [userId]);

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
      "SELECT id, name, email FROM employees WHERE email = $1",
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

  // ─────────────────────────────────────────────────────────────────────────
  // TOTP / 2FA METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a new TOTP secret + QR code for display in the setup wizard.
   * The secret is NOT stored yet — it is only persisted after the user
   * verifies the first code via enableTotp().
   */
  async setupTotp(userId: string): Promise<{ secret: string; qrCodeDataUrl: string; manualKey: string }> {
    const result = await query("SELECT email FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }
    const { email } = result.rows[0];

    const secret = totpGenerateSecret();
    const otpAuthUrl = totpGenerateURI({ label: email, issuer: "HARI HR", secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return { secret, qrCodeDataUrl, manualKey: secret };
  }

  /**
   * Verify the user's first TOTP code and enable 2FA.
   * Encrypts + stores the secret, then generates 8 backup codes.
   * Returns the plaintext backup codes (shown once, never again).
   */
  async enableTotp(userId: string, secret: string, token: string): Promise<string[]> {
    const { valid: isValid } = totpVerifySync({ token, secret, epochTolerance: 30 });
    if (!isValid) {
      throw new Error("Invalid verification code. Please try again.");
    }

    const encryptedSecret = encrypt(secret);
    await query(
      `UPDATE users SET totp_enabled = TRUE, totp_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [encryptedSecret, userId],
    );

    return this._generateAndStoreBackupCodes(userId);
  }

  /**
   * Disable 2FA for the calling user. Requires their current password.
   */
  async disableTotp(userId: string, password: string): Promise<void> {
    const result = await query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isPasswordValid) {
      throw new Error("Incorrect password");
    }

    await query(
      `UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId],
    );
    await query(`DELETE FROM totp_backup_codes WHERE user_id = $1`, [userId]);
  }

  /**
   * HR_ADMIN emergency reset — disable 2FA for any user without their password.
   * Intended for account recovery when a user loses their authenticator device.
   */
  async adminDisableTotp(targetUserId: string): Promise<void> {
    const result = await query("SELECT id FROM users WHERE id = $1", [targetUserId]);
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    await query(
      `UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [targetUserId],
    );
    await query(`DELETE FROM totp_backup_codes WHERE user_id = $1`, [targetUserId]);
  }

  /**
   * Complete the TOTP login step.
   * Accepts either a 6-digit TOTP code or a single-use backup code.
   * Validates the pending JWT issued by login(), then issues the full token pair.
   */
  async verifyTotpLogin(pendingToken: string, code: string, rememberMe?: boolean): Promise<AuthResponse> {
    // Validate the short-lived pending JWT
    let decoded: { userId?: string; totp_pending?: boolean };
    try {
      decoded = jwt.verify(pendingToken, JWT_SECRET) as { userId?: string; totp_pending?: boolean };
    } catch {
      throw new Error("Pending session expired. Please login again.");
    }

    if (!decoded.totp_pending || !decoded.userId) {
      throw new Error("Invalid pending token.");
    }

    const userResult = await query("SELECT id, email, password_hash, role, email_notifications, totp_enabled, totp_secret FROM users WHERE id = $1", [decoded.userId]);
    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }
    const user = userResult.rows[0];

    if (!user.totp_enabled || !user.totp_secret) {
      throw new Error("Two-factor authentication is not enabled for this account.");
    }

    const secret = decrypt(user.totp_secret);
    let verified = false;

    // Try as a 6-digit TOTP code first
    if (/^\d{6}$/.test(code.trim())) {
      verified = totpVerifySync({ token: code.trim(), secret, epochTolerance: 30 }).valid;
    }

    // Fall back to backup code check
    if (!verified) {
      const normalizedCode = code.trim().toUpperCase();
      const unusedCodes = await query(
        `SELECT id, code_hash FROM totp_backup_codes WHERE user_id = $1 AND used_at IS NULL`,
        [user.id],
      );

      for (const row of unusedCodes.rows) {
        const match = await bcrypt.compare(normalizedCode, row.code_hash);
        if (match) {
          await query(`UPDATE totp_backup_codes SET used_at = NOW() WHERE id = $1`, [row.id]);
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      throw new Error("Invalid verification code.");
    }

    // Issue the full token pair
    const empResult = await query(
      "SELECT id, name, role, department, avatar, bio, phone FROM employees WHERE user_id = $1",
      [user.id],
    );
    const employee = empResult.rows[0] || {};

    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee.id || null,
    };
    const { accessToken, refreshToken } = await this.generateTokenPair(jwtPayload, rememberMe);

    const userResponse: User = {
      userId: user.id,
      employeeId: employee.id || user.id,
      email: user.email,
      name: employee.name || user.email,
      role: user.role,
      avatar:
        employee.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || user.email)}&background=random`,
      jobTitle: employee.role,
      department: employee.department,
      bio: employee.bio,
      phone: employee.phone,
      emailNotifications: user.email_notifications ?? true,
    };

    return { token: accessToken, accessToken, refreshToken, user: userResponse };
  }

  /**
   * Get 2FA status for the current user.
   */
  async getTotpStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    const userResult = await query("SELECT totp_enabled FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const codesResult = await query(
      `SELECT COUNT(*) AS count FROM totp_backup_codes WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );

    return {
      enabled: userResult.rows[0].totp_enabled,
      backupCodesRemaining: parseInt(codesResult.rows[0].count, 10),
    };
  }

  /**
   * Regenerate backup codes. Requires an active TOTP code.
   * Deletes all existing codes and creates 8 fresh ones.
   */
  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const result = await query("SELECT totp_enabled, totp_secret FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const { totp_enabled, totp_secret } = result.rows[0];
    if (!totp_enabled || !totp_secret) {
      throw new Error("Two-factor authentication is not enabled.");
    }

    const secret = decrypt(totp_secret);
    if (!totpVerifySync({ token, secret, epochTolerance: 30 }).valid) {
      throw new Error("Invalid verification code.");
    }

    await query(`DELETE FROM totp_backup_codes WHERE user_id = $1`, [userId]);
    return this._generateAndStoreBackupCodes(userId);
  }

  /**
   * Internal helper: generate 8 backup codes, hash, and persist them.
   * Returns the plaintext codes.
   */
  private async _generateAndStoreBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const raw = crypto.randomBytes(10).toString("base64url").slice(0, 10).toUpperCase();
      codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
    }

    for (const code of codes) {
      const codeHash = await bcrypt.hash(code, 10);
      await query(
        `INSERT INTO totp_backup_codes (user_id, code_hash) VALUES ($1, $2)`,
        [userId, codeHash],
      );
    }

    return codes;
  }
}

export default new AuthService();
