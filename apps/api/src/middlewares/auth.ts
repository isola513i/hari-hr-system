import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Security: Fail fast if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

// User roles
export type UserRole = 'HR_ADMIN' | 'EMPLOYEE';

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

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
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
 * Middleware to check if user can access their own resource or is admin
 */
export const requireOwnerOrAdmin = (getResourceOwnerId: (req: Request) => string | null) => {
    return (req: Request, res: Response, next: NextFunction) => {
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
