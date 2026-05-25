import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Security: Fail fast if JWT_SECRET is not set or too weak
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters long');
    process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

// User roles
export type UserRole = 'HR_ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'FINANCE';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: UserRole;
                employeeId: string | null;
            };
        }
    }
}

/**
 * Middleware to authenticate JWT token from Authorization header
 * Expects format: "Bearer <token>"
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err: jwt.VerifyErrors | null, decoded: unknown) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Defense-in-depth: explicitly block TOTP pending tokens from all
        // protected routes. These short-lived tokens (issued after password
        // validation but BEFORE 2FA verification) must only be accepted by
        // POST /auth/2fa/verify — which is a public endpoint and never calls
        // authenticateToken. If this check were ever removed, the role
        // validation below would still reject such tokens (they carry no role),
        // but an explicit 403 is clearer for developers and audit logs.
        if (
            decoded &&
            typeof decoded === 'object' &&
            (decoded as Record<string, unknown>).totp_pending === true
        ) {
            return res.status(403).json({
                error: 'Two-factor authentication required. Please complete 2FA verification.',
                code: 'TOTP_PENDING',
            });
        }

        // Runtime validation — reject tokens with missing or malformed claims
        const VALID_ROLES: UserRole[] = ['HR_ADMIN', 'EMPLOYEE', 'MANAGER', 'FINANCE'];
        if (
            !decoded ||
            typeof decoded !== 'object' ||
            typeof (decoded as Record<string, unknown>).userId !== 'string' ||
            typeof (decoded as Record<string, unknown>).email !== 'string' ||
            !VALID_ROLES.includes((decoded as Record<string, unknown>).role as UserRole)
        ) {
            return res.status(401).json({ error: 'Invalid token claims' });
        }

        req.user = decoded as {
            userId: string;
            email: string;
            role: UserRole;
            employeeId: string | null;
        };
        next();
    });
};

/**
 * Middleware to require specific role(s) for access
 * Must be used AFTER authenticateToken
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
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

/**
 * Middleware to check if user is HR Admin
 */
export const requireAdmin = requireRole('HR_ADMIN');

/**
 * Middleware to check if user is HR Admin or Finance
 */
export const requireAdminOrFinance = requireRole('HR_ADMIN', 'FINANCE');

/**
 * Middleware to check if user is HR Admin or Manager
 */
export const requireAdminOrManager = requireRole('HR_ADMIN', 'MANAGER');

/**
 * Middleware to check if user can access their own resource or is admin
 */
export const requireOwnerOrAdmin = (getResourceOwnerId: (req: Request) => string | null) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const resourceOwnerId = getResourceOwnerId(req);
        const isOwner = req.user.employeeId === resourceOwnerId || req.user.userId === resourceOwnerId;
        const isAdmin = req.user.role === 'HR_ADMIN' || req.user.role === 'FINANCE';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only access your own resources or must be an admin'
            });
        }

        next();
    };
};
