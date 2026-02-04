"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const NotificationService_1 = __importDefault(require("./NotificationService"));
// Security: Fail fast if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not set");
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
// Password complexity requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
/**
 * Validates password complexity
 */
function validatePasswordComplexity(password) {
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
class AuthService {
    login(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = credentials;
            // 1. Find User in users table
            const userResult = yield (0, db_1.query)("SELECT * FROM users WHERE email = $1", [
                email,
            ]);
            if (userResult.rows.length === 0) {
                throw new Error("Invalid credentials");
            }
            const user = userResult.rows[0];
            // 2. Verify password
            const isPasswordValid = yield bcrypt_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                throw new Error("Invalid credentials");
            }
            // 3. Get Employee Info (for frontend convenience)
            const empResult = yield (0, db_1.query)("SELECT id, name, role, department, avatar, bio, phone FROM employees WHERE user_id = $1", [user.id]);
            const employee = empResult.rows[0] || {};
            // 4. Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                role: user.role,
                employeeId: employee.id || null,
            }, JWT_SECRET, { expiresIn: "8h" });
            // Return user info (without password)
            const userResponse = {
                userId: user.id,
                employeeId: employee.id || user.id,
                email: user.email,
                name: employee.name || email,
                role: user.role,
                avatar: employee.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || email)}&background=random`,
                jobTitle: employee.role,
                department: employee.department,
                bio: employee.bio,
                phone: employee.phone,
            };
            return {
                token,
                user: userResponse,
            };
        });
    }
    changePassword(userId, passwordData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { currentPassword, newPassword } = passwordData;
            // Validate new password complexity
            const passwordValidation = validatePasswordComplexity(newPassword);
            if (!passwordValidation.valid) {
                throw new Error(passwordValidation.message);
            }
            // Get current user from users table
            const result = yield (0, db_1.query)("SELECT * FROM users WHERE id = $1", [userId]);
            if (result.rows.length === 0) {
                throw new Error("User not found");
            }
            const user = result.rows[0];
            // Verify current password
            const isPasswordValid = yield bcrypt_1.default.compare(currentPassword, user.password_hash);
            if (!isPasswordValid) {
                throw new Error("Current password is incorrect");
            }
            // Prevent reusing the same password
            const isSamePassword = yield bcrypt_1.default.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new Error("New password must be different from current password");
            }
            // Hash new password
            const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
            // Update password in users table
            yield (0, db_1.query)("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [hashedPassword, userId]);
        });
    }
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw new Error("Invalid token");
        }
    }
    /**
     * Self-registration for @aiya.ai employees
     * Creates employee record if not exists
     */
    register(registerData) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const existingUser = yield (0, db_1.query)("SELECT id FROM users WHERE email = $1", [email]);
            if (existingUser.rows.length > 0) {
                throw new Error("Account already registered. Please login instead.");
            }
            // 5. Check if employee exists, if not create one
            let employeeResult = yield (0, db_1.query)("SELECT * FROM employees WHERE email = $1", [email]);
            let employee;
            if (employeeResult.rows.length === 0) {
                // Create new employee record
                const name = email.split("@")[0].replace(/[._]/g, " ").split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                employeeResult = yield (0, db_1.query)(`INSERT INTO employees (name, email, status, join_date)
         VALUES ($1, $2, 'Active', CURRENT_DATE)
         RETURNING *`, [name, email]);
                employee = employeeResult.rows[0];
            }
            else {
                employee = employeeResult.rows[0];
            }
            // 6. Create user account
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            const userResult = yield (0, db_1.query)(`INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING *`, [email, hashedPassword, "EMPLOYEE"]);
            const newUser = userResult.rows[0];
            // 7. Link employee to user
            yield (0, db_1.query)("UPDATE employees SET user_id = $1 WHERE id = $2", [newUser.id, employee.id]);
            // 8. Create welcome notification for new user
            try {
                yield NotificationService_1.default.create({
                    user_id: newUser.id,
                    title: "Welcome to the team!",
                    message: `Hi ${employee.name}, your account has been set up successfully. Explore the HR portal to get started.`,
                    type: "success",
                    link: "/",
                });
                // 9. Notify HR admins about the new registration
                yield NotificationService_1.default.notifyAdmins({
                    title: "New Employee Registered",
                    message: `${employee.name} (${email}) has completed their account registration.`,
                    type: "employee",
                    link: `/employees/${employee.id}`,
                });
            }
            catch (notifError) {
                // Don't fail registration if notification fails
                console.error("Failed to create notifications:", notifError);
            }
            // 10. Generate JWT token and return
            const token = jsonwebtoken_1.default.sign({
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role,
                employeeId: employee.id,
            }, JWT_SECRET, { expiresIn: "8h" });
            const userResponse = {
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
                token,
                user: userResponse,
            };
        });
    }
    /**
     * Check if email can register (must be @aiya.ai domain)
     */
    checkEmailEligibility(email) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if email is from @aiya.ai domain
            if (!email.endsWith("@aiya.ai")) {
                return {
                    eligible: false,
                    message: "Only @aiya.ai email addresses are allowed."
                };
            }
            // Check if already registered
            const userResult = yield (0, db_1.query)("SELECT id FROM users WHERE email = $1", [email]);
            if (userResult.rows.length > 0) {
                return {
                    eligible: false,
                    message: "Account already registered. Please login."
                };
            }
            // Check if employee exists (optional, for name display)
            const employeeResult = yield (0, db_1.query)("SELECT name FROM employees WHERE email = $1", [email]);
            return {
                eligible: true,
                message: "Email eligible for registration",
                employeeName: employeeResult.rows.length > 0 ? employeeResult.rows[0].name : undefined
            };
        });
    }
}
exports.AuthService = AuthService;
exports.default = new AuthService();
