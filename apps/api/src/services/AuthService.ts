import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db";
import {
  User,
  LoginCredentials,
  AuthResponse,
  ChangePasswordRequest,
} from "../models/User";

// Security: Fail fast if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");
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
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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
      "SELECT id, name, role, department, avatar FROM employees WHERE user_id = $1",
      [user.id],
    );
    const employee = empResult.rows[0] || {};

    // 4. Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: employee.id || null,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

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
    };

    return {
      token,
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
}

export default new AuthService();
