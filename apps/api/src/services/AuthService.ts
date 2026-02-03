import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db";
import {
  User,
  LoginCredentials,
  AuthResponse,
  ChangePasswordRequest,
  RegisterRequest,
} from "../models/User";
import NotificationService from "./NotificationService";

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

  /**
   * Self-registration for employees added by HR Admin
   * Employee must exist in employees table but NOT in users table
   */
  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { email, password, confirmPassword } = registerData;

    // 1. Validate passwords match
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    // 2. Validate password complexity
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // 3. Check if employee exists (added by HR Admin)
    const employeeResult = await query(
      "SELECT * FROM employees WHERE email = $1",
      [email]
    );

    if (employeeResult.rows.length === 0) {
      throw new Error("Email not found. Please contact HR to be added to the system.");
    }

    const employee = employeeResult.rows[0];

    // 4. Check if user account already exists
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Account already registered. Please login instead.");
    }

    // 5. Create user account
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, hashedPassword, "EMPLOYEE"]
    );

    const newUser = userResult.rows[0];

    // 6. Link employee to user
    await query(
      "UPDATE employees SET user_id = $1 WHERE id = $2",
      [newUser.id, employee.id]
    );

    // 7. Create welcome notification for new user
    try {
      await NotificationService.create({
        user_id: newUser.id,
        title: "Welcome to the team!",
        message: `Hi ${employee.name}, your account has been set up successfully. Explore the HR portal to get started.`,
        type: "success",
        link: "/",
      });

      // 8. Notify HR admins about the new registration
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

    // 9. Generate JWT token and return
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        employeeId: employee.id,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    const userResponse: User = {
      userId: newUser.id,
      employeeId: employee.id,
      email: newUser.email,
      name: employee.name,
      role: newUser.role,
      avatar: employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random`,
      jobTitle: employee.role,
      department: employee.department,
    };

    return {
      token,
      user: userResponse,
    };
  }

  /**
   * Check if email can register (exists in employees but not in users)
   */
  async checkEmailEligibility(email: string): Promise<{ eligible: boolean; message: string; employeeName?: string }> {
    // Check if employee exists
    const employeeResult = await query(
      "SELECT name FROM employees WHERE email = $1",
      [email]
    );

    if (employeeResult.rows.length === 0) {
      return {
        eligible: false,
        message: "Email not found in the system. Please contact HR."
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

    return {
      eligible: true,
      message: "Email eligible for registration",
      employeeName: employeeResult.rows[0].name
    };
  }
}

export default new AuthService();
