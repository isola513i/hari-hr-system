"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnerOrAdmin = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Security: Fail fast if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
/**
 * Middleware to authenticate JWT token from Authorization header
 * Expects format: "Bearer <token>"
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        // Type assertion: we know the structure of our JWT payload
        req.user = decoded;
        next();
    });
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware to require specific role(s) for access
 * Must be used AFTER authenticateToken
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to check if user is HR Admin
 */
exports.requireAdmin = (0, exports.requireRole)('HR_ADMIN');
/**
 * Middleware to check if user can access their own resource or is admin
 */
const requireOwnerOrAdmin = (getResourceOwnerId) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const resourceOwnerId = getResourceOwnerId(req);
        const isOwner = req.user.employeeId === resourceOwnerId || req.user.userId === resourceOwnerId;
        const isAdmin = req.user.role === 'HR_ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only access your own resources or must be an admin'
            });
        }
        next();
    };
};
exports.requireOwnerOrAdmin = requireOwnerOrAdmin;
