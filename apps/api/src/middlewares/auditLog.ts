import { Request, Response, NextFunction } from 'express';
import AuditLogService from '../services/AuditLogService';

export interface AuditLog {
    timestamp: string;
    userId: string | null;
    userEmail: string | null;
    action: string;
    resource: string;
    method: string;
    path: string;
    ip: string;
    userAgent: string;
    statusCode?: number;
    details?: Record<string, unknown>;
}

// In-memory cache for recent logs (for quick access, with DB persistence)
const recentLogs: AuditLog[] = [];
const MAX_RECENT_LOGS = 100;

// Actions that should be audited
const auditableActions = [
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'POST /api/auth/change-password',
    'POST /api/employees',
    'PUT /api/employees',
    'DELETE /api/employees',
    'POST /api/documents',
    'DELETE /api/documents',
    'POST /api/leave-requests',
    'PUT /api/leave-requests',
    'PATCH /api/leave-requests',
    'DELETE /api/leave-requests',
    'POST /api/system/seed',
];

export const auditLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.json;

    // Override res.json to capture response
    res.json = function (data: unknown) {
        // Check if this route should be audited
        const shouldAudit = auditableActions.some(route => {
            const [method, path] = route.split(' ');
            return req.method === method && req.path.startsWith(path);
        });

        if (shouldAudit) {
            const duration = Date.now() - startTime;
            const log: AuditLog = {
                timestamp: new Date().toISOString(),
                userId: req.user?.userId || null,
                userEmail: req.user?.email || null,
                action: getActionDescription(req.method, req.path),
                resource: getResourceName(req.path),
                method: req.method,
                path: req.path,
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
                statusCode: res.statusCode,
                details: {
                    duration,
                    body: sanitizeBody(req.body),
                    success: res.statusCode < 400,
                }
            };

            // Add to in-memory cache for quick access
            recentLogs.push(log);
            if (recentLogs.length > MAX_RECENT_LOGS) {
                recentLogs.shift();
            }

            // Persist to database (async, non-blocking)
            AuditLogService.create({
                userId: log.userId,
                userEmail: log.userEmail,
                action: log.action,
                resource: log.resource,
                method: log.method,
                path: log.path,
                ip: log.ip,
                userAgent: log.userAgent,
                statusCode: log.statusCode,
                duration,
                success: res.statusCode < 400,
                details: log.details,
            }).catch(err => {
                console.error('[AUDIT] Failed to persist log:', err);
            });

            // Log to console for development
            if (process.env.NODE_ENV !== 'production') {
                console.log('[AUDIT]', {
                    action: log.action,
                    user: log.userEmail || 'Anonymous',
                    resource: log.resource,
                    status: log.statusCode,
                    duration: `${duration}ms`,
                    ip: log.ip
                });
            }
        }

        return originalSend.call(this, data);
    };

    next();
};

// Helper to get human-readable action description
function getActionDescription(method: string, path: string): string {
    if (path.includes('/login')) return 'User Login';
    if (path.includes('/logout')) return 'User Logout';
    if (path.includes('/change-password')) return 'Password Change';
    if (path.includes('/system/seed')) return 'Database Seed';

    if (path.includes('/employees')) {
        if (method === 'POST') return 'Employee Created';
        if (method === 'PUT') return 'Employee Updated';
        if (method === 'DELETE') return 'Employee Deleted';
    }

    if (path.includes('/documents')) {
        if (method === 'POST') return 'Document Uploaded';
        if (method === 'DELETE') return 'Document Deleted';
    }

    if (path.includes('/leave-requests')) {
        if (method === 'POST') return 'Leave Request Created';
        if (method === 'PUT' || method === 'PATCH') return 'Leave Request Updated';
        if (method === 'DELETE') return 'Leave Request Deleted';
    }

    return `${method} ${path}`;
}

// Helper to get resource name from path
function getResourceName(path: string): string {
    if (path.includes('/employees')) return 'Employee';
    if (path.includes('/documents')) return 'Document';
    if (path.includes('/leave-requests')) return 'Leave Request';
    if (path.includes('/auth')) return 'Authentication';
    if (path.includes('/system')) return 'System';
    return 'Unknown';
}

// Helper to sanitize sensitive data from body
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return {};

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'password_hash'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    });

    return sanitized;
}

// Export function to get recent audit logs from memory cache (for quick access)
export function getAuditLogs(limit: number = 100): AuditLog[] {
    return recentLogs.slice(-limit).reverse();
}

// Export function to get audit logs for specific user from memory cache
export function getUserAuditLogs(userId: string, limit: number = 50): AuditLog[] {
    return recentLogs
        .filter(log => log.userId === userId)
        .slice(-limit)
        .reverse();
}

// Export function to get audit logs from database (for comprehensive history)
export async function getAuditLogsFromDb(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resource?: string;
} = {}) {
    return AuditLogService.getAll(options);
}
